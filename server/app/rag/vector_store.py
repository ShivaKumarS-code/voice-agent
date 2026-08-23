from pinecone import ServerlessSpec, Pinecone
from app.config import settings

INDEX_NAME = settings.INDEX_NAME
DIMENSION = 3072

pc = Pinecone(api_key=settings.PINECONE_API_KEY)

if INDEX_NAME not in pc.list_indexes().names():
    pc.create_index(
        name=INDEX_NAME,
        dimension=DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

index = pc.Index(INDEX_NAME)

