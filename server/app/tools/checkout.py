from datetime import datetime

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.types import interrupt
from sqlmodel import Session, select

from app.db.database import engine
from app.db.enums import OrderStatus
from app.db.models import Cart, CartItem, Order, OrderItem, Product
from app.tools.cart import NO_CUSTOMER_RESULT, customer_id_from_config


def _read_cart_for_checkout(session: Session, customer_id: str):
    """
    Builds the order preview from the cart, or explains why it cannot be ordered.

    Returns (lines, subtotal, error). Read-only by design: this runs again when
    the customer answers the confirmation prompt, because a tool that
    interrupts is replayed from the top rather than resumed mid-body.
    """
    cart = session.exec(
        select(Cart).where(Cart.customer_id == customer_id)
    ).first()

    cart_items = (
        session.exec(
            select(CartItem).where(CartItem.cart_id == cart.id)
        ).all()
        if cart
        else []
    )

    if not cart_items:
        return None, None, {
            "success": False,
            "message": "The cart is empty, so there is nothing to order.",
        }

    lines = []
    subtotal = 0

    for cart_item in cart_items:
        product = session.get(Product, cart_item.product_id)

        if not product or not product.is_active:
            return None, None, {
                "success": False,
                "message": (
                    "An item in the cart is no longer available. Ask the "
                    "customer to review their cart before ordering."
                ),
            }

        if cart_item.quantity > product.stock_quantity:
            return None, None, {
                "success": False,
                "message": (
                    f"Only {product.stock_quantity} units of {product.name} "
                    f"are in stock, but the cart has {cart_item.quantity}."
                ),
            }

        line_total = product.price * cart_item.quantity
        subtotal += line_total

        lines.append({
            "product_id": product.id,
            "product_name": product.name,
            "quantity": cart_item.quantity,
            "price": float(product.price),
            "line_total": float(line_total),
        })

    return lines, subtotal, None


@tool
def place_order(config: RunnableConfig, customer_request: str = "") -> dict:
    """
    Place an order for everything in the signed-in customer's cart.

    The customer is shown the order and has to confirm it before anything is
    charged or created, so call this as soon as they say they want to order or
    check out. Do not ask them to confirm first, and do not read the total
    back to them beforehand; the confirmation prompt does both.

    customer_request is what the customer asked for, in their own words.

    Tell the customer what happened using the result: an order was either
    placed, or declined and their cart left untouched.
    """
    # customer_request is deliberately unused: it exists so the tool has a
    # parameter for the model to fill in. See app.tools.model_quirks.
    customer_id = customer_id_from_config(config)

    if not customer_id:
        return NO_CUSTOMER_RESULT

    with Session(engine) as session:
        lines, subtotal, error = _read_cart_for_checkout(session, customer_id)

        if error:
            return error

        preview = {
            "type": "order_confirmation",
            "items": [
                {
                    "product_name": line["product_name"],
                    "quantity": line["quantity"],
                    "price": line["price"],
                    "line_total": line["line_total"],
                }
                for line in lines
            ],
            "item_count": sum(line["quantity"] for line in lines),
            "total": float(subtotal),
        }

    # Everything above is read-only, and everything below runs only once the
    # customer has answered. The graph pauses here and the turn returns to the
    # caller; the answer arrives as a resume on the same thread.
    decision = interrupt(preview)

    approved = bool(decision.get("approved")) if isinstance(decision, dict) else bool(decision)

    if not approved:
        return {
            "success": False,
            "order_placed": False,
            "message": (
                "The customer declined the order. Their cart has been left "
                "as it was."
            ),
        }

    with Session(engine) as session:
        # Re-read rather than trusting the preview: the customer may have taken
        # a while to answer, and stock or prices can move in between.
        lines, subtotal, error = _read_cart_for_checkout(session, customer_id)

        if error:
            return {**error, "order_placed": False}

        order = Order(
            customer_id=customer_id,
            status=OrderStatus.processing,
            order_date=datetime.now(),
            total_amount=subtotal,
        )

        session.add(order)
        session.commit()
        session.refresh(order)

        for line in lines:
            session.add(OrderItem(
                order_id=order.id,
                # Denormalised on purpose: the order should still read
                # correctly after the product is renamed or repriced.
                product_name=line["product_name"],
                quantity=line["quantity"],
                price=line["price"],
            ))

            product = session.get(Product, line["product_id"])
            product.stock_quantity -= line["quantity"]
            session.add(product)

        cart = session.exec(
            select(Cart).where(Cart.customer_id == customer_id)
        ).first()

        if cart:
            for cart_item in session.exec(
                select(CartItem).where(CartItem.cart_id == cart.id)
            ).all():
                session.delete(cart_item)

        session.commit()

        return {
            "success": True,
            "order_placed": True,
            "order_id": str(order.id),
            "status": order.status.value,
            "item_count": sum(line["quantity"] for line in lines),
            "total": float(subtotal),
            "message": (
                f"Order placed. The total is {float(subtotal)} and the order "
                "is now being processed."
            ),
        }
