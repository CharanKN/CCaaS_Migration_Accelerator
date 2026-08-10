"""Auth endpoints — registration, login, and the get_current_user dependency
used to gate secret-backed/mutating routes elsewhere in the API.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..core.errors import ConflictError, ForbiddenError, UnauthorizedError
from ..core.security import create_access_token, decode_token, hash_password, verify_password
from ..database import get_db
from ..models_db.user import FULL_ACCESS_ROLES, Role, User

router = APIRouter(prefix="/auth", tags=["auth"])

# tokenUrl points Swagger UI's "Authorize" flow at /login (form-encoded).
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    email: str
    role: str


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = req.email.strip().lower()
    if db.query(User).filter(User.email == email).first() is not None:
        raise ConflictError("An account with this email already exists")
    # Self-registration always lands in the restricted demo role; only an
    # existing admin can promote an account to a full-access role.
    user = User(email=email, hashed_password=hash_password(req.password), role=Role.DEMO.value)
    db.add(user)
    db.commit()
    return TokenResponse(access_token=create_access_token(user.email))


@router.post("/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenResponse:
    email = form.username.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(form.password, user.hashed_password):
        raise UnauthorizedError("Incorrect email or password")
    return TokenResponse(access_token=create_access_token(user.email))


def get_current_user(token: str = Depends(_oauth2_scheme), db: Session = Depends(get_db)) -> User:
    email = decode_token(token)
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise UnauthorizedError("User no longer exists")
    return user


def require_full_access(user: User = Depends(get_current_user)) -> User:
    """Gate for routes/actions not available to the DEMO role. Role is read
    fresh from the DB on every request (not cached in the JWT), so a role
    change by an admin takes effect immediately without needing a new login."""
    if user.role not in FULL_ACCESS_ROLES:
        raise ForbiddenError("This action isn't available in demo mode")
    return user


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)) -> MeResponse:
    return MeResponse(email=user.email, role=user.role)
