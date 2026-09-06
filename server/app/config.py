import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    INDEX_NAME = os.getenv("INDEX_NAME")
    DB_URI = os.getenv("DATABASE_URL")
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
    SIMLI_API_KEY = os.getenv("SIMLI_API_KEY")
    SIMLI_FACE_ID = os.getenv("SIMLI_FACE_ID")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production-1234567890")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

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

# LangChain reads tracing configuration straight from the environment rather
# than from this module, so the resolved values are written back. The project
# name is cached by langsmith on first use, which is why it is set here at
# import time instead of when the graph runs.
os.environ["LANGSMITH_TRACING"] = "true" if settings.LANGSMITH_TRACING else "false"

if settings.LANGSMITH_TRACING:
    os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ["LANGSMITH_PROJECT"] = settings.LANGSMITH_PROJECT
    os.environ["LANGSMITH_ENDPOINT"] = settings.LANGSMITH_ENDPOINT
