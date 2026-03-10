from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Preferences

router = APIRouter(prefix="/settings", tags=["settings"])


class PreferencesOut(BaseModel):
    id: int
    preferred_tags: str
    preferred_keywords: str

    class Config:
        from_attributes = True


class PreferencesIn(BaseModel):
    preferred_tags: str = ""
    preferred_keywords: str = ""


def _get_or_create(db: Session) -> Preferences:
    prefs = db.query(Preferences).filter_by(id=1).first()
    if prefs is None:
        prefs = Preferences(id=1, preferred_tags="", preferred_keywords="")
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("/preferences", response_model=PreferencesOut)
def get_preferences(db: Session = Depends(get_db)):
    return _get_or_create(db)


@router.put("/preferences", response_model=PreferencesOut)
def update_preferences(body: PreferencesIn, db: Session = Depends(get_db)):
    prefs = _get_or_create(db)
    prefs.preferred_tags = body.preferred_tags
    prefs.preferred_keywords = body.preferred_keywords
    db.commit()
    db.refresh(prefs)
    return prefs
