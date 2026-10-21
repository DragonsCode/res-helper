from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Activity,
    Bookmark,
    Comment,
    Discussion,
    Membership,
    Project,
    Resource,
    Task,
    User,
    Vote,
    Workspace,
)


def user_data(user: User) -> dict:
    return {
        "id": user.id, "name": user.name, "email": user.email,
        "discipline": user.discipline, "bio": user.bio, "color": user.color,
        "is_demo": user.is_demo,
        "audience": user.audience,
    }


def public_user(user: User) -> dict:
    return {k: v for k, v in user_data(user).items() if k not in {"email", "is_demo"}}


def workspace_data(db: Session, user_id: str) -> list[dict]:
    rows = db.execute(select(Workspace, Membership.role).join(Membership).where(
        Membership.user_id == user_id
    ).order_by(Workspace.created_at)).all()
    return [{
        "id": w.id, "name": w.name, "description": w.description, "role": role, "is_demo": w.is_demo,
    } for w, role in rows]


def create_workspace(db: Session, user: User, name: str, is_demo: bool = False) -> Workspace:
    workspace = Workspace(name=name, is_demo=is_demo)
    db.add(workspace)
    db.flush()
    db.add(Membership(workspace_id=workspace.id, user_id=user.id, role="owner"))
    db.flush()
    return workspace


def require_entity(db: Session, model, entity_id: str, workspace_id: str):
    entity = db.get(model, entity_id)
    if entity is None or entity.workspace_id != workspace_id:
        raise HTTPException(404, "Запись не найдена")
    return entity


def validate_project(db: Session, project_id: str | None, workspace_id: str):
    if project_id:
        require_entity(db, Project, project_id, workspace_id)


def record_activity(db: Session, workspace_id: str, user_id: str, action: str, entity, kind: str):
    db.add(Activity(
        workspace_id=workspace_id, user_id=user_id, action=action,
        subject=entity.title, target_type=kind, target_id=entity.id,
    ))


def project_data(db: Session, project: Project) -> dict:
    tasks = db.scalars(select(Task).where(Task.project_id == project.id)).all()
    done = sum(t.status == "done" for t in tasks)
    return {
        "id": project.id, "title": project.title, "description": project.description,
        "field": project.field, "status": project.status, "color": project.color,
        "question": project.question, "method": project.method,
        "limitations": project.limitations, "conclusion": project.conclusion,
        "tags": project.tags, "due_date": project.due_date,
        "owner": public_user(db.get(User, project.owner_id)),
        "task_count": len(tasks), "completed_tasks": done,
        "progress": round(done / len(tasks) * 100) if tasks else 0,
        "created_at": project.created_at,
    }


def task_data(db: Session, task: Task) -> dict:
    project = db.get(Project, task.project_id) if task.project_id else None
    return {
        "id": task.id, "title": task.title, "status": task.status, "due_date": task.due_date,
        "project_id": task.project_id, "project_title": project.title if project else None,
        "assignee_id": task.assignee_id,
        "assignee": public_user(db.get(User, task.assignee_id)) if task.assignee_id else None,
    }


def resource_data(db: Session, resource: Resource, user_id: str) -> dict:
    return {
        "id": resource.id, "title": resource.title, "authors": resource.authors, "url": resource.url,
        "kind": resource.kind, "notes": resource.notes, "tags": resource.tags,
        "year": resource.year, "project_id": resource.project_id, "created_at": resource.created_at,
        "bookmarked": db.get(Bookmark, (user_id, resource.id)) is not None,
        "added_by": public_user(db.get(User, resource.added_by)),
    }


def discussion_data(db: Session, discussion: Discussion, user_id: str) -> dict:
    return {
        "id": discussion.id, "title": discussion.title, "body": discussion.body,
        "kind": discussion.kind, "tags": discussion.tags, "project_id": discussion.project_id,
        "created_at": discussion.created_at, "author": public_user(db.get(User, discussion.author_id)),
        "votes": db.scalar(select(func.count()).select_from(Vote).where(
            Vote.discussion_id == discussion.id
        )),
        "voted": db.get(Vote, (user_id, discussion.id)) is not None,
        "comment_count": db.scalar(select(func.count()).select_from(Comment).where(
            Comment.discussion_id == discussion.id
        )),
    }
