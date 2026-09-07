from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from app.db.models import Customer, Order, OrderItem, Shipment, Return, Replacement, Refund
from sqlmodel import Session, select
from app.db.database import engine
from datetime import datetime

NO_CUSTOMER_RESULT = {
    "success": False,
    "message": (
        "No signed-in customer is available, so orders cannot be looked up. "
        "Ask the customer to sign in."
    ),
}


@tool
def search_orders(config: RunnableConfig, customer_request: str = "") -> dict:
    """
    List the signed-in customer's orders.

    customer_request is what the customer asked for, in their own words.
    """

    # customer_request is deliberately unused: it exists so the tool has a
    # parameter for the model to fill in. See app.tools.model_quirks.
    #
    # Read from config, not from an argument: the caller establishes whose
    # orders these are, so the model cannot ask for another account's.
    customer_id = ((config or {}).get("configurable") or {}).get("customer_id")

    if not customer_id:
        return {**NO_CUSTOMER_RESULT, "orders": []}

    with Session(engine) as session:
        customer = session.get(Customer, customer_id)

        if not customer:
            return {
                "success": False,
                "orders": [],
                "message": "No customer record was found for this account.",
            }

        orders = session.exec(
            select(Order).where(Order.customer_id == customer.id).order_by(Order.order_date.desc())
        ).all()

        results = []

        for order in orders:
            items = session.exec(
                select(OrderItem).where(OrderItem.order_id == order.id)
            ).all()

            results.append({
                "order_id": str(order.id),
                "status": order.status,
                "order_date": order.order_date.isoformat(),
                "total_amount": str(order.total_amount),
                "items": [
                    {
                        "product_name": item.product_name,
                        "quantity": item.quantity,
                    }
                    for item in items
                ],
            })

        if not results:
            return {
                "success": True,
                "orders": [],
                "message": "This customer has no orders.",
            }

        return {
            "success": True,
            "count": len(results),
            "orders": results,
        }

def _load_owned_order(session, order_id: str, config: RunnableConfig):
    """
    Loads an order only if it belongs to the signed-in customer.

    Returns (order, error). An order belonging to someone else is reported as
    not found rather than as forbidden: confirming that an id exists would
    leak that much on its own, and there is nothing the customer could do
    with the distinction.
    """
    customer_id = ((config or {}).get("configurable") or {}).get("customer_id")

    if not customer_id:
        return None, NO_CUSTOMER_RESULT

    order = session.get(Order, order_id)

    if not order or str(order.customer_id) != str(customer_id):
        return None, {
            "success": False,
            "message": "Order not found for this account.",
        }

    return order, None


@tool
def get_order(order_id: str, config: RunnableConfig) -> dict:
    """Get complete details for one of the signed-in customer's orders."""

    with Session(engine) as session:
        order, error = _load_owned_order(session, order_id, config)

        if error:
            return error

        customer = session.get(Customer, order.customer_id)

        items = session.exec(
            select(OrderItem).where(OrderItem.order_id == order.id)
        ).all()

        shipment = session.exec(
            select(Shipment).where(Shipment.order_id == order.id)
        ).first()

        return {
            "order_id": str(order.id),
            "customer": {
                "name": customer.name,
                "email": customer.email,
                "phone": customer.phone,
            },
            "status": order.status,
            "order_date": order.order_date.isoformat(),
            "total_amount": str(order.total_amount),
            "items": [
                {
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price": str(item.price),
                }
                for item in items
            ],
            "shipment": (
                {
                    "carrier": shipment.carrier,
                    "tracking_number": shipment.tracking_number,
                    "status": shipment.status,
                    "estimated_delivery": (
                        shipment.estimated_delivery.isoformat()
                        if shipment.estimated_delivery
                        else None
                    ),
                }
                if shipment
                else None
            ),
        }

@tool
def cancel_order(order_id: str, config: RunnableConfig) -> dict:
    """Cancel one of the signed-in customer's orders, if it has not shipped."""

    with Session(engine) as session:
        order, error = _load_owned_order(session, order_id, config)

        if error:
            return error

        if order.status in {"shipped", "delivered", "cancelled"}:
            return {
                "success": False,
                "message": f"Order cannot be cancelled because its current status is {order.status}."
            }

        order.status = "cancelled"
        session.add(order)
        session.commit()
        session.refresh(order)

        return {
            "success": True,
            "order_id": str(order.id),
            "status": order.status,
            "message": "Order cancelled successfully."
        }

