from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.router.chat import router as chat_router

app = FastAPI(title="Voice Agent API")

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


