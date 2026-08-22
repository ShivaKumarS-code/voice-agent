from app.config import settings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document


embeddings = GoogleGenerativeAIEmbeddings(
    model="gemini-embedding-001",
    api_key=settings.GOOGLE_API_KEY,
)

def embed_documents(documents: list[Document]) -> list[list[float]]:
    texts = [
        f"{document.metadata['question']}\n\n{document.page_content}"
        for document in documents
    ]

    return embeddings.embed_documents(texts)