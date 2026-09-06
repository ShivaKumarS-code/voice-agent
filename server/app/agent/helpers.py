import json

from langchain.messages import ToolMessage

CART_MODIFICATION_TOOLS = {"add_to_cart", "update_cart_item", "remove_from_cart", "clear_cart"}

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
