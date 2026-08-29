from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.router.chat import router as chat_router
from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver
from app.config import settings
from app.agent.graph import builder
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = ConnectionPool(
        conninfo=settings.DB_URI,
        min_size=1,
        max_size=10,
        kwargs={
            "autocommit": True,
        },
    )

    checkpointer = PostgresSaver(pool)
    checkpointer.setup()

    app.state.graph = builder.compile(
        checkpointer=checkpointer
    )

    yield
    pool.close()


app = FastAPI(title="Voice Agent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


