from fastapi import APIRouter, Depends, HTTPException, Request, status
from langgraph.types import Command
from sqlmodel import Session

from app.auth.security import get_current_user
from app.db.database import get_session
from app.db.models import User
from app.models.chat import ChatRequest
from app.agent.helpers import (
    STALE_CONFIRMATION_REPLY,
    discard_pending_confirmation,
    has_pending_confirmation,
    is_cart_updated_in_turn,
    pending_interrupt,
)
from app.routes.auth import resolve_customer_id

router = APIRouter(prefix='/chat')

@router.post('/')
def chat(
    request: Request,
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    config = {
        "configurable": {
            "thread_id": str(current_user.id),
            # The cart and order tools all need a customer_id, and the agent
            # has no other way to learn who it is talking to, so it would ask
            # the customer to recite an id they have never seen.
            "customer_id": resolve_customer_id(current_user, session),
            "customer_email": current_user.email,
            "customer_name": current_user.full_name,
        },
        # LangSmith trace labelling. thread_id is picked up from configurable
        # automatically, which is what groups a user's turns into one thread.
        "run_name": "chat-turn",
        "tags": ["chat"],
        "metadata": {
            "channel": "chat",
            "user_email": current_user.email,
        },
    }


    graph = request.app.state.graph

    if data.approved is not None:
        # Answering a confirmation resumes the paused turn rather than starting
        # a new one, so no message is added to the transcript.
        if not has_pending_confirmation(graph, config):
            # Nothing is waiting on this answer: it was sent twice, or the
            # pause was already cleared by a later message. Resuming anyway
            # replays the previous assistant reply as though it were fresh, and
            # on a thread with no history at all it raises outright.
            return {
                'response': STALE_CONFIRMATION_REPLY,
                'cart_updated': False,
                'confirmation': None,
            }

        payload = Command(resume={"approved": data.approved})
    elif data.message:
        # A confirmation still parked on this thread would swallow the message:
        # LangGraph re-runs the pending tool and re-raises the same interrupt
        # instead of answering, for this message and every one after it. The
        # customer has moved on, so treat the unanswered prompt as declined.
        discard_pending_confirmation(graph, config)

        payload = {
            "messages": [
                {
                    'role': 'user',
                    'content': data.message
                }
            ]
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Send either a message or an approval.",
        )

    result = graph.invoke(payload, config=config)

    messages = result.get('messages', [])
    confirmation = pending_interrupt(result)

    if confirmation:
        # The graph is parked inside the tool, so there is no reply to speak
        # yet: the client shows the prompt and sends the answer back.
        return {
            'response': "",
            'cart_updated': False,
            'confirmation': confirmation,
        }

    return {
        'response': messages[-1].content if messages else "",
        'cart_updated': is_cart_updated_in_turn(messages),
        'confirmation': None,
    }