@tool
def request_return(order_id: str, order_item_id: str, reason: str, config: RunnableConfig) -> dict:
    """Submit a return request for an item in one of the signed-in customer's orders."""
    with Session(engine) as session:
        order, error = _load_owned_order(session, order_id, config)

        if error:
            return error

        if order.status != "delivered":
            return {
                "success": False,
                "message": (
                    f"Order cannot be returned because its current "
                    f"status is {order.status}."
                ),
            }

        item = session.get(OrderItem, order_item_id)

        if not item or item.order_id != order.id:
            return {
                "success": False,
                "message": "Order item not found for this order.",
            }
    
        existing_return = session.exec(
            select(Return).where(
                Return.order_id == order.id,
                Return.order_item_id == item.id,
            )
        ).first()

        if existing_return:
            return {
                "success": False,
                "message": "A return has already been requested for this item.",
            }

        return_request = Return(
            order_id=order.id,
            order_item_id=item.id,
            status="pending",
            reason=reason,
            created_at=datetime.now(),
        )

        session.add(return_request)
        session.commit()
        session.refresh(return_request)

        return {
            "success": True,
            "return_id": str(return_request.id),
            "order_id": str(order.id),
            "order_item_id": str(item.id),
            "status": return_request.status,
            "message": "Return request submitted successfully.",
        }

@tool
def request_replacement(
    order_id: str,
    order_item_id: str,
    reason: str,
    config: RunnableConfig,
) -> dict:
    """Request a replacement for a defective or damaged item in the signed-in customer's order."""

    with Session(engine) as session:
        order, error = _load_owned_order(session, order_id, config)

        if error:
            return error

        if order.status != "delivered":
            return {
                "success": False,
                "message": (
                    f"Replacement cannot be requested because the order "
                    f"status is {order.status}."
                ),
            }

        item = session.get(OrderItem, order_item_id)

        if not item or item.order_id != order.id:
            return {
                "success": False,
                "message": "Order item not found for this order.",
            }

        existing_replacement = session.exec(
            select(Replacement).where(
                Replacement.order_id == order.id,
                Replacement.order_item_id == item.id,
            )
        ).first()

        if existing_replacement:
            return {
                "success": False,
                "message": "A replacement has already been requested for this item.",
            }

        replacement = Replacement(
            order_id=order.id,
            order_item_id=item.id,
            status="pending",
            reason=reason,
            created_at=datetime.now(),
        )

        session.add(replacement)
        session.commit()
        session.refresh(replacement)

        return {
            "success": True,
            "replacement_id": str(replacement.id),
            "order_id": str(order.id),
            "order_item_id": str(item.id),
            "status": replacement.status,
            "message": "Replacement request submitted successfully.",
        }

@tool
def process_refund(return_id: str, config: RunnableConfig) -> dict:
    """Process a refund for an eligible return on the signed-in customer's order."""

    customer_id = ((config or {}).get("configurable") or {}).get("customer_id")

    if not customer_id:
        return NO_CUSTOMER_RESULT

    with Session(engine) as session:
        return_request = session.get(Return, return_id)

        # Ownership runs through the return's order, since a return id is the
        # only thing named here.
        owning_order = (
            session.get(Order, return_request.order_id)
            if return_request
            else None
        )

        if (
            not return_request
            or not owning_order
            or str(owning_order.customer_id) != str(customer_id)
        ):
            return {
                "success": False,
                "message": "Return request not found for this account.",
            }

        if return_request.status not in {"pending", "approved"}:
            return {
                "success": False,
                "message": (
                    f"Refund cannot be processed because the return "
                    f"status is {return_request.status}."
                ),
            }

        existing_refund = session.exec(
            select(Refund).where(
                Refund.return_id == return_request.id
            )
        ).first()

        if existing_refund:
            return {
                "success": False,
                "message": "A refund has already been processed for this return.",
            }

        order = session.get(Order, return_request.order_id)

        if not order:
            return {
                "success": False,
                "message": "Associated order not found.",
            }

        refund = Refund(
            return_id=return_request.id,
            amount=order.total_amount,
            status="processed",
            processed_at=datetime.now(),
        )

        session.add(refund)
        session.commit()
        session.refresh(refund)

        return {
            "success": True,
            "refund_id": str(refund.id),
            "return_id": str(return_request.id),
            "amount": str(refund.amount),
            "status": refund.status,
            "processed_at": refund.processed_at.isoformat(),
            "message": "Refund processed successfully.",
        }