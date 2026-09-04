from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4
from app.db.enums import OrderStatus, ShipmentStatus, ReplacementStatus, RefundStatus, ReturnStatus

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
    status: OrderStatus
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
    status: ShipmentStatus
    estimated_delivery: datetime | None = None


class Return(SQLModel, table=True):
    __tablename__ = "returns"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    order_id: UUID = Field(foreign_key="orders.id")
    order_item_id: UUID = Field(foreign_key="order_items.id")
    status: ReturnStatus
    reason: str
    created_at: datetime


class Refund(SQLModel, table=True):
    __tablename__ = "refunds"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    return_id: UUID = Field(foreign_key="returns.id")
    amount: Decimal
    status: RefundStatus
    processed_at: datetime | None = None

class Replacement(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    order_id: UUID = Field(foreign_key="orders.id")
    order_item_id: UUID = Field(foreign_key="order_items.id")

    status: ReplacementStatus
    reason: str
    created_at: datetime


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str | None = None
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(SQLModel):
    email: str
    password: str
    full_name: str | None = None


class UserRead(SQLModel):
    id: UUID
    email: str
    full_name: str | None = None
    is_active: bool
    created_at: datetime


class LoginRequest(SQLModel):
    email: str
    password: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(SQLModel):
    sub: str | None = None
    email: str | None = None