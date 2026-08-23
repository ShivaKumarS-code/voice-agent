from langchain_core.tools import tool
from app.rag.retriever import retrieve


@tool
def search_knowledge_base(query: str):
    """Search the TechMart knowledge base for customer-service information."""

    results = retrieve(query)

    if not results:
        return "No relevant information was found in the knowledge base."

    return "\n\n".join(
        (
            f"Question: {result.metadata.get('question')}\n"
            f"Answer: {result.metadata.get('content')}"
        )
        for result in results
    )
