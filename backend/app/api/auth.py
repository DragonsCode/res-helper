import secrets
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response
from sqlalchemy import delete, or_, select

from app.api.dependencies import DB, CurrentUser
from app.core.config import get_settings
from app.core.security import hash_password, token_hash, verify_password
from app.models import LoginSession, User, now
from app.schemas import DemoStart, Login, ProfileUpdate, Register
from app.services.demo import seed_demo
from app.services.workspaces import create_workspace, user_data, workspace_data

router = APIRouter(prefix="/auth", tags=["Authentication"])
_DUMMY_HASH = hash_password(secrets.token_urlsafe(24))


def login_response(db, user, response: Response):
    settings = get_settings()
    token = secrets.token_urlsafe(32)
    db.execute(delete(LoginSession).where(LoginSession.expires_at < now()))
    db.add(LoginSession(
        user_id=user.id, token_hash=token_hash(token),
        expires_at=now() + timedelta(days=settings.session_days),
    ))
    db.commit()
    response.set_cookie(
        "research_session", token, httponly=True, secure=settings.cookie_secure,
        samesite="lax", max_age=settings.session_days * 86400, path="/",
    )
    return {"user": user_data(user), "workspaces": workspace_data(db, user.id)}


@router.post("/register", status_code=201)
def register(payload: Register, db: DB, response: Response):
    email = str(payload.email).lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Аккаунт с таким email уже существует")
    user = User(name=payload.name, email=email, password_hash=hash_password(payload.password),
                audience=payload.audience)
    db.add(user)
    db.flush()
    create_workspace(db, user, f"Лаборатория {user.name.split()[0]}")
    return login_response(db, user, response)


@router.post("/login")
def login(payload: Login, db: DB, response: Response):
    user = db.scalar(select(User).where(or_(
        User.email == payload.identifier.lower(),
        User.legacy_username == payload.identifier,
    )))
    valid = verify_password(payload.password, user.password_hash if user else _DUMMY_HASH)
    if not valid or not user or not user.is_active:
        raise HTTPException(401, "Неверный email или пароль")
    if not user.password_hash.startswith("scrypt$"):
        user.password_hash = hash_password(payload.password)
    return login_response(db, user, response)


@router.post("/demo")
def demo(payload: DemoStart, db: DB, response: Response):
    if not get_settings().demo_enabled:
        raise HTTPException(404, "Демонстрационный режим выключен")
    user = seed_demo(db)
    user.audience = payload.audience
    return login_response(db, user, response)


@router.get("/me")
def me(user: CurrentUser, db: DB):
    return {"user": user_data(user), "workspaces": workspace_data(db, user.id)}


@router.patch("/me")
def update_me(payload: ProfileUpdate, user: CurrentUser, db: DB):
    for key, value in payload.model_dump().items():
        setattr(user, key, value)
    db.commit()
    return user_data(user)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DB):
    token = request.cookies.get("research_session")
    if token:
        db.execute(delete(LoginSession).where(LoginSession.token_hash == token_hash(token)))
        db.commit()
    response.delete_cookie(
        "research_session", path="/", secure=get_settings().cookie_secure,
        httponly=True, samesite="lax",
    )
