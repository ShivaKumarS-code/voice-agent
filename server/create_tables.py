from sqlmodel import SQLModel, text
from app.db.database import engine
from app.db import models

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);"))
    conn.commit()

SQLModel.metadata.create_all(engine)