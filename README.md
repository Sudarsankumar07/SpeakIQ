# SpeakIQ: AI-Powered English Speaking Evaluation Platform

SpeakIQ is a prototype application designed to help users evaluate and improve their spoken English. Users select categorization topic tracks (General, Business, IELTS Prep) or input custom prompts, record their voice response, verify and edit their verbatim transcription, and receive detailed AI grading.

---

## 🛠️ Current Architecture

The application is built using a modern decoupled client-server architecture:

```
+------------------------------------+
|          React Client              |
|   (Vite + Tailwind CSS on Vercel)  |
+------------------------------------+
        |                    ^
        | 1. Upload Audio    | 2. Return Transcript Text
        | 3. Submit Text     | 4. Return Final Evaluation Report
        v                    |
+------------------------------------+
|          Express Backend           |
|      (TypeScript on Render)        |
+------------------------------------+
     |                           |
     | PostgreSQL Query          | Multimodal API Request
     v                           v
+--------------------+   +------------------------------------+
|    Supabase DB     |   |          Google Gemini API         |
| (Transaction Pool) |   | (3.5-flash Primary / 2.5 Fallback) |
+--------------------+   +------------------------------------+
```

### 1. Frontend (React Single Page Application)
*   **Audio Capture**: Uses the browser's native `MediaRecorder` API to capture compressed high-fidelity audio chunks (`audio/webm;codecs=opus`).
*   **Target Timer Visuals**: Displays recording duration with helper badges recommending speaking for 45 to 90 seconds (the proxy length for 100–200 words).
*   **Verbatim Edit Box**: Displays the AI-generated transcript immediately after recording stops. Users can review the transcript, fix misheard words, and see their **exact word count** calculate live (aiming for the green 100–200 word target).
*   **Model Quota Meters**: Displays live indicators of remaining Gemini 3.5 evaluations in the current hour.

### 2. Backend (Node.js & Express API)
*   **Body Limits**: Configured with a `10mb` payload limit to support base64 audio uploading.
*   **Intelligent Routing & Quota Middleware**:
    *   **Gemini 3.5 Quota**: Users get 3 Gemini 3.5 evaluations per hour.
    *   **Auto-Fallback**: If the Gemini 3.5 quota is exhausted, subsequent evaluations automatically route to **Gemini 2.5** (unlimited) without blocking the user.
    *   **Exact Word Count Routing**: Since the client submits the verified transcript text, the rate-limiter routes short responses (under 100 words) directly to Gemini 2.5, saving premium Gemini 3.5 credits for qualified, full responses.

### 3. AI Layer (Gemini Two-Step Flow)
*   **Step 1: Transcription**: When recording stops, the audio is sent to `POST /api/evaluation/transcribe`. Gemini 2.5 Flash transcribes the voice verbatim and returns the plain text.
*   **Step 2: Text Evaluation**: The finalized transcript text is sent to `POST /api/evaluation`. Gemini evaluates Grammar, Vocabulary, and Fluency, and returns a detailed JSON report. Text-only evaluations consume 90% fewer tokens, reducing costs and response latency.
*   **Model Failover**: If the primary model (`gemini-3.5-flash`) hits an unexpected Google API rate limit, the service automatically fails over to `gemini-2.5-flash` on the fly.

### 4. Database & Storage Cleanup (Supabase PostgreSQL)
*   Evaluations are stored in a PostgreSQL database using the **Supabase Connection Pooler (port 6543)** in Transaction Mode to resolve IPv6 routing limitations on Render.
*   **Temporary Audio Storage**: Raw base64 audio is saved temporarily to allow playback review on the report screen.
*   **Auto-Cleanup**: When the user exits or unmounts the report screen, the client dispatches a `DELETE /api/evaluation/:id/audio` request, immediately nullifying the database column (`audio_data = NULL`) to keep database storage free.

---

## 🚀 Environment Configuration

### Backend Environment Variables (`server/.env`)
```env
PORT=5000
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend Environment Variables (`client/.env`)
```env
VITE_API_URL=https://speakiq.onrender.com/api
```

---

## 💻 Local Setup & Deployment

### 1. Database Setup
Ensure the Postgres migrations are run to provision the schema:
```bash
cd server
npm run db:setup
```

### 2. Run Locally
Start both backend and frontend development servers:
```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend
cd client
npm run dev
```

### 3. Deployed URLs
*   **Backend Hosting**: Hosted as a Web Service on **Render** (e.g. `https://speakiq.onrender.com`).
*   **Frontend Hosting**: Hosted as an SPA on **Vercel** with rewrite rules in `vercel.json` to handle client-side React Router paths.