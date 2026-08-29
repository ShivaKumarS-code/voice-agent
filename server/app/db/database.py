from sqlmodel import Session, create_engine
from app.config import settings

engine = create_engine(settings.DB_URI)

def get_session():
    with Session(engine) as session:
        yield session