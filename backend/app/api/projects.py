from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from app.api.dependencies import DB, CurrentUser, Member, Writer
from app.models import Membership, Project, Task
from app.schemas import ProjectCreate, ResearchProtocol, TaskCreate, TaskUpdate
from app.services.workspaces import (
    project_data,
    record_activity,
    require_entity,
    task_data,
    validate_project,
)

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["Projects and tasks"])


@router.get("/projects")
def projects(workspace_id: str, db: DB, member: Member, limit: int = Query(100, ge=1, le=200)):
    rows = db.scalars(select(Project).where(Project.workspace_id == workspace_id).order_by(
        Project.created_at.desc()
    ).limit(limit)).all()
    return [project_data(db, p) for p in rows]


@router.post("/projects", status_code=201)
def create_project(workspace_id: str, payload: ProjectCreate, db: DB, member: Writer, user: CurrentUser):
    project = Project(workspace_id=workspace_id, owner_id=user.id, **payload.model_dump())
    db.add(project)
    db.flush()
    record_activity(db, workspace_id, user.id, "создаёт проект", project, "project")
    db.commit()
    return project_data(db, project)


@router.get("/projects/{project_id}")
def project(workspace_id: str, project_id: str, db: DB, member: Member):
    return project_data(db, require_entity(db, Project, project_id, workspace_id))


@router.put("/projects/{project_id}")
def update_project(workspace_id: str, project_id: str, payload: ProjectCreate, db: DB, member: Writer, user: CurrentUser):
    project = require_entity(db, Project, project_id, workspace_id)
    if project.owner_id != user.id and member.role != "owner":
        raise HTTPException(403, "Изменять проект может его автор или владелец пространства")
    for key, value in payload.model_dump().items():
        setattr(project, key, value)
    record_activity(db, workspace_id, user.id, "обновляет проект", project, "project")
    db.commit()
    return project_data(db, project)


@router.get("/tasks")
def tasks(workspace_id: str, db: DB, member: Member, project_id: str | None = None, limit: int = Query(200, ge=1, le=500)):
    query = select(Task).where(Task.workspace_id == workspace_id)
    if project_id:
        validate_project(db, project_id, workspace_id)
        query = query.where(Task.project_id == project_id)
    rows = db.scalars(query.order_by(Task.due_date.asc(), Task.created_at.desc()).limit(limit)).all()
    return [task_data(db, t) for t in rows]


@router.post("/tasks", status_code=201)
def create_task(workspace_id: str, payload: TaskCreate, db: DB, member: Writer, user: CurrentUser):
    validate_project(db, payload.project_id, workspace_id)
    if payload.assignee_id and not db.get(Membership, (workspace_id, payload.assignee_id)):
        raise HTTPException(422, "Исполнитель должен быть участником пространства")
    task = Task(workspace_id=workspace_id, **payload.model_dump())
    db.add(task)
    db.flush()
    record_activity(db, workspace_id, user.id, "добавляет задачу", task, "task")
    db.commit()
    return task_data(db, task)


@router.patch("/tasks/{task_id}")
def update_task(workspace_id: str, task_id: str, payload: TaskUpdate, db: DB, member: Writer, user: CurrentUser):
    task = require_entity(db, Task, task_id, workspace_id)
    if task.status != payload.status:
        task.status = payload.status
        record_activity(db, workspace_id, user.id,
                        "завершает задачу" if task.status == "done" else "обновляет задачу", task, "task")
    db.commit()
    return task_data(db, task)


@router.patch("/projects/{project_id}/protocol")
def update_protocol(workspace_id: str, project_id: str, payload: ResearchProtocol,
                    db: DB, member: Writer, user: CurrentUser):
    project = require_entity(db, Project, project_id, workspace_id)
    if project.owner_id != user.id and member.role != "owner":
        raise HTTPException(403, "Изменять паспорт может автор проекта или владелец пространства")
    for key, value in payload.model_dump().items():
        setattr(project, key, value)
    record_activity(db, workspace_id, user.id, "обновляет паспорт исследования", project, "project")
    db.commit()
    return project_data(db, project)
