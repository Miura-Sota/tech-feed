from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from pydantic import BaseModel

from database import get_db
from models import ReadMark, Article, User
from auth import get_current_user

router = APIRouter(prefix="/read-marks", tags=["read_marks"])


class ReadMarkOut(BaseModel):
    article_id: int
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ReadMarkOut])
def get_read_marks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """既読マーク一覧を返す"""
    return (
        db.query(ReadMark)
        .filter(ReadMark.user_id == current_user.id)
        .order_by(ReadMark.created_at.desc())
        .all()
    )


@router.post("/{article_id}", status_code=201)
def add_read_mark(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """既読追加（既存なら 200 で返す）"""
    article = db.query(Article).filter(Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    existing = db.query(ReadMark).filter_by(user_id=current_user.id, article_id=article_id).first()
    if existing:
        return {"message": "Already read"}
    read_mark = ReadMark(user_id=current_user.id, article_id=article_id)
    db.add(read_mark)
    db.commit()
    return {"message": "Marked as read"}


@router.delete("/{article_id}")
def remove_read_mark(
    article_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """既読解除"""
    read_mark = db.query(ReadMark).filter_by(user_id=current_user.id, article_id=article_id).first()
    if not read_mark:
        raise HTTPException(status_code=404, detail="Read mark not found")
    db.delete(read_mark)
    db.commit()
    return {"message": "Removed"}
