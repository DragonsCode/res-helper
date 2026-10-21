from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.dependencies import DB, CurrentUser, Member, Writer
from app.models import Bookmark, Comment, Discussion, Resource, User, Vote
from app.schemas import CommentCreate, DiscussionCreate, ResourceCreate
from app.services.workspaces import (
    discussion_data,
    public_user,
    record_activity,
    require_entity,
    resource_data,
    validate_project,
)

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["Knowledge"])


@router.get("/resources")
def resources(workspace_id: str, db: DB, member: Member, user: CurrentUser, limit: int = Query(100, ge=1, le=200)):
    rows = db.scalars(select(Resource).where(Resource.workspace_id == workspace_id).order_by(
        Resource.created_at.desc()
    ).limit(limit)).all()
    return [resource_data(db, r, user.id) for r in rows]


@router.post("/resources", status_code=201)
def create_resource(workspace_id: str, payload: ResourceCreate, db: DB, member: Writer, user: CurrentUser):
    validate_project(db, payload.project_id, workspace_id)
    data = payload.model_dump(exclude={"url"})
    resource = Resource(workspace_id=workspace_id, added_by=user.id,
                        url=str(payload.url) if payload.url else "", **data)
    db.add(resource)
    db.flush()
    record_activity(db, workspace_id, user.id, "добавляет материал", resource, "resource")
    db.commit()
    return resource_data(db, resource, user.id)


@router.put("/resources/{resource_id}")
def update_resource(workspace_id: str, resource_id: str, payload: ResourceCreate, db: DB, member: Writer, user: CurrentUser):
    resource = require_entity(db, Resource, resource_id, workspace_id)
    if resource.added_by != user.id and member.role != "owner":
        raise HTTPException(403, "Изменять материал может его автор или владелец пространства")
    validate_project(db, payload.project_id, workspace_id)
    for key, value in payload.model_dump(exclude={"url"}).items():
        setattr(resource, key, value)
    resource.url = str(payload.url) if payload.url else ""
    db.commit()
    return resource_data(db, resource, user.id)


@router.put("/resources/{resource_id}/bookmark")
def bookmark(workspace_id: str, resource_id: str, db: DB, member: Member, user: CurrentUser):
    resource = require_entity(db, Resource, resource_id, workspace_id)
    if not db.get(Bookmark, (user.id, resource_id)):
        db.add(Bookmark(user_id=user.id, resource_id=resource_id))
        db.commit()
    return resource_data(db, resource, user.id)


@router.delete("/resources/{resource_id}/bookmark", status_code=204)
def unbookmark(workspace_id: str, resource_id: str, db: DB, member: Member, user: CurrentUser):
    require_entity(db, Resource, resource_id, workspace_id)
    item = db.get(Bookmark, (user.id, resource_id))
    if item:
        db.delete(item)
        db.commit()


@router.get("/discussions")
def discussions(workspace_id: str, db: DB, member: Member, user: CurrentUser, limit: int = Query(100, ge=1, le=200)):
    rows = db.scalars(select(Discussion).where(Discussion.workspace_id == workspace_id).order_by(
        Discussion.created_at.desc()
    ).limit(limit)).all()
    return [discussion_data(db, d, user.id) for d in rows]


@router.post("/discussions", status_code=201)
def create_discussion(workspace_id: str, payload: DiscussionCreate, db: DB, member: Writer, user: CurrentUser):
    validate_project(db, payload.project_id, workspace_id)
    discussion = Discussion(workspace_id=workspace_id, author_id=user.id, **payload.model_dump())
    db.add(discussion)
    db.flush()
    record_activity(db, workspace_id, user.id, "начинает обсуждение", discussion, "discussion")
    db.commit()
    return discussion_data(db, discussion, user.id)


@router.get("/discussions/{discussion_id}")
def discussion(workspace_id: str, discussion_id: str, db: DB, member: Member, user: CurrentUser):
    item = require_entity(db, Discussion, discussion_id, workspace_id)
    comments = db.scalars(select(Comment).where(Comment.discussion_id == discussion_id).order_by(
        Comment.created_at
    )).all()
    return {
        **discussion_data(db, item, user.id),
        "comments": [{
            "id": c.id, "body": c.body, "created_at": c.created_at,
            "author": public_user(db.get(User, c.author_id)),
        } for c in comments],
    }


@router.post("/discussions/{discussion_id}/comments", status_code=201)
def comment(workspace_id: str, discussion_id: str, payload: CommentCreate, db: DB, member: Writer, user: CurrentUser):
    item = require_entity(db, Discussion, discussion_id, workspace_id)
    db.add(Comment(discussion_id=discussion_id, author_id=user.id, body=payload.body))
    record_activity(db, workspace_id, user.id, "отвечает в обсуждении", item, "discussion")
    db.commit()
    return discussion(workspace_id, discussion_id, db, member, user)


@router.put("/discussions/{discussion_id}/vote")
def vote(workspace_id: str, discussion_id: str, db: DB, member: Writer, user: CurrentUser):
    item = require_entity(db, Discussion, discussion_id, workspace_id)
    if not db.get(Vote, (user.id, discussion_id)):
        db.add(Vote(user_id=user.id, discussion_id=discussion_id))
        db.commit()
    return discussion_data(db, item, user.id)


@router.delete("/discussions/{discussion_id}/vote", status_code=204)
def unvote(workspace_id: str, discussion_id: str, db: DB, member: Writer, user: CurrentUser):
    require_entity(db, Discussion, discussion_id, workspace_id)
    item = db.get(Vote, (user.id, discussion_id))
    if item:
        db.delete(item)
        db.commit()
