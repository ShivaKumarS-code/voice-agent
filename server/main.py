from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.chat import router as chat_router
from app.routes.voice import router as voice_router
from app.routes.simli import router as simli_router
from app.routes.auth import router as auth_router

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
        # A hosted Postgres closes connections that sit idle. Without a check
        # the pool hands the dead socket to the next request, which surfaces as
        # "SSL connection has been closed unexpectedly" mid-query. This probes
        # the connection first and replaces it if it is gone.
        check=ConnectionPool.check_connection,
        # Recycle connections before the server has a chance to reap them.
        max_lifetime=30 * 60,
        max_idle=5 * 60,
        kwargs={
            "autocommit": True,
            # Keepalives stop the socket going quiet long enough for the
            # database or a NAT hop in between to drop it.
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 3,
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
app.include_router(voice_router)
app.include_router(simli_router)
app.include_router(auth_router)



@app.get("/api/health")
def health_check():
    return {"status": "ok"}


