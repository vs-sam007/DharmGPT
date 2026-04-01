# DharmaGPT — Comprehensive Project Overview

DharmaGPT is a sophisticated, AI-powered philosophical guide that provides life counsel grounded in Indian wisdom traditions (Bhagavad Gita, Mahabharata, Dhammapada, Arthashastra). It uses a multi-persona "Council of Sages" architecture to deliver both text and real-time voice responses.

---

## 🏛 1. Core Architecture: The Seven-Persona System

The system is built around **seven distinct sages**, each representing a unique philosophical archetype. These are defined in a unified registry (`backend/personas/registry.py`).

| Persona | Source Tradition | Domain of Expertise | Voice Style |
| :--- | :--- | :--- | :--- |
| **Krishna** | Bhagavad Gita | Duty, Karma, Devotion | Serene, Authoritative |
| **Bhishma** | Mahabharata | Ethics, Longevity, Vows | Grave, Principled |
| **Yudhisthira** | Mahabharata | Truth, Justice, Dharma | Calm, Deliberative |
| **Arjuna** | Bhagavad Gita | Decision-making, Action | Relatable, Earnest |
| **Draupadi** | Mahabharata | Resilience, Empowerment | Sharp, Dignified |
| **Vidura** | Mahabharata | Humble Wisdom, Policy | Pragmatic, Gentle |
| **Chanakya** | Arthashastra | Finance, Strategy, Power | Calculating, Direct |

---

## 🧠 2. Backend Features & Logic

### 🛤 Persona Classification (`classifier.py`)
- **Hybrid Routing**: Uses a combination of keyword-based weighting and LLM fallback to route a user's dilemma to the most appropriate sage.
- **Async Execution**: Fully non-blocking routing that integrates seamlessly with the FastAPI event loop.

### 📚 RAG (Retrieval Augmented Generation) (`rag/`)
- **ChromaDB Integration**: Each persona has a dedicated vector collection containing thousands of verses.
- **Contextual Retrieval**: Retrieves the *exact* ancient parallel to the user's situation instead of generic AI text.
- **Section 14 Schema**: Strictly enforced response format:
    1.  **Context Analysis**: Paraphrasing the dilemma in the sage's voice (max 30 words).
    2.  **Ancient Parallel**: The specific verse and its citation.
    3.  **Philosophy**: Explaining the universal truth behind the verse (max 40 words).
    4.  **Action**: Concrete, persona-voiced advice for the user.
    5.  **Dharma Score**: A metric (2–9) indicating alignment with traditional ethics.

### 🎙 Real-time Voice Agent (`agent.py`)
- **LiveKit Pipeline**: A low-latency voice-to-voice loop handling VAD, STT, and TTS.
- **Voice Mapping**: Each sage is assigned a unique ElevenLabs or Google voice ID to maintain character consistency.

### ⚡ Performance & Stability
- **Redis Caching**: Frequently asked questions are cached for sub-second responses.
- **Lazy Initialization**: Critical services (LiveKit, Redis) load only when needed, preventing the server from crashing if a component is unavailable.

---

## 🎨 3. Frontend Features & Design

The frontend is a premium React application (`frontend/src/`) designed with a "Modern-Sacred" aesthetic.

### 🏠 Home / Landing Page (`Home.jsx`)
- **Persona Grids**: Focus on exploring the sagely archetypes.
- **Mode Selection**: Toggle between 1-on-1 counsel and the "Sage Mind" Council mode.

### 💬 Chat Interface (`ChatInterface.jsx`)
- **Section 14 Cards**: Responses are rendered as beautiful, animated "Insight Cards."
- **Dharma Meter**: A visual gauge representing the `dharma_score`.
- **Sage Switcher**: Switch personas mid-conversation while retaining context.

### 🔮 Voice UI (`VoiceUI.jsx` / `VoiceOrb.jsx`)
- **Immersive Mode**: A visual "Orb" that reacts dynamically to the sage's voice activity.
- **Zero-Latency Feel**: Real-time animation synced with the voice stream.

---

## 🔄 4. How It Works (The Data Flow)

1.  **User Input**: User submits a dilemma via text or voice.
2.  **Classification**: The backend identifies the core emotional/ethical theme and routes it to the matching sage.
3.  **Retrieval**: ChromaDB retrieves relevant verses from the chosen sage's tradition.
4.  **Generation**: Gemini 1.5 Pro synthesizes the response using the retrieved verse and the sage's prompt.
5.  **Output**:
    - **Text**: The UI renders the 5 fields into discrete cards.
    - **Voice**: The agent streams the wisdom through a low-latency audio channel.

---

## 🛠 5. Technology Stack
- **Languages**: Python (Backend), JavaScript/React (Frontend).
- **Frameworks**: FastAPI, Vite, Tailwind CSS.
- **AI Models**: Google Gemini 1.5 Pro, ElevenLabs Voice, ChromaDB.
- **Infrastructure**: LiveKit (Real-time Video/Audio), Redis (Caching).
