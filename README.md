# SpeakIQ: AI-Powered English Speaking Evaluation Platform

SpeakIQ is a prototype application designed to help users evaluate and improve their spoken English. Users can choose from categorized topic tracks (General, Business, IELTS Prep) or input custom prompts, record their voice response, and receive detailed AI feedback.

---

## 🛠️ Current Architecture

The application is built using a modern decoupled client-server architecture:

```
+------------------------------------+
|          React Client              |
|   (Vite + Tailwind CSS on Vercel)  |
+------------------------------------+
                  |
                  | HTTP Requests
                  v
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
*   **Technologies**: React, TypeScript, Vite, Tailwind CSS, Lucide icons, Framer Motion.
*   **Audio Capture**: Uses the browser's native `MediaRecorder` API to capture compressed high-fidelity audio chunks (`audio/webm;codecs=opus`).
*   **Voice Control Panel**: Supports pause/resume recording, duration timers, and a play/pause review player to preview the recording before submitting.
*   **Rate Limit display**: Live meters tracking remaining hourly evaluations.

### 2. Backend (Node.js & Express API)
*   **Technologies**: Node.js, Express, TypeScript, PG (PostgreSQL client).
*   **Body Limits**: Configured with a `10mb` payload limit to support base64 audio uploading.
*   **Intelligent Routing & Quota Middleware**:
    *   **Gemini 3.5 Quota**: Users get 3 Gemini 3.5 evaluations per hour.
    *   **Auto-Fallback**: If the Gemini 3.5 quota is exhausted, subsequent evaluations automatically route to **Gemini 2.5** (unlimited) without blocking the user.
    *   **Duration Routing**: Recording durations under 45 seconds (estimated to be less than 100 words) route directly to Gemini 2.5 to conserve premium tokens.

### 3. AI Layer (Gemini Multimodal Audio Analysis)
*   Instead of converting speech-to-text in the browser (which cut off after periods of silence), the backend feeds the raw base64 audio bytes directly to the Gemini API (`generateContent` with `inlineData`).
*   **Single-Pass Processing**: Gemini transcribes the audio verbatim *and* grades the response (Grammar, Vocabulary, Fluency, suggestions) in a single request, cutting latency and API costs in half.
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