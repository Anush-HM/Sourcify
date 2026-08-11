# Sourcify 🔎

Sourcify is a multi-source Retrieval-Augmented Generation (RAG) platform with a **self-healing retrieval layer**. A user provides links to different types of content on the same topic — an article, a discussion thread, and a video/podcast transcript — and Sourcify lets them chat with all of that content together, getting grounded, cited answers.

Unlike standard RAG, Sourcify automatically detects when its own retrieval was weak or its answer is poorly grounded, and corrects itself — rewriting the query and re-retrieving — before ever showing the user a final response. It also actively flags when sources disagree, instead of silently blending conflicting information into one answer.

---

## ✨ Features

**Ingestion**

- 📥 Multi-source ingestion — pulls content from three source types: articles/Wikipedia (text), discussion threads (Hacker News / Stack Exchange), and YouTube/podcast transcripts
- ✂️ Source-aware chunking — paragraph-based for articles, comment-and-reply-based for discussions, timestamp-and-pause-based for transcripts
- 🛟 Fallback handling — if a source's primary extraction method fails, the system retries once or gracefully skips it with a clear message instead of crashing

**Retrieval & Answering**

- 🧠 Embeddings via `@xenova/transformers`
- 🗂️ Similarity search across all ingested chunks via MongoDB Atlas Vector Search
- 💬 Grounded answers generated only from retrieved content, not the model's general knowledge
- ⚡ Streaming responses token-by-token via Server-Sent Events (SSE)

**Self-Healing Retrieval (Corrective RAG)**

- 🩺 A second LLM call grades every draft answer for how well it's supported by the retrieved chunks (SUPPORTED / WEAK / UNSUPPORTED)
- 🔁 On a weak or unsupported verdict, the system automatically rewrites the query and re-retrieves, or expands retrieval to source types not yet searched — capped at 2 attempts
- 📋 A visible healing log shows exactly what happened on each attempt — what query was tried, what the grader said, what changed on retry
- 🙅 If healing still fails after all retries, Sourcify honestly says it couldn't find a well-supported answer, rather than returning a weak or hallucinated one

**Output Features**

- 📝 Report Generation — synthesizes multi-source content into one cited, standalone summary
- ⚠️ Contradiction Detection — identifies and flags conflicting information across sources instead of silently merging it

**Trust & Citations**

- 🔗 Precise, source-specific citations — a timestamp for video/audio, the specific comment for a discussion thread, the paragraph for an article
- 📊 Grounding confidence score shown alongside every answer, computed from the critique step

**Reliability**

- 🔀 AI provider failover — if the primary provider (Gemini) hits a rate limit or downtime, the system automatically switches to Groq mid-session via LangChain.js's `RunnableWithFallbacks`, preserving conversation state
- 💾 Session persistence — ingested sources and conversation history are stored in MongoDB, so a session survives a refresh

---

## 🛠️ Tech Stack

| Layer              | Technologies                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Frontend           | React                                                                                        |
| Backend            | Node.js, Express.js                                                                          |
| Vector database    | MongoDB Atlas Vector Search                                                                  |
| Embeddings         | `@xenova/transformers`                                                                       |
| RAG orchestration  | LangChain.js (`RecursiveCharacterTextSplitter`, `RetrievalQAChain`, `RunnableWithFallbacks`) |
| Self-healing logic | Custom critique-and-retry loop (LangChain.js chains)                                         |
| LLM providers      | Gemini primary, Groq as fallback                                                             |
| Streaming          | Server-Sent Events (SSE)                                                                     |
| Content extraction | Cheerio (articles), public APIs (Hacker News/Stack Exchange), `yt-dlp` (YouTube transcripts) |

---

## 📁 Project Structure

```
Sourcify/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   ├── ingestion/            # article, thread, and transcript pipelines
│   ├── rag/                  # retrieval, grading, and healing loop logic
│   ├── models/
│   ├── routes/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   ├── public/
│   └── package.json
│
└── package.json
```

---

## 🔄 How It Works

**Ingestion Flow**

1. User pastes up to 3 source links — an article/Wikipedia page, a discussion thread, and a YouTube/podcast link
2. Each source runs through its own extraction + chunking pipeline
3. Chunks are embedded locally and stored in MongoDB Atlas Vector Search, tagged with source type and metadata (URL, timestamp/comment-id/paragraph-index)

**Chat & Self-Healing Flow**

1. User asks a question
2. Similarity search retrieves the top-k most relevant chunks across all ingested sources
3. A draft answer is generated, grounded only in those chunks
4. A grader LLM call checks whether the draft is genuinely supported by the evidence
5. If the verdict is WEAK or UNSUPPORTED, the query is rewritten and/or retrieval is expanded to unused source types, then the draft is regenerated — up to 2 retries
6. The healing log and grounding confidence score are attached to the final answer
7. The answer streams to the user token-by-token, with precise citations back to the original source

**Output Feature Flow**

- **Report Generation** — on request, synthesizes everything retrieved across the session into one cited summary document
- **Contradiction Detection** — cross-checks claims across source types and flags where sources disagree, rather than blending conflicting claims into a single answer

---

## 🚀 Setup

**1. Clone the repository**

```bash
git clone https://github.com/Anush-HM/Sourcify.git
cd Sourcify
```

**2. Install dependencies**

```bash
cd backend
npm install
cd ../frontend
npm install
cd ..
```

**3. Set up environment variables**

Create a `.env` file inside `backend/`:

```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

**4. Run the project**

In one terminal:

```bash
cd backend
npm run dev
```

In another terminal:

```bash
cd frontend
npm run dev
```

Backend runs on `http://localhost:5000`, React frontend runs on its dev server (e.g., `http://localhost:5173` if using Vite).

---

## 💡 API Overview

All routes are prefixed with `/api`.

### 📥 Ingestion

```http
POST /ingest/article     # Ingest an article or Wikipedia page
POST /ingest/thread       # Ingest a Hacker News / Stack Exchange thread
POST /ingest/transcript   # Ingest a YouTube/podcast transcript
GET  /ingest/status        # Check ingestion progress per source
```

### 💬 Chat

```http
POST /chat/ask         # Ask a question, triggers retrieval + self-healing loop
GET  /chat/stream        # SSE stream of the final, healed answer
GET  /chat/history       # Get session's conversation history
```

### 📝 Report

```http
POST /report/generate   # Generate a cited summary report from the session
```

### ⚠️ Contradictions

```http
GET  /contradictions/check   # Run contradiction detection across ingested sources
```

### 🗂️ Session

```http
POST /session/create   # Start a new ingestion session
GET  /session/:id        # Resume a session's sources and history
```

---

## 🩺 Grounding Verdicts

| Verdict         | Meaning                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------- |
| **SUPPORTED**   | Draft answer is well-supported by retrieved chunks — returned as-is                                |
| **WEAK**        | Partial support — triggers query rewrite and/or expanded retrieval                                 |
| **UNSUPPORTED** | No real support found — triggers retry, or an honest "not found" response if retries are exhausted |

Each verdict is paired with a grounding confidence score and a reason string, both surfaced to the user via the healing log.
