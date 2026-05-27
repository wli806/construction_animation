from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID
from datetime import datetime, date


# ── Auth ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: UUID
    username: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Resource ────────────────────────────────────────────────────────────────

class ResourceBase(BaseModel):
    type: str          # worker / machine / material
    name: str = ""
    count: int = 1


class ResourceCreate(ResourceBase):
    pass


class ResourceOut(ResourceBase):
    id: UUID

    model_config = {"from_attributes": True}


# ── Task ─────────────────────────────────────────────────────────────────────

class TaskBase(BaseModel):
    day: int
    name: str
    type: str = "other"
    notes: str = ""


class TaskCreate(TaskBase):
    resources: List[ResourceCreate] = []


class TaskUpdate(TaskBase):
    resources: List[ResourceCreate] = []


class TaskOut(TaskBase):
    id: UUID
    project_id: UUID
    resources: List[ResourceOut] = []

    model_config = {"from_attributes": True}


# ── Project ──────────────────────────────────────────────────────────────────

class ProjectBase(BaseModel):
    name: str
    description: str = ""
    location: str = ""
    start_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(ProjectBase):
    pass


class ProjectOut(ProjectBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    task_count: int = 0

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectOut):
    tasks: List[TaskOut] = []
