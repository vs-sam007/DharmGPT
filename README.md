# 🕉️ DharmaGPT — AI-Powered Philosophical Guide & Sage Counsel

DharmaGPT is a highly sophisticated, AI-powered philosophical guide that provides life counsel grounded in Indian wisdom traditions (*Bhagavad Gita*, *Mahabharata*, *Chanakya Neeti*, and *Vidura Niti*). 

Built around a premium **"Modern-Sacred"** aesthetic, the application features a multi-persona **"Council of Sages"** architecture. Users can consult distinct philosophical archetypes through a structured, card-based chat interface or engage in ultra-low latency, real-time voice conversations powered by a cutting-edge real-time agent pipeline.

---

## 🏛️ Core Architecture: The Council of Sages

DharmaGPT routes user dilemmas to distinct sagely personas. Each sage represents a unique philosophical school, trained on specific traditional texts and tuned with a customized, distinct voice profile.

| Sage Persona | Source Tradition | Domain of Expertise | Tone & Speech Style | Accent Theme | Gemini Live Voice |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Lord Krishna** | *Bhagavad Gita* | Duty, Karma, Devotion, Love | Serene, warm, authoritative, metaphorical | Sky Blue (`#85adff`) | `Puck` (Gentle & Calm) |
| **Acharya Chanakya** | *Chanakya Neeti* / *Arthashastra* | Strategy, Politics, Finance, Ethics | Calculating, highly direct, pragmatic | Crimson Red (`#ff4d4d`) | `Kore` (Deep & Direct) |
| **Rani Laxmi Bai** | Declaration of Jhansi | Courage, Leadership, Resilience | Dignified, sharp, fiercely empowering | Saffron Gold (`#ffb74d`) | `Aoede` (Earnest & Strong) |

---

## 🚀 Key Technical Features

### 1. Hybrid RAG System (Retrieval-Augmented Generation)
* **Custom Vector Store**: Dedicated collections inside ChromaDB organize verses and passages for each sage persona.
* **Authentic Source Corpora**: The dataset includes:
  - Swami Narasingha's English translation of the *Bhagavad Gita* alongside detailed Hindi commentary.
  - Semantic extracts from the *Mahabharata* (focusing on dialogues such as *Udyoga Parva*).
  - Pure translation files for *Chanakya Neeti* and *Vidura Niti*.
* **Thematic Retrieval**: Combines semantic query embeddings and custom keyword themes (`karma`, `dharma`, `moksha`, `duty`, `ego`) to find the exact ancient parallel to the user's modern-day struggle.

### 2. The Strict "Section 14" Response Schema
In text-chat mode, responses are generated using a strict format parsed directly in the UI as beautiful, animated cards:
1. **Context Analysis**: A concise, 30-word synthesis of the dilemma, written in the active Sage's authentic voice.
2. **Ancient Parallel**: The specific verse citation, original Sanskrit shloka, and translation.
3. **Philosophy**: Explaining the universal, eternal truth behind the text (max 40 words).
4. **Action**: Pragmatic, concrete, persona-voiced advice on how the user should act.
5. **Dharma Score**: A numerical rating (scale 2–9) evaluating the alignment of the user's path with traditional ethics, visually represented via a live **Dharma Meter**.

### 3. Dual-Channel Voice Stack
To support both ultra-compatible web streams and hyper-immersive voice agents, DharmaGPT implements two concurrent systems:
* **WebSocket Voice Engine (Local Stack)**: A client-server connection over standard WebSockets. Audio captured via browser `MediaRecorder` is transcribed using **Groq Whisper** (`whisper-large-v3-turbo`), routed to **Groq Llama 3.3 70B** (`llama-3.3-70b-versatile`), and streamed back chunk-by-chunk using a low-latency **Edge-TTS** voice generation loop.
* **LiveKit Real-Time Agent Stack (Immersive Stack)**: Connects the user to a LiveKit WebRTC room, spawning a dedicated backend agent script (`backend/agent.py`). 
  - The agent opens a bidirectional session with **Gemini 3.1 Flash Live Preview** (`gemini-3.1-flash-live-preview`).
  - **Voice Activity Detection (VAD)** runs in real-time, allowing users to interrupt the Sage mid-sentence.
  - **Tool-Call Retrieval**: When Gemini needs a backing scripture, it fires a `search_dharmic_verse` function call. The agent dynamically queries ChromaDB and returns the verse to the model's active context within milliseconds.

### 4. Performance & Stability Optimization
* **Redis Caching**: Highly frequent queries and duplicate dilemmas bypass LLM pipelines, returning sub-second cached responses.
* **Lazy Service Loading**: External services (Redis, LiveKit, ChromaDB) load lazily. The backend server remains fully stable and boots gracefully even if certain third-party integrations are offline.

---

## 🎨 UI Design System: "Modern-Sacred"
The frontend uses React 19, Vite, and Tailwind CSS v4 to deliver an elegant, premium look:
* **Atmospheric Nebula Backdrops**: A flowing backdrop with radial gradients (`--mode-bg-gradient`) that transitions automatically when a user switches personas (Krishna blue, Chanakya red, Laxmi gold).
* **Recessed 3D Audio Orb**: A gorgeous visual element inside the Voice UI that breathes, rotates, and pulses in response to real-time voice streaming and speaking states.
* **No-Line Tonal Layering**: Establishes clean visual hierarchies using varied surface depths and heavy background blurs (`backdrop-filter: blur(40px)`) instead of stark, boxy borders.

