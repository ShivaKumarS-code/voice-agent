# TechMart Voice Agent

A voice-first customer support agent for a fictional electronics retailer.
A customer talks to it in the browser and it answers out loud through a
lip-synced avatar, while doing real work on their account — reading orders,
managing a cart, raising returns and refunds, and placing orders behind a
confirmation prompt.

A turn is: microphone → Deepgram transcription → LangGraph agent on Google Gemini (`gemini-3.5-flash-lite`) →
ElevenLabs speech → Simli avatar. The same agent is reachable as plain text
chat over the same conversation thread, so a customer can start by typing and
finish by talking.

## Features

- Streaming speech in and out, with a lip-synced avatar
- 15 tools covering the catalogue, cart, checkout, orders, returns, refunds and
  a FAQ knowledge base
- Checkout pauses for explicit customer approval before an order is created
- One conversation thread shared between the voice socket and text chat,
  persisted in Postgres
- Long conversations are summarized down rather than replayed in full
- Every tool is scoped to the signed-in customer by the server, not by the prompt

## Tech stack

**Server** — FastAPI, LangGraph, Google Gemini (`gemini-3.5-flash-lite`) via
`langchain-google-genai`, Deepgram (`flux-general-en`) for STT, ElevenLabs
(`eleven_flash_v2_5`) for TTS, Simli for the avatar, Postgres via SQLModel
(business data plus graph checkpoints), Pinecone + `gemini-embedding-001` for
retrieval, PyJWT auth, optional LangSmith tracing.

**Client** — React 19, TypeScript, Vite, Tailwind CSS v4, `simli-client`.

## Project structure

```
client/
  src/
    App.tsx           dashboard shell: header, cart, avatar stage, chat
    components/       avatar stage, chat panel, cart drawer, order dialog, auth
    hooks/            useVoiceAgent (socket, mic, playback), useSimliAvatar
    lib/              config, auth, audio, formatting, types

server/
  main.py             FastAPI app, connection pool, checkpointer, routers
  create_tables.py    schema bootstrap
  knowledge_base/     8 markdown FAQ documents
  app/
    config.py         environment configuration
    agent/            graph.py (state, prompts, nodes) and helpers.py
    auth/             password hashing, JWT, HTTP + websocket dependencies
    db/               engine, session, SQLModel models, enums
    rag/              loader, embeddings, Pinecone store, retriever, index build
    routes/           auth, chat, voice, cart, simli
    services/         speech_to_text.py, text_to_speech.py
    tools/            the 15 agent tools
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- A Postgres database
- API keys: Google AI (for both Gemini LLM and embeddings), Deepgram, ElevenLabs,
  Pinecone. Simli and LangSmith are optional.

## Setup

### Server

```bash
cd server
python -m venv venv
venv\Scripts\Activate.ps1        # Windows PowerShell (source venv/bin/activate elsewhere)
pip install -r requirements.txt
```

Copy `server/.env.example` to `server/.env` and fill it in, then
create the schema and build the knowledge base index. Run both from `server/`:

```bash
python create_tables.py
python -m app.rag.index
```

`create_tables.py` is safe to re-run and drops nothing. One thing to know on a
first run: no products are seeded, so insert a catalogue into `products` before
the cart and checkout tools have anything to sell.

### Client

```bash
cd client
npm install
```

`client/.env` is optional — copy `client/.env.example` if you need to point the
app at a server that is not on `localhost:8000`.

## Running it

Two terminals:

```bash
# server/
uvicorn main:app --reload --port 8000
```

```bash
# client/
npm run dev
```

Open the Vite URL, register an account, then either type in the chat panel or
press the call button and talk. Registration links a `Customer` record to the
new `User`, which is what the cart and order tools act on.

Interactive API docs are at `/docs`, health check at `/api/health`.

## API

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/auth/register` | Creates a user and links a customer record |
| `POST` | `/auth/login` | Email + password, returns a bearer token |
| `GET` | `/auth/me` | Current user |
| `POST` | `/chat/` | One text turn: `{"message": "..."}`, or `{"approved": true\|false}` to answer a pending confirmation |
| `GET` | `/cart/` | Current cart |
| `GET` | `/simli/config` | Whether an avatar is configured |
| `POST` | `/simli/token` | Short-lived Simli session token for the browser |
| `WS` | `/ws/stt?token=...` | Voice channel: PCM16 audio up; transcripts, replies, confirmations and audio down |

Everything except `/auth/register`, `/auth/login` and `/simli/config` requires a
bearer token.

## The agent

Fifteen tools, all acting only on the signed-in customer:

- **Catalogue** — `get_all_products`, `search_products`
- **Cart** — `get_cart`, `add_to_cart`, `update_cart_item`, `remove_from_cart`,
  `clear_cart`
- **Checkout** — `place_order`
- **Orders** — `search_orders`, `get_order`, `cancel_order`, `request_return`,
  `request_replacement`, `process_refund`
- **Knowledge** — `search_knowledge_base`

## Knowledge base

`server/knowledge_base/` holds eight markdown documents covering accounts,
company info, orders and cancellation, payments, returns and refunds, service
appointments, shipping, and warranties. Each is split on `##` headings, so one
heading is a question and the prose beneath it is the answer. Re-run
`python -m app.rag.index` from `server/` after editing any of them.
