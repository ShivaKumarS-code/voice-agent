"""Workarounds for provider-side tool-calling quirks."""

# openai/gpt-oss-20b on Groq cannot reliably generate arguments for a tool whose
# parameter schema is empty. It emits a junk {"": ""} argument, and often JSON
# that does not parse at all, which Groq rejects outright:
#
#   groq.BadRequestError: 400 ... 'code': 'tool_use_failed',
#   'failed_generation': '{"name": "place_order", "arguments": {""}"}'
#
# Measured against the real tool set: 9/12 malformed for place_order, 7/10 for
# get_all_products. The same tools with a single declared parameter were clean
# 12/12, so one field to fill in is enough to fix it.
#
# Tools that need nothing from the model therefore declare CUSTOMER_REQUEST_DOC's
# parameter and ignore what arrives in it. Identity still comes from config, so
# this adds nothing the model can use to reach another account.
CUSTOMER_REQUEST_DOC = (
    "customer_request is what the customer asked for, in their own words."
)
