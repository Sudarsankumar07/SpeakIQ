# System Design Document: Scalable Speaking Evaluation Platform (SpeakIQ)

This document outlines the architectural limitations, production design, cost optimizations, reliability mechanisms, and backend enhancements for a speaking evaluation platform capable of scaling to **10,000 evaluations per day** and handling spike traffic of **1,000 simultaneous submissions**.

---

## 1. Limitations of Direct Gemini API Usage (Theoretical Analysis)

Directly invoking the Gemini API synchronously for every user speaking response introduces several critical bottlenecks:

*   **API Rate Limits (Quota Exhaustion)**: Google AI Studio's free tier is limited to 15 Requests Per Minute (RPM) and 1,500 Requests Per Day (RPD). A spike of just 20 active users in a single minute will result in immediate `429 Resource Exhausted` errors for subsequent users.
*   **High and Predictable Latency**: Processing speech audio, transcribing, and grading takes **5–15 seconds**. Synchronous requests block the client connection, leading to browser timeout warnings, poor UX, and server thread pool exhaustion.
*   **Cost Scaling**: Audio inputs are token-intensive (~258 tokens/second). Without caps or optimization, high volumes of long or silent recordings cause API bill spikes.
*   **Poor Fault Tolerance & Error Handling**: If a call fails mid-request (network drop, transient Google error, malformed output), the request is lost — no retry queue means the database stays empty and the user just sees a server error.
*   **No Idempotency Protection**: If a client times out and retries the same submission, a synchronous architecture has no way to detect this — the same audio gets billed and evaluated twice.
*   **Scalability Bottlenecks**: Streaming large Base64 files directly through Express memory causes high CPU/RAM usage, risking server crashes under concurrent load.
*   **No Observability**: Without structured logging, tracing, or alerting, failed Gemini calls fail silently — there's no way to know evaluation quality is degrading until users complain.
*   **No Input Validation**: Nothing prevents empty, silent, or non-English audio from being sent to Gemini, wasting tokens on unusable input.

---

## 2. High-Scale Architecture (10,000 Evaluations / Day)

To support 10,000 daily evaluations (avg. 7/minute, peaks of 100+/minute), we separate the upload, auth, processing, and database write layers.

### The Two-Step Processing Flow:
Instead of running transcription and evaluation in a single synchronous pass (which makes frontend word validation impossible), the system operates in two phases:
1. **Transcription Phase**: Audio is sent to the backend, transcribed using `gemini-2.5-flash`, and returned to the client. The client displays the text, allowing the user to make corrections and view the **exact word count** (aiming for the 100-200 word target).
2. **Evaluation Phase**: The client submits the edited transcript and audio. The backend routes the request based on the **exact transcript word count** (routing under 100 words to Gemini 2.5, and 100+ words to Gemini 3.5).

```
+------------------+         1. POST /api/evaluation/transcribe (audio)        +-----------------------------+
|                  | --------------------------------------------------------> |                             |
|                  | <-------------------------------------------------------- |   Express App Service       |
|                  |         2. Return plain text transcript                   |      (Load Balanced)        |
|  React Frontend  |                                                           |                             |
|      Client      |         3. POST /api/evaluation (transcript + audio)      |                             |
|                  | --------------------------------------------------------> |                             |
|                  | <-------------------------------------------------------- |                             |
|                  |         11. Return JSON Evaluation Scores & Report        |                             |
+------------------+                                                           +-----------------------------+
                                                                                   |                ^
                                                                                   | 4. Queue Job   | 9. Retrieve
                                                                                   v                |
                                                                        +--------------------+      |
                                                                        |    Redis Queue     |      |
                                                                        |     (BullMQ)       |      |
                                                                        +--------------------+      |
                                                                                   |                |
                                                                       5. Pull Job |                |
                                                                                   v                |
                                                                        +--------------------+      |
                                                                        |  Worker Instance   | -----+
                                                                        +--------------------+
                                                                           |        ^
                                                           6. Evaluate     |        | 7. Return JSON
                                                           Transcript Text v        |    Assessment
                                                                        +--------------------+
                                                                        | Google Vertex AI   |
                                                                        | (Gemini 3.5 / 2.5) |
                                                                        +--------------------+
                                                                                   |
                                                                                   | 8. Save Evaluation Results
                                                                                   v
                                                                        +--------------------+
                                                                        |    PostgreSQL      |
                                                                        |   (via PgBouncer)  |
                                                                        +--------------------+
```

