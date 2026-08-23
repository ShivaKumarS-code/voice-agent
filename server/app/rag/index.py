import uuid
from app.rag.loader import load_knowledge_base
from app.rag.vector_store import index
from app.rag.embeddings import embed_documents

documents = load_knowledge_base()
vectors = embed_documents(documents)

records = []

for document, vector in zip(documents, vectors):
    records.append(
        {
            "id": str(uuid.uuid4()),
            "values": vector,
            "metadata": {
                **document.metadata,
                "content": document.page_content,
            },
        }
    )

index.upsert(vectors=records)

print(f"Upserted {len(records)} vectors")