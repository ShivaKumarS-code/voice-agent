from langchain_text_splitters import MarkdownHeaderTextSplitter
from langchain_core.documents import Document
from pathlib import Path

KNOWLEDGE_BASE_DIR = Path('knowledge_base')

splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on = [
        ('##', 'question')
    ]
)

def load_knowledge_base() -> list[Document]:
    documents = []

    for path in KNOWLEDGE_BASE_DIR.glob('*.md'):
        text = path.read_text(encoding='utf-8')
        file_metadata, content = remove_frontmatter(text)

        docs = splitter.split_text(content)

        for doc in docs:
            doc.metadata['source'] = path.name
            doc.metadata.update(file_metadata)

        documents.extend(docs)
    
    return documents

def remove_frontmatter(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text

    _, frontmatter, content = text.split("---", 2)

    metadata = {}

    for line in frontmatter.strip().splitlines():
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()

    return metadata, content
