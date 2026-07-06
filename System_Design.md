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

```
+------------------+   1. Login/Signup (JWT)   +-----------------------------+
|  React Frontend  | ------------------------->|   Express App Service       |
|      Client      |<--------------------------|   (Load Balanced, Auth)     |
+------------------+   2. Access + Refresh Tkn +-----------------------------+
    |         ^                                     |                  ^
    | 3. Request Signed URL (userId scoped)          | 5. Validate +    |
    | 4. Return Signed URL                           |    Enqueue Job   | 10. Emit
    |                                                 v                  | (userId channel)
    v                                        +--------------------+       |
+------------------+  6. Pull Job            |    Redis Queue     |       |
|  Storage Bucket  |<------------------------|     (BullMQ)       |       |
| (Supabase/S3)     |----------------------->|  + Dead Letter Q   |       |
+------------------+  7. Stream Audio URL    +--------------------+       |
                                                  |        ^               |
                                8. Send URI       |        | 9. Verbatim   |
                                & Prompt          v        |   JSON        |
                                        +------------------+               |
                                        | Google Vertex AI |                |
                                        |   (Gemini 3.5)   |                |
                                        +------------------+                |
                                                  |                          |
                                                  v                          |
                                        +------------------+                |
                                        |   PostgreSQL      |----------------+
                                        |  (via PgBouncer)  |  Supabase Realtime
                                        +------------------+  channel (per userId)
```

### Architectural Breakdown

*   **Authentication & Authorization**: Users sign up/log in via Supabase Auth (or custom JWT with access + refresh tokens). Every presigned upload URL, queue job, and Realtime channel is scoped to the authenticated `userId`, so no user can access another user's job status or audio.
*   **How Audio is Received**: The frontend requests a temporary write token (**Pre-signed URL**) from the backend. The browser uploads the raw audio file (`.webm`/`.mp3`) directly to an **Object Storage Bucket** (Supabase Storage / AWS S3), bypassing the Express server entirely and keeping server memory near zero. A backend validation step checks file type, size, and duration before a job is queued.
*   **How Speech is Converted to Text & AI Evaluates**: Gemini's native **multimodal audio-to-text** capability via **Google Vertex AI** transcribes the audio verbatim and evaluates grammar, vocabulary, fluency, and overall score in a **single pass**, returning structured JSON. This removes the cost and latency of a separate STT step.
*   **How Results are Stored**: The worker writes the final evaluation (JSON scores, verbatim transcript, suggestions) to **PostgreSQL**, fronted by **PgBouncer** to handle connection spikes. Audio binaries are not stored in the DB — only the file URL, with a lifecycle policy to auto-delete after 24 hours.
*   **How the Frontend Receives the Response**: The backend immediately returns a `jobId` (`HTTP 202 Accepted`). The client subscribes to a **Supabase Realtime channel** keyed to `userId:jobId`. Once the worker finishes, it writes to Postgres, which triggers a Realtime event pushed straight to the client — no need to manage raw WebSocket server state or a pub/sub adapter across multiple Express instances.

---

## 3. Cost Optimization Strategies

*   **Prompt Tuning and Constrained Outputs**: Output tokens are the most expensive ($1.50/1M vs. $0.075/1M). Instructing Gemini to give feedback in exactly 2–3 sentences cuts response size by ~50%.
*   **Audio Length Caps**: Cap recordings at **90 seconds** on the frontend to bound input token consumption (audio is billed at ~258 tokens/second).
*   **Context Caching**: For large rubric/instruction prompts (>32k tokens), Gemini's context caching cuts cached input token cost by 50%.
*   **Hybrid Model Routing**: Estimate speech length client-side; route short responses (<45 seconds) to **Gemini 2.5 Flash**, reserving **Gemini 3.5 Flash** for longer, higher-value responses.
*   **Deduplication**: Hash incoming audio files; if a user resubmits an identical clip (e.g. due to a client retry), serve the cached evaluation instead of re-billing Gemini.
*   **Tiered Model Access**: Free-tier users route only to Gemini 2.5; paid users get 3.5 access — extending the existing duration-based routing logic to subscription tiers.

---

## 4. Reliability & High Concurrency (1,000 Simultaneous Submissions)

If 1,000 users submit at the same moment, the system stays stable via:

1.  **Task Queuing (BullMQ + Redis)**: Express validates the payload and enqueues the job, returning `HTTP 202` in under 50ms — no synchronous wait on Gemini, no server timeout.
2.  **Idempotency Keys**: Each submission carries a client-generated idempotency key. If the same key is submitted twice (e.g. a client-side retry), the queue recognizes and discards the duplicate instead of creating a second job.
3.  **Worker Rate Limiting & Backoff Retries**: Workers pull from Redis at a rate that respects Google's RPM limits. On a `429`, jobs use exponential backoff retries rather than dropping data.
4.  **Dead-Letter Queue (DLQ)**: After a fixed number of failed retries, a job moves to a DLQ instead of disappearing. This triggers an alert for manual review rather than silently losing a user's submission.
5.  **Circuit Breaker**: If Gemini is fully unavailable, the system trips a circuit breaker and fails fast (returning a "try again shortly" status) instead of retrying all 1,000 jobs into a wall of errors.
6.  **Per-User Fair Queuing**: Queue priority is balanced per-user so one user submitting many requests can't starve everyone else's jobs.
7.  **Horizontal Autoscaling**: Workers and Express servers run on autoscaling serverless containers (AWS ECS Fargate / GCP Cloud Run), spinning up new instances as CPU/queue depth rises.

---

## 5. Backend Engineering Enhancements

Beyond the base implementation, a production-ready backend would add:

*   **Authentication & Authorization**: JWT-based or Supabase Auth login/signup, with all resources (audio, job status, evaluation history) scoped per user.
*   **Observability**: Structured logging, metrics (Prometheus/Grafana), and error tracking (Sentry) so failures and latency regressions are visible before users report them.
*   **Multi-Provider Fallback**: If Gemini has an outage, fail over to an alternate provider (e.g. OpenAI Whisper + GPT) for transcription/grading to reduce vendor lock-in.
*   **Audio Quality Preprocessing**: Use `ffmpeg` server-side to normalize volume, compress size, and filter background noise before sending audio to Gemini, improving transcription accuracy.
*   **Vector Search for Topic Generation**: Embed past evaluations in a vector store (e.g. PgVector) to recommend personalized speaking tracks based on a user's weakest subscores.
*   **Semantic Text Matching**: Compare the verbatim transcript against the original topic via embedding distance to add an "Adherence to Topic" subscore.
*   **Automated Storage Pruning**: Bucket lifecycle policies delete audio recordings after 24 hours unless explicitly saved, keeping storage costs near zero.
*   **Load Testing**: Validate the "10k/day, 1k concurrent" target with tools like k6 or Artillery before relying on the design in production.
