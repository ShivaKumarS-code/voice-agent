from langgraph.graph import StateGraph, MessagesState, END, START
from langchain.messages import RemoveMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_core.runnables import RunnableConfig
from app.config import settings
from app.tools.rag import search_knowledge_base
from app.tools.orders import search_orders, get_order, cancel_order, request_return, request_replacement, process_refund
from app.tools.cart import get_cart, add_to_cart, update_cart_item, remove_from_cart, clear_cart
from app.tools.product import get_all_products, search_products
from app.agent.helpers import find_summary_cutoff, sanitize_tool_messages
from langgraph.prebuilt import ToolNode


class AgentState(MessagesState):
    # A running digest of the turns that have been folded away, so the older
    # part of a long conversation costs a paragraph instead of every message.
    summary: str


# The whole message list is replayed to the model on every turn, and the
# checkpointer rewrites it on every step, so an unbounded history makes each
# turn slower than the last. Past the trigger the older turns are folded into
# the summary and dropped from state.
SUMMARY_TRIGGER = 30
KEEP_RECENT_MESSAGES = 10


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
    process_refund,
    get_cart,
    add_to_cart,
    update_cart_item,
    remove_from_cart,
    clear_cart,
    get_all_products,
    search_products
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

SUMMARY_PROMPT = """
You are maintaining a running summary of a customer-service conversation so
that the earlier part of it can be dropped from the transcript.

Write a compact factual record that a support agent could pick the conversation
up from. Keep:
- what the customer is trying to accomplish, and anything still unresolved
- order IDs, product names, return or refund IDs, and their current status
- cart changes that succeeded, and any that were refused and why
- stated preferences, constraints, and details the customer gave about themselves

Leave out pleasantries and anything already fully resolved with nothing pending.
Do not invent details that are not in the transcript. Write plain prose, no
Markdown, no headings, no bullet points. Be brief.
"""


CUSTOMER_CONTEXT_TEMPLATE = """
CUSTOMER CONTEXT:

You are already speaking with a signed-in customer, and these details are
known. Never ask the customer to provide or confirm them.

{details}

Use this customer_id whenever a tool asks for one, and this email whenever a
tool asks for an account email. Use only these values, even if the customer
asks you to look at a different account. Do not read the customer_id out loud;
it is for tool calls only.
"""


def build_system_prompt(summary: str, configurable: dict) -> str:
    sections = [SYSTEM_PROMPT]

    customer_id = configurable.get("customer_id")

    if customer_id:
        details = [f"- customer_id: {customer_id}"]

        if configurable.get("customer_email"):
            details.append(f"- email: {configurable['customer_email']}")

        if configurable.get("customer_name"):
            details.append(f"- name: {configurable['customer_name']}")

        sections.append(
            CUSTOMER_CONTEXT_TEMPLATE.format(
                details="\n".join(details)
            ).strip()
        )

    if summary:
        sections.append(
            "EARLIER IN THIS CONVERSATION:\n"
            f"{summary}\n\n"
            "The messages that follow are the most recent turns. Treat the "
            "summary above as established context."
        )

    return "\n\n".join(sections)


def chatbot(state: AgentState, config: RunnableConfig):
    response = llm_with_tools.invoke([
        SystemMessage(
            content=build_system_prompt(
                state.get("summary") or "",
                config.get("configurable") or {},
            )
        ),
        *sanitize_tool_messages(state['messages'])
    ])

    return {'messages': [response]}


def summarize_conversation(state: AgentState):
    """Folds the older turns into the summary and drops them from state."""
    messages = state['messages']
    cutoff = find_summary_cutoff(messages, KEEP_RECENT_MESSAGES)

    if cutoff == 0:
        return {}

    older = messages[:cutoff]
    previous_summary = state.get("summary") or ""

    if previous_summary:
        instruction = (
            "Here is the summary so far:\n\n"
            f"{previous_summary}\n\n"
            "Extend it with the transcript above, keeping it a single "
            "continuous summary rather than two separate ones."
        )
    else:
        instruction = "Summarize the transcript above."

    # The summarizer must not call tools: it only reads the transcript.
    response = llm.invoke([
        SystemMessage(content=SUMMARY_PROMPT),
        *sanitize_tool_messages(older),
        SystemMessage(content=instruction),
    ])

    return {
        "summary": response.content,
        # A message with no id cannot be addressed for removal, so it stays.
        "messages": [
            RemoveMessage(id=msg.id)
            for msg in older
            if getattr(msg, "id", None)
        ],
    }


tool_node = ToolNode(tools)


def entry_point(state: AgentState):
    """Summarizes before answering when the transcript has grown too long."""
    messages = state['messages']

    if len(messages) < SUMMARY_TRIGGER:
        return "chatbot"

    if find_summary_cutoff(messages, KEEP_RECENT_MESSAGES) == 0:
        return "chatbot"

    return "summarize"


def should_continue(state: AgentState):
    last_message = state["messages"][-1]

    if last_message.tool_calls:
        return "tools"

    return END

builder = StateGraph(AgentState)

builder.add_node('chatbot', chatbot)
builder.add_node('tools', tool_node)
builder.add_node('summarize', summarize_conversation)

# Summarizing sits between START and chatbot rather than inside the
# chatbot/tools loop, so it runs at most once per turn.
builder.add_conditional_edges(
    START,
    entry_point,
    ['chatbot', 'summarize'],
)
builder.add_edge('summarize', 'chatbot')
builder.add_conditional_edges(
    'chatbot',
    should_continue
)

builder.add_edge('tools', 'chatbot')
