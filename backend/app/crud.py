from sqlalchemy.orm import Session
from uuid import UUID
from . import models, schemas
from .auth import hash_password


# ── Users ──────────────────────────────────────────────────────────────────

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ── Projects ───────────────────────────────────────────────────────────────

def get_projects(db: Session, user_id: UUID):
    projects = (
        db.query(models.Project)
        .filter(models.Project.user_id == user_id)
        .order_by(models.Project.created_at.desc())
        .all()
    )
    for p in projects:
        p.task_count = len(p.tasks)
    return projects


def get_project(db: Session, project_id: UUID, user_id: UUID):
    return (
        db.query(models.Project)
        .filter(models.Project.id == project_id, models.Project.user_id == user_id)
        .first()
    )


def create_project(db: Session, project: schemas.ProjectCreate, user_id: UUID) -> models.Project:
    db_proj = models.Project(**project.model_dump(), user_id=user_id)
    db.add(db_proj)
    db.commit()
    db.refresh(db_proj)
    db_proj.task_count = 0
    return db_proj


def update_project(db: Session, project_id: UUID, data: schemas.ProjectUpdate, user_id: UUID):
    db_proj = get_project(db, project_id, user_id)
    if not db_proj:
        return None
    for k, v in data.model_dump().items():
        setattr(db_proj, k, v)
    db.commit()
    db.refresh(db_proj)
    db_proj.task_count = len(db_proj.tasks)
    return db_proj


def delete_project(db: Session, project_id: UUID, user_id: UUID) -> bool:
    db_proj = get_project(db, project_id, user_id)
    if not db_proj:
        return False
    db.delete(db_proj)
    db.commit()
    return True


# ── Tasks ──────────────────────────────────────────────────────────────────

def get_task(db: Session, task_id: UUID):
    return db.query(models.Task).filter(models.Task.id == task_id).first()


def create_task(db: Session, task: schemas.TaskCreate, project_id: UUID) -> models.Task:
    resources_data = task.resources
    task_dict = task.model_dump(exclude={"resources"})
    db_task = models.Task(**task_dict, project_id=project_id)
    db.add(db_task)
    db.flush()
    for res in resources_data:
        db.add(models.Resource(**res.model_dump(), task_id=db_task.id))
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: UUID, task: schemas.TaskUpdate, user_id: UUID):
    db_task = get_task(db, task_id)
    if not db_task or db_task.project.user_id != user_id:
        return None
    for k, v in task.model_dump(exclude={"resources"}).items():
        setattr(db_task, k, v)
    for res in list(db_task.resources):
        db.delete(res)
    db.flush()
    for res in task.resources:
        db.add(models.Resource(**res.model_dump(), task_id=task_id))
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: UUID, user_id: UUID) -> bool:
    db_task = get_task(db, task_id)
    if not db_task or db_task.project.user_id != user_id:
        return False
    db.delete(db_task)
    db.commit()
    return True
