from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth.security import get_current_user
from app.db.database import get_session
from app.db.models import User
from app.routes.auth import resolve_customer_id
from app.tools.cart import get_cart

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/")
def read_cart(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    customer_id = resolve_customer_id(current_user, session)

    # get_cart takes the customer from config rather than from an argument, so
    # this route supplies it the same way the agent's graph does.
    return get_cart.invoke(
        {},
        config={"configurable": {"customer_id": customer_id}},
    )
