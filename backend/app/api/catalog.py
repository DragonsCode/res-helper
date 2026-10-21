from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.dependencies import DB, CurrentUser, Writer
from app.models import Project, ReadingProgress, Resource, Task
from app.services.catalog import CATALOG, find_article
from app.services.workspaces import project_data, record_activity, resource_data

router = APIRouter(tags=["Discovery and learning"])


def article_or_404(item_id: str):
    item = find_article(item_id)
    if not item:
        raise HTTPException(404, "Материал не найден")
    return item


@router.get("/catalog")
def catalog():
    return [{key: value for key, value in item.items() if key not in {"body", "sources"}} for item in CATALOG]


@router.get("/reading-progress")
def reading_progress(db: DB, user: CurrentUser):
    return list(db.scalars(select(ReadingProgress.item_id).where(ReadingProgress.user_id == user.id)).all())


@router.get("/catalog/{item_id}")
def article(item_id: str):
    return article_or_404(item_id)


@router.put("/catalog/{item_id}/read", status_code=204)
def mark_read(item_id: str, db: DB, user: CurrentUser):
    article_or_404(item_id)
    if not db.get(ReadingProgress, (user.id, item_id)):
        db.add(ReadingProgress(user_id=user.id, item_id=item_id))
        db.commit()


@router.delete("/catalog/{item_id}/read", status_code=204)
def unread(item_id: str, db: DB, user: CurrentUser):
    article_or_404(item_id)
    item = db.get(ReadingProgress, (user.id, item_id))
    if item:
        db.delete(item)
        db.commit()


@router.post("/workspaces/{workspace_id}/catalog/{item_id}/save")
def save_article(workspace_id: str, item_id: str, db: DB, member: Writer, user: CurrentUser):
    item = article_or_404(item_id)
    existing = db.scalar(select(Resource).where(
        Resource.workspace_id == workspace_id, Resource.catalog_id == item_id
    ))
    if existing:
        return resource_data(db, existing, user.id)
    resource = Resource(
        workspace_id=workspace_id, added_by=user.id, title=item["title"],
        authors="Re:Search · редакционный стартовый материал", kind="note",
        notes="\n\n".join(f'{part["heading"]}\n{part["text"]}' for part in item["body"])
              + "\n\nИсточники:\n" + "\n".join(f'{s["title"]}: {s["url"]}' for s in item["sources"]),
        url=item["sources"][0]["url"], tags=item["tags"], catalog_id=item_id,
    )
    db.add(resource)
    db.flush()
    record_activity(db, workspace_id, user.id, "сохраняет материал", resource, "resource")
    db.commit()
    return resource_data(db, resource, user.id)


@router.post("/workspaces/{workspace_id}/catalog/{item_id}/project", status_code=201)
def start_learning_project(workspace_id: str, item_id: str, db: DB, member: Writer, user: CurrentUser):
    item = article_or_404(item_id)
    if not item["steps"]:
        raise HTTPException(422, "У этого материала нет проектного маршрута")
    project = Project(
        workspace_id=workspace_id, owner_id=user.id, title=item["title"],
        description=item["subtitle"], field=item["field"], color=item["color"], tags=item["tags"],
    )
    db.add(project)
    db.flush()
    for step in item["steps"]:
        db.add(Task(
            workspace_id=workspace_id, project_id=project.id, title=step,
            status="todo", assignee_id=user.id,
        ))
    record_activity(db, workspace_id, user.id, "начинает проект по маршруту", project, "project")
    db.commit()
    return project_data(db, project)
