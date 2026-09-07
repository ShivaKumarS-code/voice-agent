from langgraph.graph import StateGraph, MessagesState, END, START
from langchain.messages import AIMessage, RemoveMessage, SystemMessage
from langchain_groq import ChatGroq
from langchain_core.runnables import RunnableConfig
from app.config import settings
from app.tools.rag import search_knowledge_base
from app.tools.orders import search_orders, get_order, cancel_order, request_return, request_replacement, process_refund
from app.tools.cart import get_cart, add_to_cart, update_cart_item, remove_from_cart, clear_cart
from app.tools.checkout import place_order
from app.tools.product import get_all_products, search_products
from app.agent.helpers import (
    PROVIDER_FAILURE_REPLY,
    find_summary_cutoff,
    is_tool_call_generation_failure,
    sanitize_tool_messages,
)
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
    place_order,
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

You are speaking with a signed-in customer.

{details}

The cart and order tools already know which account this is, so they act on
this customer without being told who they are. Never ask the customer for an
account id, and never ask them to confirm their identity.

These tools only ever reach this customer's own account. If the customer asks
about someone else's cart or orders, tell them you can only help with their
own account.
"""


def build_system_prompt(summary: str, configurable: dict) -> str:
    sections = [SYSTEM_PROMPT]

    if configurable.get("customer_id"):
        # The id itself is deliberately left out: the tools take it from
        # config, so telling the model would only give it something to read
        # aloud or repeat back.
        details = []

        if configurable.get("customer_name"):
            details.append(f"- name: {configurable['customer_name']}")

        if configurable.get("customer_email"):
            details.append(f"- email: {configurable['customer_email']}")

        if not details:
            details.append("- no name or email is on file for this account")

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


# A tool_use_failed rejection is the model garbling its own tool call, so the
# same request usually succeeds on a second attempt. One retry, because a
# customer is waiting on the other end of this.
TOOL_CALL_RETRIES = 1


def chatbot(state: AgentState, config: RunnableConfig):
    messages = [
        SystemMessage(
            content=build_system_prompt(
                state.get("summary") or "",
                config.get("configurable") or {},
            )
        ),
        *sanitize_tool_messages(state['messages'])
    ]

    for attempt in range(TOOL_CALL_RETRIES + 1):
        try:
            return {'messages': [llm_with_tools.invoke(messages)]}
        except Exception as error:
            if not is_tool_call_generation_failure(error):
                raise

            print(f"Tool call generation failed (attempt {attempt + 1}):", error)

    # Out of retries. Answering badly beats a 500: the caller has a reply to
    # speak, and the transcript stays usable for the next turn.
    return {'messages': [AIMessage(content=PROVIDER_FAILURE_REPLY)]}


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
