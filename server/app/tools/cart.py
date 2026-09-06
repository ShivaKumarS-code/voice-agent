from langchain_core.tools import tool
from sqlmodel import Session, select

from app.db.database import engine
from app.db.models import Cart, CartItem, Customer, Product


@tool
def get_cart(customer_id: str) -> dict:
    """Get the current contents of a customer's cart."""

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
    customer_id: str,
    product_name: str,
    quantity: int,
) -> dict:
    """Add a product to a customer's cart."""

    if quantity <= 0:
        return {
            "success": False,
            "message": "Quantity must be greater than zero.",
        }

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
    customer_id: str,
    product_name: str,
    quantity: int,
) -> dict:
    """Update the quantity of a product in a customer's cart."""

    if quantity <= 0:
        return {
            "success": False,
            "message": (
                "Quantity must be greater than zero. "
                "Use remove_from_cart to remove the item."
            ),
        }

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
    customer_id: str,
    product_name: str,
) -> dict:
    """Remove a product from a customer's cart."""

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

        session.delete(cart_item)
        session.commit()

        return {
            "success": True,
            "product_id": str(product.id),
            "product_name": product.name,
            "message": (
                f"{product.name} removed from cart."
            ),
        }


@tool
def clear_cart(customer_id: str) -> dict:
    """Remove all items from a customer's cart."""

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