### Architectural Breakdown

*   **Authentication & Authorization**: Users sign up/log in via Supabase Auth (or custom JWT with access + refresh tokens). Every upload, queue job, and report access is scoped to the authenticated `userId`, so no user can access another user's session data.
*   **How Audio is Received**: The frontend requests a temporary write token (**Pre-signed URL**) from the backend. The browser uploads the raw audio file (`.webm`/`.mp3`) directly to an **Object Storage Bucket** (Supabase Storage / AWS S3), bypassing the Express server entirely and keeping server memory near zero.
*   **How Speech is Converted to Text & AI Evaluates (Two-Step)**:
    1. **STT**: Gemini 2.5 Flash acts as a highly scalable speech-to-text API, converting the audio to text.
    2. **LLM Grading**: The user-validated transcript is sent to Gemini (3.5 or 2.5) for grading. Text-only evaluations are extremely light and consume 90% fewer input tokens than audio evaluations.
*   **How Results are Stored**: The worker writes the final evaluation (JSON scores, verbatim transcript, suggestions) to **PostgreSQL**, fronted by **PgBouncer** to handle connection spikes. Audio binaries are not stored in the DB — only the file URL, with a lifecycle policy to auto-delete after 24 hours.
*   **How the Frontend Receives the Response**: The client polls or listens to a server-sent events (SSE) / WebSocket connection. When the worker finishes, it updates PostgreSQL and emits a completion event to the client.

---

## 3. Cost Optimization Strategies

*   **Prompt Tuning and Constrained Outputs**: Output tokens are the most expensive ($1.50/1M vs. $0.075/1M). Instructing Gemini to give feedback in exactly 2–3 sentences cuts response size by ~50%.
*   **Audio Length Caps**: Cap recordings at **90 seconds** on the frontend to bound input token consumption (audio is billed at ~258 tokens/second).
*   **Context Caching**: For large rubric/instruction prompts (>32k tokens), Gemini's context caching cuts cached input token cost by 50%.
*   **Hybrid Model Routing**: Count the exact words in the user-verified transcript. Route short responses (<100 words) directly to **Gemini 2.5 Flash**, reserving **Gemini 3.5 Flash** for longer, higher-value responses.
*   **Deduplication**: Hash incoming audio files; if a user resubmits an identical clip, serve the cached evaluation instead of re-billing Gemini.

---

## 4. Reliability & High Concurrency (1,000 Simultaneous Submissions)

If 1,000 users submit at the same moment, the system stays stable via:

1.  **Task Queuing (BullMQ + Redis)**: Express validates the payload and enqueues the job, returning `HTTP 202` in under 50ms — no synchronous wait on Gemini, no server timeout.
2.  **Idempotency Keys**: Each submission carries a client-generated idempotency key to reject duplicate retries.
3.  **Worker Rate Limiting & Backoff Retries**: Workers pull from Redis at a rate that respects Google's RPM limits. On a `429`, jobs use exponential backoff retries.
4.  **Dead-Letter Queue (DLQ)**: Failed tasks after fixed retries move to a DLQ for alerts and manual diagnostics.
5.  **Per-User Fair Queuing**: Queue priority is balanced per-user so one user submitting many requests can't starve other users' jobs.
6.  **Horizontal Autoscaling**: Workers run on autoscaling serverless containers (AWS ECS Fargate / GCP Cloud Run), spinning up new instances as queue depth rises.

---

## 5. Backend Engineering Enhancements

*   **Observability**: Structured logging, Prometheus metrics, and error tracking (Sentry) so failures and latency regressions are visible.
*   **Multi-Provider Fallback**: If Gemini has an outage, fail over to an alternate provider (e.g. OpenAI Whisper + GPT) to reduce vendor lock-in.
*   **Audio Quality Preprocessing**: Use `ffmpeg` server-side to normalize volume, compress size, and filter background noise before sending audio to Gemini.
*   **Automated Storage Pruning**: Bucket lifecycle policies delete audio recordings after 24 hours unless explicitly saved, keeping storage costs near zero.