---

## 📂 Repository Structure

```tree
DharmGPT/
├── backend/
│   ├── data/                 # Raw texts, PDFs (Gita, Mahabharata, etc.)
│   ├── personas/             # Persona registry and voice mapping config
│   ├── prompts/              # Detailed system instruction md files per sage
│   ├── rag/                  # ChromaDB client, parsers, retrievers, & database seeding scripts
│   ├── services/             # Redis caching layer and local Edge-TTS voice engine
│   ├── agent.py              # LiveKit RTC Agent loop & Gemini Live session pipeline
│   ├── classifier.py         # Dilemma router (keyword + LLM hybrid)
│   ├── groq_client.py        # Groq (Llama 3.3 & Whisper) API calls and chat streaming
│   ├── main.py               # FastAPI entrypoint (endpoints: /ask, /chat/stream, /ws/voice)
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # UI (ChatInterface, VoiceOrb, DharmaScoreCard, etc.)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Client utility setups
│   │   ├── App.jsx           # Root layout and theme wrapper
│   │   ├── index.css         # Styling system & Tailwind v4 theme variables
│   │   └── main.jsx          # Vite React mounting
│   ├── package.json          # Node dependencies and scripts
│   └── vite.config.js        # Vite configurations
└── .env.example              # Core environment configuration template
```

---

## 🛠️ Local Setup & Installation

### Prerequisites
* **Python**: `3.10` or higher
* **Node.js**: `18.x` or higher
* **Redis Server**: Installed and running locally
* **LiveKit Server** *(Optional, required for the LiveKit WebRTC Real-time Voice stack only)*: A LiveKit Cloud account or a locally running LiveKit instance.

---

### 1. Backend Setup

1. **Navigate to the backend directory and create a virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   ```

2. **Activate the virtual environment**:
   * **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

3. **Install the dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the **root** folder (or inside `/backend` as fallback) using the template below:
   ```env
   # API Keys
   GEMINI_API_KEY=your_gemini_api_key
   GROQ_API_KEY=your_groq_api_key

   # Redis Configuration
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # LiveKit WebRTC Stack (Optional)
   LIVEKIT_URL=wss://your-livekit-project.livekit.cloud
   LIVEKIT_API_KEY=your-api-key
   LIVEKIT_API_SECRET=your-api-secret
   MAX_SESSION_MINUTES=15
   ```

5. **Seed the Vector Database**:
   Populate ChromaDB collections with the ancient scriptures and datasets:
   ```bash
   python rag/populate_db.py
   ```
   *(This deletes any old `dharma_` collections and ingests Bhagavad Gita, Mahabharata extracts, Chanakya Neeti, and Laxmibai text assets).*

---

### 2. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install Node packages**:
   ```bash
   npm install
   ```

---

## 🏃 Run the Application

To experience the full features of DharmaGPT, run the backend, live agent worker (optional), and frontend dev servers.

### Step 1: Start Redis
Ensure your local Redis server is active:
```bash
# On Linux/macOS
redis-server

# On Windows (WSL / Docker / native)
# Ensure the service is active on localhost:6379
```

### Step 2: Start the FastAPI Backend
From the active virtual environment in the `backend` folder, start the API server:
```bash
uvicorn main:app --reload --port 8000
```
This boots up the `/ask` HTTP endpoint, the `/chat/stream` SSE server, and the `/ws/voice/{persona}` local voice websocket.

### Step 3: Start the LiveKit Agent Worker *(Optional)*
If you are running the LiveKit immersive voice stack, start the LiveKit python worker:
```bash
python agent.py dev
```

### Step 4: Start the Vite Dev Server
From the `frontend` folder, start the React server:
```bash
npm run dev
```
Open your browser and navigate to the local URL (usually `http://localhost:5173`).

---

## ⚡ API Surface Summary

DharmaGPT features clean, modular routes on the FastAPI backend:
* **`GET /health`**: Fast health check confirming sacred backend parameters are active.
* **`POST /ask`**: Takes a user's dilemma query, runs ChromaDB RAG, generates a response, caches it on Redis, and returns the strict "Section 14" structured JSON response.
* **`GET /chat/stream`**: SSE (Server-Sent Events) endpoint streaming text characters in real-time.
* **`WS /ws/voice/{persona}`**: Bidirectional WebSocket connection. Receives raw audio packets or fallback text from the browser, runs real-time Whisper transcription, routes through the Llama 3.3 stream pipeline, compiles segments through Edge-TTS, and streams back playable audio packets.

---

## 🛡️ License & Credit
* **Ancient Sources**: Bhagavad Gita translations, Mahabharata translations, Chanakya Neeti translations.
* **AI Orchestration**: Built using Google Gemini (Live API), Groq Cloud (Llama 3.3 + Whisper), LiveKit WebRTC, and ChromaDB.

*May your path align with Dharma.* 🕉️
