from pydantic import BaseModel

class ChatRequest(BaseModel):
    # Either a new message, or an answer to a pending confirmation. A resume
    # carries no message, since the turn it belongs to is already underway.
    message: str | None = None
    approved: bool | None = None