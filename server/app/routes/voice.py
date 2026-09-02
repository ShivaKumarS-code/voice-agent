import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from deepgram.core.events import EventType

from app.services.speech_to_text import SpeechToText
from app.services.text_to_speech import TextToSpeech


router = APIRouter()

stt = SpeechToText()
tts = TextToSpeech()


@router.websocket("/ws/stt")
async def speech_to_text(websocket: WebSocket):
    await websocket.accept()

    try:
        async with stt.connect() as connection:

            async def process_transcript(transcript: str):
                try:
                    print("User:", transcript)

                    # --------------------------------------------------
                    # Send user's transcript to frontend
                    # --------------------------------------------------
                    await websocket.send_json({
                        "type": "transcript",
                        "transcript": transcript,
                    })

                    # --------------------------------------------------
                    # Get graph from FastAPI app state
                    # --------------------------------------------------
                    graph = websocket.app.state.graph

                    config = {
                        "configurable": {
                            "thread_id": "1"
                        }
                    }

                    # --------------------------------------------------
                    # Run LangGraph
                    # --------------------------------------------------
                    result = await asyncio.to_thread(
                        graph.invoke,
                        {
                            "messages": [
                                {
                                    "role": "user",
                                    "content": transcript,
                                }
                            ]
                        },
                        config=config,
                    )

                    # --------------------------------------------------
                    # Get agent response
                    # --------------------------------------------------
                    response = result["messages"][-1].content

                    print("Agent:", response)

                    # --------------------------------------------------
                    # Send agent response to frontend
                    # --------------------------------------------------
                    await websocket.send_json({
                        "type": "agent_response",
                        "response": response,
                    })

                    # --------------------------------------------------
                    # Generate TTS
                    # --------------------------------------------------
                    audio = await tts.synthesize(response)

                    print(
                        "Sending audio to frontend:",
                        len(audio),
                        "bytes",
                    )

                    # --------------------------------------------------
                    # Send audio to browser
                    # --------------------------------------------------
                    await websocket.send_bytes(audio)

                    print("Audio sent to frontend")

                except WebSocketDisconnect:
                    print(
                        "Client disconnected while processing"
                    )

                except Exception as e:
                    print(
                        "process_transcript error:",
                        e,
                    )

                    try:
                        await websocket.send_json({
                            "type": "error",
                            "error": str(e),
                        })
                    except Exception:
                        pass

            def on_message(message):
                transcript = getattr(
                    message,
                    "transcript",
                    None,
                )

                if not transcript:
                    return

                print("Transcript:", transcript)

                # ------------------------------------------------------
                # Only process completed turns
                # ------------------------------------------------------
                event = getattr(
                    message,
                    "event",
                    None,
                )

                if event == "EndOfTurn":
                    asyncio.create_task(
                        process_transcript(transcript)
                    )

            connection.on(
                EventType.MESSAGE,
                on_message,
            )

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
        print("WebSocket disconnected")

    except Exception as e:
        print(
            "WebSocket error:",
            e,
        )