from fastapi import APIRouter, Depends, Request
from app.auth.security import get_current_user
from app.db.models import User
from app.models.chat import ChatRequest

router = APIRouter(prefix='/chat')

@router.post('/')
def chat(
    request: Request,
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    config = {
        "configurable": {
            "thread_id": str(current_user.id)
        }
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

    response = result['messages'][-1].content

    return {
        'response': response
    }
