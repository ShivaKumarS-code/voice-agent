import os
from dotenv import load_dotenv

load_dotenv()

# Shipped in the source, so it is public. Kept as the default only so a local
# checkout runs without configuration; refused outright in production below.
DEV_JWT_SECRET = "dev-secret-key-change-in-production-1234567890"

DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def _split_origins(raw: str) -> list[str]:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


class Config:
    # development | production. Only gates the startup checks at the bottom of
    # this module; nothing else branches on it.
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    INDEX_NAME = os.getenv("INDEX_NAME")
    DB_URI = os.getenv("DATABASE_URL")
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
    SIMLI_API_KEY = os.getenv("SIMLI_API_KEY")
    SIMLI_FACE_ID = os.getenv("SIMLI_FACE_ID")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", DEV_JWT_SECRET)
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Comma-separated browser origins allowed to call the API. A wildcard is
    # not an option here: every authenticated request carries an Authorization
    # header, and browsers reject "*" on a credentialed request, so listing the
    # real origins is what actually makes CORS work rather than just tightening
    # it. Defaults to the Vite dev server.
    ALLOWED_ORIGINS = _split_origins(
        os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    )

    # LangSmith tracing
    LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY")
    LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", "voice-agent")
    LANGSMITH_ENDPOINT = os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    # Tracing needs an API key, so it stays off without one. Enabled without a
    # key, every run would attempt an upload and log the failure on each turn.
    LANGSMITH_TRACING = bool(LANGSMITH_API_KEY) and os.getenv(
        "LANGSMITH_TRACING", "true"
    ).strip().lower() in {"1", "true", "yes", "on"}

settings = Config()


# Checked at import so a misconfigured deployment fails on startup rather than
# on the first request, when the damage is already done. Development is left
# alone deliberately: the point is to catch what must not ship, not to make a
# local checkout harder to run.
if settings.ENVIRONMENT == "production":
    problems = []

    if settings.JWT_SECRET_KEY == DEV_JWT_SECRET:
        problems.append(
            "JWT_SECRET_KEY is still the development placeholder, which is in "
            "the source. Anyone could mint a token for any account."
        )

    if "*" in settings.ALLOWED_ORIGINS:
        problems.append(
            "ALLOWED_ORIGINS contains '*'. List the real frontend origins."
        )

    if not settings.DB_URI:
        problems.append("DATABASE_URL is not set.")

    if problems:
        raise RuntimeError(
            "Refusing to start with ENVIRONMENT=production:\n- "
            + "\n- ".join(problems)
        )


# LangChain reads tracing configuration straight from the environment rather
# than from this module, so the resolved values are written back. The project
# name is cached by langsmith on first use, which is why it is set here at
# import time instead of when the graph runs.
os.environ["LANGSMITH_TRACING"] = "true" if settings.LANGSMITH_TRACING else "false"

if settings.LANGSMITH_TRACING:
    os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGSMITH_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGSMITH_ENDPOINT"] = settings.LANGSMITH_ENDPOINT
