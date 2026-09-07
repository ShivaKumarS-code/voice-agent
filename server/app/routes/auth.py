from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from sqlmodel import Session, select

from app.auth.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.config import settings
from app.db.database import get_session
from app.db.models import Customer, LoginRequest, Token, User, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def _ensure_customer_linked(user: User, session: Session) -> Customer:
    """Finds or creates a matching Customer record for the User and sets user.customer_id."""
    customer = session.exec(select(Customer).where(Customer.email == user.email)).first()
    if not customer:
        customer_name = user.full_name or user.email.split("@")[0]
        customer = Customer(name=customer_name, email=user.email, phone="")
        session.add(customer)
        session.commit()
        session.refresh(customer)

    if user.customer_id != customer.id:
        user.customer_id = customer.id
        session.add(user)
        session.commit()
        session.refresh(user)

    return customer


def resolve_customer_id(user: User, session: Session) -> str:
    """
    The customer id for a signed-in user, creating the link if it is missing.

    Login and registration both link a Customer, so this normally just reads
    the id off the user; the fallback covers accounts created before that
    linking existed.
    """
    if user.customer_id:
        return str(user.customer_id)

    return str(_ensure_customer_linked(user, session).id)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    session: Session = Depends(get_session),
):
    # Normalize email
    email_clean = user_in.email.strip().lower()
    if not email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address cannot be empty",
        )

    # Check if user with email exists
    existing = session.exec(select(User).where(User.email == email_clean)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    hashed_pw = hash_password(user_in.password)
    user = User(
        email=email_clean,
        hashed_password=hashed_pw,
        full_name=user_in.full_name,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # Ensure linked Customer profile exists
    _ensure_customer_linked(user, session)

    return user



@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    session: Session = Depends(get_session),
):
    email_clean = login_data.email.strip().lower()
    user = session.exec(select(User).where(User.email == email_clean)).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    _ensure_customer_linked(user, session)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/token", response_model=Token, include_in_schema=False)
def login_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session),
):
    email_clean = form_data.username.strip().lower()
    user = session.exec(select(User).where(User.email == email_clean)).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    _ensure_customer_linked(user, session)

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )
    return Token(access_token=access_token, token_type="bearer")



@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
