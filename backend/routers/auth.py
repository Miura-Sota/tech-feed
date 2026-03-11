from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
from models import User
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    access_token: str
    user_id: int
    email: str
    is_admin: bool


class MeOut(BaseModel):
    id: int
    email: str
    is_admin: bool

    class Config:
        from_attributes = True


def _is_first_user(db: Session) -> bool:
    return db.query(User).count() == 0


@router.post("/register", response_model=AuthOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters")
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    is_admin = _is_first_user(db)
    user = User(email=body.email, hashed_password=hash_password(body.password), is_admin=is_admin)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id, user.email)
    return AuthOut(access_token=token, user_id=user.id, email=user.email, is_admin=user.is_admin)


@router.post("/login", response_model=AuthOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account disabled")
    token = create_access_token(user.id, user.email)
    return AuthOut(access_token=token, user_id=user.id, email=user.email, is_admin=user.is_admin)


@router.get("/me", response_model=MeOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
