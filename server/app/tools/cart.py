from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from sqlmodel import Session, select

from app.db.database import engine
from app.db.models import Cart, CartItem, Customer, Product

NO_CUSTOMER_RESULT = {
    "success": False,
    "message": (
        "No signed-in customer is available, so the cart cannot be read or "
        "changed. Ask the customer to sign in."
    ),
}


def customer_id_from_config(config: RunnableConfig) -> str | None:
    """
    The signed-in customer's id, supplied by the caller through config.

    Every cart tool reads the id from here rather than taking it as an
    argument, so the model can neither see it nor choose it: a `config`
    parameter is stripped from the schema the model is shown, and a `config`
    the model invents in a tool call is discarded instead of merged. That
    makes "show me someone else's cart" unrepresentable rather than merely
    discouraged by the prompt.
    """
    return ((config or {}).get("configurable") or {}).get("customer_id")


@tool
def get_cart(config: RunnableConfig, customer_request: str = "") -> dict:
    """
    Get the current contents of the signed-in customer's cart.

    customer_request is what the customer asked for, in their own words.
    """

    # customer_request is deliberately unused: it exists so the tool has a
    # parameter for the model to fill in. See app.tools.model_quirks.
    customer_id = customer_id_from_config(config)

    if not customer_id:
        return NO_CUSTOMER_RESULT

    with Session(engine) as session:
        customer = session.get(Customer, customer_id)

        if not customer:
            return {
                "success": False,
                "message": "Customer not found.",
            }

        cart = session.exec(
            select(Cart).where(
                Cart.customer_id == customer.id
            )
        ).first()

        if not cart:
            return {
                "success": True,
                "items": [],
                "subtotal": 0.0,
                "message": "Cart is empty.",
            }

        cart_items = session.exec(
            select(CartItem).where(
                CartItem.cart_id == cart.id
            )
        ).all()

        items = []
        subtotal = 0

        for cart_item in cart_items:
            product = session.get(
                Product,
                cart_item.product_id,
            )

            if not product:
                continue

            item_total = product.price * cart_item.quantity
            subtotal += item_total

            items.append({
                "cart_item_id": str(cart_item.id),
                "product_id": str(product.id),
                "product_name": product.name,
                "quantity": cart_item.quantity,
                # Prices go out as JSON numbers. Sending Decimal as a string
                # forces every consumer to parse it, and the frontend renders
                # these with toFixed.
                "price": float(product.price),
                "item_total": float(item_total),
            })

        return {
            "success": True,
            "cart_id": str(cart.id),
            "items": items,
            "subtotal": float(subtotal),
        }


@tool
def add_to_cart(
    product_name: str,
    quantity: int,
    config: RunnableConfig,
) -> dict:
    """Add a product to the signed-in customer's cart."""

    if quantity <= 0:
        return {
            "success": False,
            "message": "Quantity must be greater than zero.",
        }

    customer_id = customer_id_from_config(config)

    if not customer_id:
        return NO_CUSTOMER_RESULT

    with Session(engine) as session:
        customer = session.get(Customer, customer_id)

        if not customer:
            return {
                "success": False,
                "message": "Customer not found.",
            }

        product = session.exec(
            select(Product).where(
                Product.name.ilike(product_name),
                Product.is_active == True,
            )
        ).first()

        if not product:
            return {
                "success": False,
                "message": (
                    f"Product '{product_name}' "
                    "was not found."
                ),
            }

        if product.stock_quantity <= 0:
            return {
                "success": False,
                "message": (
                    f"{product.name} is currently "
                    "out of stock."
                ),
            }

        cart = session.exec(
            select(Cart).where(
                Cart.customer_id == customer.id
            )
        ).first()

        if not cart:
            cart = Cart(
                customer_id=customer.id
            )

            session.add(cart)
            session.commit()
            session.refresh(cart)

        cart_item = session.exec(
            select(CartItem).where(
                CartItem.cart_id == cart.id,
                CartItem.product_id == product.id,
            )
        ).first()

        current_quantity = (
            cart_item.quantity
            if cart_item
            else 0
        )

        new_quantity = current_quantity + quantity

        if new_quantity > product.stock_quantity:
            return {
                "success": False,
                "message": (
                    f"Only {product.stock_quantity} "
                    f"units of {product.name} "
                    "are available."
                ),
            }

        if cart_item:
            cart_item.quantity = new_quantity
        else:
            cart_item = CartItem(
                cart_id=cart.id,
                product_id=product.id,
                quantity=quantity,
            )

            session.add(cart_item)

        session.commit()
        session.refresh(cart_item)

        return {
            "success": True,
            "cart_id": str(cart.id),
            "cart_item_id": str(cart_item.id),
            "product_id": str(product.id),
            "product_name": product.name,
            "quantity": cart_item.quantity,
            "price": float(product.price),
            "message": (
                f"{quantity} x {product.name} "
                "added to cart."
            ),
        }


