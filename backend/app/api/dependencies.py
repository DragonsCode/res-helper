from typing import Annotated

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import token_hash
from app.models import LoginSession, Membership, User, Workspace, now

DB = Annotated[Session, Depends(get_db)]


def current_user(db: DB, research_session: Annotated[str | None, Cookie()] = None) -> User:
    if not research_session:
        raise HTTPException(401, "Войдите в аккаунт")
    session = db.scalar(select(LoginSession).where(
        LoginSession.token_hash == token_hash(research_session), LoginSession.expires_at > now()
    ))
    user = db.get(User, session.user_id) if session else None
    if not user or not user.is_active:
        raise HTTPException(401, "Сессия завершена. Войдите снова")
    return user


CurrentUser = Annotated[User, Depends(current_user)]


def membership(workspace_id: str, db: DB, user: CurrentUser) -> Membership:
    member = db.get(Membership, (workspace_id, user.id))
    if not member or not db.get(Workspace, workspace_id):
        raise HTTPException(404, "Пространство не найдено")
    return member


Member = Annotated[Membership, Depends(membership)]


def can_write(member: Member) -> Membership:
    if member.role == "viewer":
        raise HTTPException(403, "У вас доступ только для чтения")
    return member


Writer = Annotated[Membership, Depends(can_write)]


def owner(member: Member) -> Membership:
    if member.role != "owner":
        raise HTTPException(403, "Это действие доступно владельцу пространства")
    return member


Owner = Annotated[Membership, Depends(owner)]
