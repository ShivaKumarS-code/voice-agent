"""
Creates the application tables. Safe to re-run: nothing here drops anything.

Import order matters -- app.db.models has to be imported for its tables to be
registered on SQLModel.metadata, even though nothing below references it by
name.
"""
from sqlmodel import SQLModel, text

from app.db.database import engine
from app.db import models  # noqa: F401  (registers the tables on the metadata)

# Before the ALTER, not after: create_all does not touch a table that already
# exists, but ALTER TABLE on one that does not exist is an error, so a fresh
# database failed on the first run and only worked on the second.
SQLModel.metadata.create_all(engine)

with engine.connect() as conn:
    # users.customer_id was added after the first deployment, so it is missing
    # on databases created before then. create_all leaves existing tables alone
    # and will not add it, hence doing it by hand. IF NOT EXISTS makes it a
    # no-op everywhere else.
    conn.execute(
        text(
            "ALTER TABLE users "
            "ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);"
        )
    )
    conn.commit()

print("Tables are up to date.")
