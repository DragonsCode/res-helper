from datetime import UTC, date, datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def new_id() -> str:
    return str(uuid4())


def now() -> datetime:
    return datetime.now(UTC)


class Entity:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class User(Entity, Base):
    __tablename__ = "users"
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    password_hash: Mapped[str] = mapped_column(String(300))
    discipline: Mapped[str] = mapped_column(String(100), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(20), default="sage")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    legacy_username: Mapped[str | None] = mapped_column(String(150), unique=True)
    audience: Mapped[str] = mapped_column(String(20), default="researcher")


class LoginSession(Entity, Base):
    __tablename__ = "login_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Workspace(Entity, Base):
    __tablename__ = "workspaces"
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text, default="")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)


class Membership(Base):
    __tablename__ = "memberships"
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Project(Entity, Base):
    __tablename__ = "projects"
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    question: Mapped[str] = mapped_column(Text, default="", server_default="")
    method: Mapped[str] = mapped_column(Text, default="", server_default="")
    limitations: Mapped[str] = mapped_column(Text, default="", server_default="")
    conclusion: Mapped[str] = mapped_column(Text, default="", server_default="")
    field: Mapped[str] = mapped_column(String(80), default="Междисциплинарное")
    status: Mapped[str] = mapped_column(String(20), default="active")
    color: Mapped[str] = mapped_column(String(20), default="sage")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    due_date: Mapped[date | None] = mapped_column(Date)


class Task(Entity, Base):
    __tablename__ = "tasks"
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    assignee_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20), default="todo")
    due_date: Mapped[date | None] = mapped_column(Date)


class Resource(Entity, Base):
    __tablename__ = "resources"
    __table_args__ = (UniqueConstraint("workspace_id", "catalog_id"),)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    added_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(240))
    authors: Mapped[str] = mapped_column(String(200), default="")
    url: Mapped[str] = mapped_column(String(2000), default="")
    kind: Mapped[str] = mapped_column(String(20), default="paper")
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    year: Mapped[int | None] = mapped_column(Integer)
    catalog_id: Mapped[str | None] = mapped_column(String(100))


class Bookmark(Base):
    __tablename__ = "bookmarks"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    resource_id: Mapped[str] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True
    )


class Discussion(Entity, Base):
    __tablename__ = "discussions"
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(20), default="discussion")
    tags: Mapped[list] = mapped_column(JSON, default=list)


class Comment(Entity, Base):
    __tablename__ = "comments"
    discussion_id: Mapped[str] = mapped_column(
        ForeignKey("discussions.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)


class Vote(Base):
    __tablename__ = "votes"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    discussion_id: Mapped[str] = mapped_column(
        ForeignKey("discussions.id", ondelete="CASCADE"), primary_key=True
    )


class Activity(Entity, Base):
    __tablename__ = "activities"
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(100))
    subject: Mapped[str] = mapped_column(String(240))
    target_type: Mapped[str] = mapped_column(String(20), default="")
    target_id: Mapped[str] = mapped_column(String(36), default="")


class Invitation(Entity, Base):
    __tablename__ = "invitations"
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(254))
    role: Mapped[str] = mapped_column(String(20))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    accepted: Mapped[bool] = mapped_column(Boolean, default=False)


class PlanInterest(Entity, Base):
    __tablename__ = "plan_interests"
    __table_args__ = (UniqueConstraint("user_id", "plan"),)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    plan: Mapped[str] = mapped_column(String(20))


class LegacyMapping(Base):
    __tablename__ = "legacy_mappings"
    source_key: Mapped[str] = mapped_column(String(160), primary_key=True)
    target_id: Mapped[str] = mapped_column(String(36))


class ReadingProgress(Base):
    __tablename__ = "reading_progress"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    item_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
