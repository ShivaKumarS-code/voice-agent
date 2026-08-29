from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    email: str
    phone: str


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    customer_id: UUID = Field(foreign_key="customers.id")
    status: str
    order_date: datetime
    total_amount: Decimal


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="orders.id")
    product_name: str
    quantity: int
    price: Decimal


class Shipment(SQLModel, table=True):
    __tablename__ = "shipments"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="orders.id")
    carrier: str
    tracking_number: str
    status: str
    estimated_delivery: datetime | None = None


class Return(SQLModel, table=True):
    __tablename__ = "returns"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="orders.id")
    order_item_id: UUID = Field(foreign_key="order_items.id")
    status: str
    reason: str
    created_at: datetime


class Refund(SQLModel, table=True):
    __tablename__ = "refunds"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    return_id: UUID = Field(foreign_key="returns.id")
    amount: Decimal
    status: str
    processed_at: datetime | None = None