import json

from langchain.messages import ToolMessage
from langgraph.types import Command

CART_MODIFICATION_TOOLS = {
    "add_to_cart",
    "update_cart_item",
    "remove_from_cart",
    "clear_cart",
    # Placing an order empties the cart, so the badge has to refresh for it too.
    "place_order",
}

EMPTY_TOOL_RESULT_TEXT = "The tool returned no result."


def sanitize_tool_messages(messages: list) -> list:
    """
    Replaces empty tool-message content with placeholder text.

    Groq rejects a role:tool message whose content is an empty string or an
    empty list with a 400 ("value must be a string" OR "minimum number of
    items is 1"). A tool returning an empty list produces exactly that, and
    once such a message is checkpointed it is replayed on every later turn,
    so the thread stays broken until the content is patched on the way out.
    """
    sanitized = []

    for msg in messages:
        if isinstance(msg, ToolMessage) and not msg.content:
            msg = msg.model_copy(
                update={"content": EMPTY_TOOL_RESULT_TEXT}
            )

        sanitized.append(msg)

    return sanitized


def find_summary_cutoff(messages: list, keep_recent: int) -> int:
    """
    Index of the first message to keep when folding older turns into a summary.

    The cut lands on a user message rather than exactly keep_recent back,
    because a window that opens on a tool result is rejected outright: a
    role:tool message has to follow the assistant message that requested it.
    Snapping to a turn boundary keeps a few more messages than asked for,
    which is the safe direction to err.

    Returns 0 when there is nothing safe to cut, meaning "do not summarize".
    """
    if len(messages) <= keep_recent:
        return 0

    for index in range(len(messages) - keep_recent, -1, -1):
        msg_type = getattr(messages[index], "type", None)

        if msg_type == "human":
            return index

    return 0


def _tool_reported_success(msg) -> bool:
    """
    Reads the "success" flag out of a cart tool's JSON result.

    Anything that does not parse into a dict with that flag counts as a change:
    a redundant refetch is cheaper than leaving a stale cart on screen.
    """
    content = getattr(msg, "content", None)

    if not isinstance(content, str):
        return True

    try:
        payload = json.loads(content)
    except ValueError:
        return True

    if isinstance(payload, dict) and "success" in payload:
        return bool(payload["success"])

    return True


PROVIDER_FAILURE_REPLY = (
    "Sorry, I lost my train of thought there. Could you say that again?"
)


def is_tool_call_generation_failure(error: Exception) -> bool:
    """
    True when the provider rejected the model's own tool call as unparseable.

    Groq returns a 400 with code tool_use_failed when the model emits arguments
    that are not valid JSON. Nothing has run and nothing is saved, so the turn
    is worth retrying, unlike a bad request the caller built. It is checked by
    message text because the provider reports it as a generic BadRequestError.
    """
    return "tool_use_failed" in str(error)


def pending_interrupt(result: dict) -> dict | None:
    """
    The payload of a confirmation the graph is waiting on, if it paused.

    A paused turn has no assistant reply yet, so callers must send the payload
    to the client instead of reading the last message as an answer.
    """
    interrupts = (result or {}).get("__interrupt__")

    if not interrupts:
        return None

    value = getattr(interrupts[0], "value", None)

    return value if isinstance(value, dict) else {"type": "confirmation"}


STALE_CONFIRMATION_REPLY = (
    "That confirmation isn't waiting on an answer any more. Just ask me to "
    "check out again if you still want to place the order."
)


def has_pending_confirmation(graph, config: dict) -> bool:
    """
    True when the thread is parked inside a tool waiting on an answer.

    A parked thread cannot reply to anything else. LangGraph re-runs the
    pending task on the next invoke, so a new message re-raises the same
    interrupt rather than being answered -- and it does that for every message
    after it too, which leaves the customer permanently unable to get a reply.
    Callers check this before invoking so they can deal with the pause instead
    of walking into it.

    A thread that has never run has no state and no tasks, so this is also what
    distinguishes a real resume from one with nothing behind it.
    """
    snapshot = graph.get_state(config)

    return any(task.interrupts for task in getattr(snapshot, "tasks", ()))


def discard_pending_confirmation(graph, config: dict) -> bool:
    """
    Declines a confirmation the customer never answered, freeing the thread.

    This is the dropped call and the closed tab: the order dialog was on screen
    and nothing came back. Declining is the only safe reading of silence, and
    it is also the cheap one -- the decline path leaves the cart exactly as it
    was, so the customer loses nothing but the prompt and can ask to check out
    again. Approving on their behalf would place a real order they never
    confirmed.

    Returns True when a pause was actually cleared.
    """
    if not has_pending_confirmation(graph, config):
        return False

    # Runs the tool's decline branch and whatever the model says about it. The
    # reply is discarded: it answers a question the customer has already walked
    # away from. It stays in the transcript, which is what stops the model
    # bringing the abandoned order up again as though it were still open.
    graph.invoke(Command(resume={"approved": False}), config=config)

    return True


def is_cart_updated_in_turn(messages: list) -> bool:
    """
    Scans messages backwards from the latest turn (back to the last HumanMessage)
    to check if any cart modification tool actually changed the cart.

    Only tool results are inspected, not the tool calls that requested them:
    a call the model made is a request, while the result is the record of what
    happened. A rejected change ("only 5 in stock") reports failure and must
    not be announced as an update, or the badge animates over a cart that
    never changed.
    """
    for msg in reversed(messages):
        # Stop scanning when reaching the HumanMessage / user message for the current turn
        msg_type = getattr(msg, "type", None)
        msg_role = getattr(msg, "role", None) if isinstance(msg, dict) else getattr(msg, "role", None)

        if msg_type == "human" or msg_role == "user":
            break

        # Check ToolMessage name or dict name
        tool_name = getattr(msg, "name", None)
        if isinstance(msg, dict):
            tool_name = msg.get("name")

        if tool_name in CART_MODIFICATION_TOOLS and _tool_reported_success(msg):
            return True

    return False
