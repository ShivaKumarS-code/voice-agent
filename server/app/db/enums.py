from enum import Enum


class OrderStatus(str, Enum):
    processing = "processing"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class ShipmentStatus(str, Enum):
    processing = "processing"
    in_transit = "in_transit"
    delivered = "delivered"

class ReplacementStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    shipped = "shipped"
    completed = "completed"
    rejected = "rejected"

class RefundStatus(str, Enum):
    pending = "pending"
    processed = "processed"
    failed = "failed"

class ReturnStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"

