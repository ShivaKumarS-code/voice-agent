import httpx

from fastapi import APIRouter, Depends, HTTPException

from app.auth.security import get_current_user
from app.config import settings
from app.db.models import User


router = APIRouter(prefix="/simli")

SIMLI_URL = "https://api.simli.ai"


@router.get("/config")
def simli_config():
    """
    Lets the browser know whether an avatar is available before it tries to
    open a session. The API key itself never leaves the server.
    """
    return {
        "enabled": bool(settings.SIMLI_API_KEY and settings.SIMLI_FACE_ID),
        "face_id": settings.SIMLI_FACE_ID,
    }


@router.post("/token")
async def simli_token(current_user: User = Depends(get_current_user)):

    """
    Exchanges the server-side API key for a short-lived session token that the
    browser uses to open its WebRTC connection to Simli.
    """
    if not settings.SIMLI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="SIMLI_API_KEY is not configured",
        )

    if not settings.SIMLI_FACE_ID:
        raise HTTPException(
            status_code=503,
            detail="SIMLI_FACE_ID is not configured",
        )

    payload = {
        "faceId": settings.SIMLI_FACE_ID,
        # The avatar idles on its own when no audio is arriving.
        "handleSilence": True,
        "maxSessionLength": 1800,
        "maxIdleTime": 300,
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{SIMLI_URL}/compose/token",
                headers={
                    "Content-Type": "application/json",
                    "x-simli-api-key": settings.SIMLI_API_KEY,
                },
                json=payload,
            )
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Simli: {error}",
        ) from error

    if response.status_code >= 400:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"Simli rejected the session request: {response.text}",
        )

    return response.json()
