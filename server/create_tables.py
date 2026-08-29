from sqlmodel import SQLModel
from app.db.database import engine
from app.db import models

SQLModel.metadata.create_all(engine)