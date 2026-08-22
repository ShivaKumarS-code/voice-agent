from fastapi import APIRouter
from app.models.chat import ChatRequest
from app.agent.graph import graph


router = APIRouter(prefix='/chat')

@router.post('/')
def chat(request: ChatRequest):
    result = graph.invoke({
        "messages": [
            {
                'role': 'user',
                'content': request.message
            }
        ]
    })

    response = result['messages'][-1].content

    return {
        'response': response
    }
