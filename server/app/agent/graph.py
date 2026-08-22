from langgraph.graph import StateGraph, MessagesState, END, START
from langchain.messages import SystemMessage
from langchain_groq import ChatGroq
from app.config import settings


llm = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=settings.GROQ_API_KEY,
    temperature=0.2
)

SYSTEM_PROMPT = """
You are a customer service AI assistant for an electronics retailer.

Your job is to help customers with:
- product questions
- returns
- warranties
- shipping
- orders
- service-center support

Be concise, helpful, and professional.

If you do not have enough information to answer something,
say that you do not have the required information instead
of inventing details.
"""

def chatbot(state: MessagesState):
    response = llm.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        *state['messages']
    ])

    return {'messages': [response]}

builder = StateGraph(MessagesState)

builder.add_node('chatbot', chatbot)

builder.add_edge(START, 'chatbot')
builder.add_edge('chatbot', END)

graph = builder.compile()