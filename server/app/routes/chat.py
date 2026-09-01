from fastapi import APIRouter, Request
from app.models.chat import ChatRequest

router = APIRouter(prefix='/chat')

@router.post('/')
def chat(request: Request, data: ChatRequest):
    config = {
        "configurable": {
            "thread_id": "1"
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
