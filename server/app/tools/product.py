from langchain_core.tools import tool
from sqlmodel import Session, select

from app.db.database import engine
from app.db.models import Product


@tool
def get_all_products() -> dict:
    """Get all active products available in the store."""

    with Session(engine) as session:
        products = session.exec(
            select(Product)
            .where(Product.is_active == True)
            .order_by(Product.name)
        ).all()

        results = [
            {
                "product_id": str(product.id),
                "name": product.name,
                "description": product.description,
                "price": str(product.price),
                "stock_quantity": product.stock_quantity,
                "in_stock": product.stock_quantity > 0,
            }
            for product in products
        ]

        if not results:
            return {
                "success": True,
                "products": [],
                "message": (
                    "No products are currently "
                    "available."
                ),
            }

        return {
            "success": True,
            "count": len(results),
            "products": results,
        }


@tool
def search_products(query: str) -> dict:
    """Search active products by name or description."""

    with Session(engine) as session:
        products = session.exec(
            select(Product)
            .where(Product.is_active == True)
            .order_by(Product.name)
        ).all()

        search_term = query.lower().strip()

        results = []

        for product in products:
            if (
                search_term in product.name.lower()
                or search_term
                in product.description.lower()
            ):
                results.append({
                    "product_id": str(product.id),
                    "name": product.name,
                    "description": product.description,
                    "price": str(product.price),
                    "stock_quantity": product.stock_quantity,
                    "in_stock": product.stock_quantity > 0,
                })

        if not results:
            return {
                "success": True,
                "products": [],
                "message": (
                    f"No products matched '{query}'."
                ),
            }

        return {
            "success": True,
            "count": len(results),
            "products": results,
        }