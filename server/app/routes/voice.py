import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from deepgram.core.events import EventType

from app.services.speech_to_text import SpeechToText

router = APIRouter()

stt = SpeechToText()


@router.websocket("/ws/stt")
async def speech_to_text(websocket: WebSocket):
    await websocket.accept()

    try:
        async with stt.connect() as connection:

            def on_message(message):
                if getattr(message, "transcript", None):
                    asyncio.create_task(
                        websocket.send_json({
                            "transcript": message.transcript,
                            "type": getattr(message, "type", None),
                        })
                    )

            connection.on(EventType.MESSAGE, on_message)

            listener_task = asyncio.create_task(
                connection.start_listening()
            )

            try:
                while True:
                    audio = await websocket.receive_bytes()
                    await connection.send_media(audio)

            finally:
                listener_task.cancel()

    except WebSocketDisconnect:
        pass