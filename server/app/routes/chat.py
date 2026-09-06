from fastapi import APIRouter, Depends, Request
from sqlmodel import Session

from app.auth.security import get_current_user
from app.db.database import get_session
from app.db.models import User
from app.models.chat import ChatRequest
from app.agent.helpers import is_cart_updated_in_turn
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

    result = graph.invoke({
        "messages": [
            {
                'role': 'user',
                'content': data.message
            }
        ]
    }, config=config)

    messages = result.get('messages', [])
    response = messages[-1].content if messages else ""
    cart_updated = is_cart_updated_in_turn(messages)

    return {
        'response': response,
        'cart_updated': cart_updated
    }
