import asyncio
import json

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status
from deepgram.core.events import EventType
from langgraph.types import Command

from app.auth.security import get_current_user_ws
from app.db.database import get_session
from app.routes.auth import resolve_customer_id
from app.services.speech_to_text import SpeechToText
from app.services.text_to_speech import TextToSpeech
from app.agent.helpers import is_cart_updated_in_turn, pending_interrupt


router = APIRouter()

stt = SpeechToText()
tts = TextToSpeech()


@router.websocket("/ws/stt")
async def speech_to_text(
    websocket: WebSocket,
    token: str | None = Query(None),
):
    # Verify authentication token
    session = next(get_session())
    try:
        user = get_current_user_ws(token, session)
        # Resolved here because the session closes below, and the websocket
        # then runs for the whole call with no request-scoped session of its own.
        customer_id = resolve_customer_id(user, session) if user else None
    finally:
        session.close()

    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized")
        return

    await websocket.accept()
    thread_id = str(user.id)

    def build_config() -> dict:
        return {
            "configurable": {
                "thread_id": thread_id,
                # The cart and order tools all need a customer_id, and the
                # agent has no other way to learn who it is talking to, so it
                # would ask the customer to recite an id they have never seen.
                "customer_id": customer_id,
                "customer_email": user.email,
                "customer_name": user.full_name,
            },
            # LangSmith trace labelling. thread_id is picked up from
            # configurable automatically, which is what groups a user's turns
            # into one thread.
            "run_name": "voice-turn",
            "tags": ["voice"],
            "metadata": {
                "channel": "voice",
                "user_email": user.email,
            },
        }

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
                    config = build_config()

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

                    await deliver_turn(result, config)

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

            async def deliver_turn(result: dict, config: dict):
                """Speaks the agent's reply, or asks for confirmation instead."""
                messages = result.get("messages", [])

                # --------------------------------------------------
                # Check if cart was updated during graph execution
                # --------------------------------------------------
                if is_cart_updated_in_turn(messages):
                    await websocket.send_json({
                        "type": "cart_updated"
                    })

                confirmation = pending_interrupt(result)

                if confirmation:
                    # The graph is parked inside the tool waiting on an answer,
                    # so there is no reply to speak. The client shows the
                    # prompt and sends the decision back over this socket.
                    print("Awaiting confirmation:", confirmation.get("type"))

                    await websocket.send_json({
                        "type": "confirmation_required",
                        "confirmation": confirmation,
                    })
                    return

                # --------------------------------------------------
                # Get agent response
                # --------------------------------------------------
                response = messages[-1].content if messages else ""

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

            async def resume_turn(approved: bool):
                """Feeds the customer's decision back into the paused turn."""
                try:
                    print("Confirmation answered:", approved)

                    graph = websocket.app.state.graph

                    result = await asyncio.to_thread(
                        graph.invoke,
                        Command(resume={"approved": approved}),
                        config=build_config(),
                    )

                    await deliver_turn(result, build_config())

                except WebSocketDisconnect:
                    print("Client disconnected while resuming")

                except Exception as e:
                    print("resume_turn error:", e)

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
                    # The socket carries mic audio as bytes and the customer's
                    # confirmation answer as JSON, so both are handled here.
                    packet = await websocket.receive()

                    if packet["type"] == "websocket.disconnect":
                        break

                    audio = packet.get("bytes")

                    if audio is not None:
                        await connection.send_media(audio)
                        continue

                    text = packet.get("text")

                    if not text:
                        continue

                    try:
                        payload = json.loads(text)
                    except ValueError:
                        print("Ignoring unreadable client message")
                        continue

                    if payload.get("type") == "confirmation_response":
                        asyncio.create_task(
                            resume_turn(bool(payload.get("approved")))
                        )

            finally:
                listener_task.cancel()

    except WebSocketDisconnect:
        print("WebSocket disconnected")

    except Exception as e:
        print(
            "WebSocket error:",
            e,
        )