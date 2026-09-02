from langgraph.graph import StateGraph, MessagesState, END, START
from langchain.messages import SystemMessage
from langchain_groq import ChatGroq
from app.config import settings
from app.tools.rag import search_knowledge_base
from app.tools.orders import search_orders, get_order, cancel_order, request_return, request_replacement, process_refund
from langgraph.prebuilt import ToolNode


llm = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=settings.GROQ_API_KEY,
    temperature=0.2
)

tools = [
    search_knowledge_base, 
    search_orders, 
    get_order, 
    cancel_order, 
    request_return,
    request_replacement,
    process_refund
    ]

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

VOICE RESPONSE RULES:

The user is speaking with you through a voice interface. Every response will be sent directly to a text-to-speech system.

Write responses exactly as they should be spoken aloud.

Follow these rules:

- Use natural, conversational sentences.
- Do not use Markdown formatting.
- Do not use bold, italics, headings, tables, or bullet points.
- Do not use Markdown symbols such as *, #, |, -, or backticks for formatting.
- Do not use HTML tags such as <br>.
- Do not use decorative separators.
- Do not use emojis.
- Do not include raw URLs unless absolutely necessary.
- Do not describe formatting or refer to "the table above" or similar visual elements.
- When information would normally be presented as a list, turn it into natural spoken sentences.
- When comparing products, explain the comparison conversationally rather than using a table.
- Keep the response concise enough to sound natural when spoken, but include all information necessary to answer the user's question.
- Use normal punctuation and paragraph breaks.
- Write currency, abbreviations, and symbols in a way that sounds natural when spoken.
- Never output content intended only for visual formatting.

For example, instead of:
"**Key Features:** - 5G - 12MP camera - A15 Bionic"

say:
"The key features include 5G support, a 12-megapixel camera, and an A15 Bionic chip."

Your response must contain only the final spoken response to the user. Do not include any internal reasoning or formatting instructions.
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
