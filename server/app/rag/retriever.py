from app.rag.vector_store import index
from app.rag.embeddings import embeddings

def retrieve(query: str, k: int = 3):
    query_vector = embeddings.embed_query(query)

    results = index.query(
        vector = query_vector,
        top_k = k,
        include_metadata = True
    )

    return results.matches