@tool
def update_cart_item(
    product_name: str,
    quantity: int,
    config: RunnableConfig,
) -> dict:
    """
    Set the quantity of a product already in the signed-in customer's cart.

    quantity is the total the cart should end up with, not a change to it, so
    use this when the customer names that total ("make it three", "change it
    to one"). Use remove_from_cart with a quantity when they describe a
    change instead ("remove one", "take two off").
    """

    if quantity <= 0:
        return {
            "success": False,
            "message": (
                "Quantity must be greater than zero. "
                "Use remove_from_cart to remove the item."
            ),
        }

    customer_id = customer_id_from_config(config)

    if not customer_id:
        return NO_CUSTOMER_RESULT

    with Session(engine) as session:
        customer = session.get(Customer, customer_id)

        if not customer:
            return {
                "success": False,
                "message": "Customer not found.",
            }

        cart = session.exec(
            select(Cart).where(
                Cart.customer_id == customer.id
            )
        ).first()

        if not cart:
            return {
                "success": False,
                "message": "Cart not found.",
            }

        cart_items = session.exec(
            select(CartItem).where(
                CartItem.cart_id == cart.id
            )
        ).all()

        cart_item = None
        product = None

        for item in cart_items:
            current_product = session.get(
                Product,
                item.product_id,
            )

            if (
                current_product
                and current_product.name.lower()
                == product_name.lower()
            ):
                cart_item = item
                product = current_product
                break

        if not cart_item or not product:
            return {
                "success": False,
                "message": (
                    f"{product_name} is not "
                    "in the cart."
                ),
            }

        if not product.is_active:
            return {
                "success": False,
                "message": (
                    f"{product.name} is no longer "
                    "available."
                ),
            }

        if quantity > product.stock_quantity:
            return {
                "success": False,
                "message": (
                    f"Only {product.stock_quantity} "
                    f"units of {product.name} "
                    "are available."
                ),
            }

        cart_item.quantity = quantity

        session.add(cart_item)
        session.commit()
        session.refresh(cart_item)

        return {
            "success": True,
            "cart_item_id": str(cart_item.id),
            "product_id": str(product.id),
            "product_name": product.name,
            "quantity": cart_item.quantity,
            "price": float(product.price),
            "message": (
                f"Quantity for {product.name} "
                f"updated to {quantity}."
            ),
        }


@tool
def remove_from_cart(
    product_name: str,
    config: RunnableConfig,
    quantity: int | None = None,
) -> dict:
    """
    Remove a product from the signed-in customer's cart, or reduce how many of it they have.

    Pass quantity to take that many units off the line, for a request like
    "remove one of those" or "drop two". Leave quantity out to remove the
    product entirely, however many of it are in the cart. Removing as many
    units as are in the cart removes the line.

    Use update_cart_item instead when the customer names the total they want
    to end up with, such as "make it three".
    """

    if quantity is not None and quantity <= 0:
        return {
            "success": False,
            "message": "Quantity to remove must be greater than zero.",
        }

    customer_id = customer_id_from_config(config)

    if not customer_id:
        return NO_CUSTOMER_RESULT

    with Session(engine) as session:
        customer = session.get(Customer, customer_id)

        if not customer:
            return {
                "success": False,
                "message": "Customer not found.",
            }

        cart = session.exec(
            select(Cart).where(
                Cart.customer_id == customer.id
            )
        ).first()

        if not cart:
            return {
                "success": False,
                "message": "Cart not found.",
            }

        cart_items = session.exec(
            select(CartItem).where(
                CartItem.cart_id == cart.id
            )
        ).all()

        cart_item = None
        product = None

        for item in cart_items:
            current_product = session.get(
                Product,
                item.product_id,
            )

            if (
                current_product
                and current_product.name.lower()
                == product_name.lower()
            ):
                cart_item = item
                product = current_product
                break

        if not cart_item or not product:
            return {
                "success": False,
                "message": (
                    f"{product_name} is not "
                    "in the cart."
                ),
            }

        previous_quantity = cart_item.quantity

        # A partial removal only decrements the line. Asking to remove at
        # least as many as are there is the same as removing the product.
        if quantity is not None and quantity < previous_quantity:
            cart_item.quantity = previous_quantity - quantity

            session.add(cart_item)
            session.commit()
            session.refresh(cart_item)

            return {
                "success": True,
                "cart_item_id": str(cart_item.id),
                "product_id": str(product.id),
                "product_name": product.name,
                "removed_quantity": quantity,
                # The remaining count is returned so the reply can state it
                # instead of inferring it.
                "quantity": cart_item.quantity,
                "price": float(product.price),
                "message": (
                    f"Removed {quantity} x {product.name}. "
                    f"{cart_item.quantity} left in the cart."
                ),
            }

        session.delete(cart_item)
        session.commit()

        return {
            "success": True,
            "product_id": str(product.id),
            "product_name": product.name,
            "removed_quantity": previous_quantity,
            "quantity": 0,
            "message": (
                f"{product.name} removed from cart."
            ),
        }


@tool
def clear_cart(config: RunnableConfig, customer_request: str = "") -> dict:
    """
    Remove all items from the signed-in customer's cart.

    customer_request is what the customer asked for, in their own words.
    """

    # customer_request is deliberately unused: it exists so the tool has a
    # parameter for the model to fill in. See app.tools.model_quirks.
    customer_id = customer_id_from_config(config)

    if not customer_id:
        return NO_CUSTOMER_RESULT

    with Session(engine) as session:
        customer = session.get(Customer, customer_id)

        if not customer:
            return {
                "success": False,
                "message": "Customer not found.",
            }

        cart = session.exec(
            select(Cart).where(
                Cart.customer_id == customer.id
            )
        ).first()

        if not cart:
            return {
                "success": True,
                "message": "Cart is already empty.",
            }

        cart_items = session.exec(
            select(CartItem).where(
                CartItem.cart_id == cart.id
            )
        ).all()

        if not cart_items:
            return {
                "success": True,
                "cart_id": str(cart.id),
                "message": "Cart is already empty.",
            }

        for item in cart_items:
            session.delete(item)

        session.commit()

        return {
            "success": True,
            "cart_id": str(cart.id),
            "message": "Cart cleared successfully.",
        }