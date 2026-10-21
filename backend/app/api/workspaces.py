import secrets
from datetime import timedelta

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import func, select

from app.api.dependencies import DB, CurrentUser, Member, Owner
from app.core.security import token_hash
from app.models import (
    Activity,
    Discussion,
    Invitation,
    Membership,
    PlanInterest,
    Project,
    Resource,
    Task,
    User,
    Workspace,
    now,
)
from app.schemas import InterestCreate, InviteAccept, InviteCreate, WorkspaceUpdate
from app.services.workspaces import public_user, workspace_data

router = APIRouter(tags=["Workspaces"])


@router.get("/workspaces")
def workspaces(db: DB, user: CurrentUser):
    return workspace_data(db, user.id)


@router.patch("/workspaces/{workspace_id}")
def update_workspace(workspace_id: str, payload: WorkspaceUpdate, db: DB, member: Owner):
    workspace = db.get(Workspace, workspace_id)
    workspace.name = payload.name
    workspace.description = payload.description
    db.commit()
    return {"id": workspace.id, "name": workspace.name, "description": workspace.description}


@router.get("/workspaces/{workspace_id}/overview")
def overview(workspace_id: str, db: DB, member: Member):
    def count(model, *conditions):
        return db.scalar(select(func.count()).select_from(model).where(
            model.workspace_id == workspace_id, *conditions
        ))
    return {
        "active_projects": count(Project, Project.status == "active"),
        "resources": count(Resource),
        "members": count(Membership),
        "completed_tasks": count(Task, Task.status == "done"),
        "total_tasks": count(Task),
        "discussions": count(Discussion),
    }


@router.get("/workspaces/{workspace_id}/members")
def members(workspace_id: str, db: DB, member: Member):
    rows = db.execute(select(User, Membership).join(Membership).where(
        Membership.workspace_id == workspace_id
    ).order_by(Membership.joined_at)).all()
    return [{**public_user(user), "role": m.role, "joined_at": m.joined_at} for user, m in rows]


@router.get("/workspaces/{workspace_id}/activity")
def activity(workspace_id: str, db: DB, member: Member):
    rows = db.scalars(select(Activity).where(Activity.workspace_id == workspace_id).order_by(
        Activity.created_at.desc()
    ).limit(20)).all()
    return [{
        "id": a.id, "action": a.action, "subject": a.subject, "created_at": a.created_at,
        "user": public_user(db.get(User, a.user_id)),
        "target_type": a.target_type, "target_id": a.target_id,
    } for a in rows]


@router.get("/workspaces/{workspace_id}/search")
def search(workspace_id: str, db: DB, member: Member, q: str = Query(min_length=1, max_length=100)):
    results = []
    for model, kind in [(Project, "project"), (Resource, "resource"), (Discussion, "discussion")]:
        rows = db.scalars(select(model).where(
            model.workspace_id == workspace_id,
            func.lower(model.title).contains(q.lower().strip(), autoescape=True),
        ).limit(8)).all()
        # SQLite LOWER is ASCII-only; include bounded Python casefold matching for Cyrillic.
        if any(ord(c) > 127 for c in q):
            rows = [r for r in db.scalars(select(model).where(
                model.workspace_id == workspace_id
            )).all() if q.strip().casefold() in r.title.casefold()][:8]
        results.extend({"id": r.id, "title": r.title, "kind": kind} for r in rows)
    return results


@router.post("/workspaces/{workspace_id}/invitations", status_code=201)
def invite(workspace_id: str, payload: InviteCreate, db: DB, member: Owner):
    email = str(payload.email).lower()
    workspace = db.get(Workspace, workspace_id)
    if workspace.is_demo:
        raise HTTPException(422, "Создайте свой аккаунт, чтобы пригласить настоящих участников")
    existing = db.scalar(select(User).where(User.email == email))
    if existing and db.get(Membership, (workspace_id, existing.id)):
        raise HTTPException(409, "Этот человек уже в команде")
    token = secrets.token_urlsafe(32)
    db.add(Invitation(
        workspace_id=workspace_id, email=email, role=payload.role,
        token_hash=token_hash(token), expires_at=now() + timedelta(days=7),
    ))
    db.commit()
    return {"token": token, "expires_in_days": 7, "email": email}


@router.post("/invitations/accept")
def accept_invitation(payload: InviteAccept, db: DB, user: CurrentUser):
    invitation = db.scalar(select(Invitation).where(
        Invitation.token_hash == token_hash(payload.token),
        Invitation.expires_at > now(), Invitation.accepted.is_(False),
    ))
    if not invitation:
        raise HTTPException(404, "Приглашение истекло или уже использовано")
    if invitation.email != user.email:
        raise HTTPException(403, "Приглашение адресовано другому email")
    if not db.get(Membership, (invitation.workspace_id, user.id)):
        db.add(Membership(
            workspace_id=invitation.workspace_id, user_id=user.id, role=invitation.role,
        ))
    invitation.accepted = True
    db.commit()
    return {"workspaces": workspace_data(db, user.id), "workspace_id": invitation.workspace_id}


@router.post("/plan-interest", status_code=201)
def plan_interest(payload: InterestCreate, db: DB, user: CurrentUser):
    if user.is_demo:
        raise HTTPException(422, "Зарегистрируйтесь, чтобы сохранить интерес к тарифу")
    if not db.scalar(select(PlanInterest).where(
        PlanInterest.user_id == user.id, PlanInterest.plan == payload.plan
    )):
        db.add(PlanInterest(user_id=user.id, plan=payload.plan))
        db.commit()
    return {"message": "Интерес сохранён в вашем аккаунте. Оплата не подключена."}
