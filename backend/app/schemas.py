from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, StringConstraints

ShortText = Annotated[str, Field(min_length=1, max_length=160)]
Tags = Annotated[list[Annotated[str, Field(min_length=1, max_length=40)]], Field(max_length=8)]
Color = Literal["sage", "violet", "peach", "blue"]
Password = Annotated[str, StringConstraints(strip_whitespace=False, min_length=10, max_length=128)]
Audience = Literal["enthusiast", "journalist", "student", "teacher", "researcher"]


class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class Register(Input):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    email: EmailStr
    password: Password
    audience: Audience = "researcher"


class Login(Input):
    identifier: Annotated[str, Field(min_length=1, max_length=254)]
    password: Annotated[str, StringConstraints(strip_whitespace=False, min_length=1, max_length=128)]


class ProfileUpdate(Input):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    discipline: Annotated[str, Field(max_length=100)] = ""
    bio: Annotated[str, Field(max_length=1500)] = ""
    audience: Audience = "researcher"


class DemoStart(Input):
    audience: Audience = "researcher"


class WorkspaceUpdate(Input):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    description: Annotated[str, Field(max_length=1000)] = ""


class ProjectCreate(Input):
    title: ShortText
    description: Annotated[str, Field(max_length=5000)] = ""
    field: Annotated[str, Field(min_length=1, max_length=80)] = "Междисциплинарное"
    status: Literal["planned", "active", "completed", "archived"] = "active"
    color: Color = "sage"
    tags: Tags = []
    due_date: date | None = None


class ResearchProtocol(Input):
    question: Annotated[str, Field(max_length=5000)] = ""
    method: Annotated[str, Field(max_length=10000)] = ""
    limitations: Annotated[str, Field(max_length=10000)] = ""
    conclusion: Annotated[str, Field(max_length=10000)] = ""


class TaskCreate(Input):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    project_id: str | None = None
    assignee_id: str | None = None
    due_date: date | None = None
    status: Literal["todo", "in_progress", "done"] = "todo"


class TaskUpdate(Input):
    status: Literal["todo", "in_progress", "done"]


class ResourceCreate(Input):
    title: Annotated[str, Field(min_length=1, max_length=240)]
    authors: Annotated[str, Field(max_length=200)] = ""
    url: HttpUrl | None = None
    kind: Literal["paper", "dataset", "note", "link"] = "paper"
    notes: Annotated[str, Field(max_length=10000)] = ""
    tags: Tags = []
    year: Annotated[int, Field(ge=1500, le=2100)] | None = None
    project_id: str | None = None


class DiscussionCreate(Input):
    title: Annotated[str, Field(min_length=1, max_length=200)]
    body: Annotated[str, Field(min_length=1, max_length=20000)]
    kind: Literal["discussion", "question", "finding"] = "discussion"
    tags: Tags = []
    project_id: str | None = None


class CommentCreate(Input):
    body: Annotated[str, Field(min_length=1, max_length=5000)]


class InviteCreate(Input):
    email: EmailStr
    role: Literal["member", "viewer"] = "member"


class InviteAccept(Input):
    token: Annotated[str, Field(min_length=20, max_length=200)]


class InterestCreate(Input):
    plan: Literal["education", "team", "institution"]
