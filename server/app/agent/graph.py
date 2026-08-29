from langgraph.graph import StateGraph, MessagesState, END, START
from langchain.messages import SystemMessage
from langchain_groq import ChatGroq
from app.config import settings
from app.tools.rag import search_knowledge_base
from langgraph.prebuilt import ToolNode


llm = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=settings.GROQ_API_KEY,
    temperature=0.2
)

tools = [search_knowledge_base]
llm_with_tools = llm.bind_tools(tools)

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
    response = llm_with_tools.invoke([
        SystemMessage(content=SYSTEM_PROMPT),
        *state['messages']
    ])

    return {'messages': [response]}

tool_node = ToolNode(tools)


def should_continue(state: MessagesState):
    last_message = state["messages"][-1]

    if last_message.tool_calls:
        return "tools"

    return END

builder = StateGraph(MessagesState)

builder.add_node('chatbot', chatbot)
builder.add_node('tools', tool_node)

builder.add_edge(START, 'chatbot')
builder.add_conditional_edges(
    'chatbot',
    should_continue
)

builder.add_edge('tools', 'chatbot')
