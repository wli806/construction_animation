from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(tags=["tasks"])


@router.get("/api/projects/{project_id}/tasks", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not crud.get_project(db, project_id, user.id):
        raise HTTPException(404, "项目不存在")
    return db.query(crud.models.Task).filter(
        crud.models.Task.project_id == project_id
    ).order_by(crud.models.Task.day).all()


@router.post("/api/projects/{project_id}/tasks", response_model=schemas.TaskOut, status_code=201)
def create_task(
    project_id: UUID,
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not crud.get_project(db, project_id, user.id):
        raise HTTPException(404, "项目不存在")
    return crud.create_task(db, task, project_id)


@router.put("/api/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: UUID,
    task: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    db_task = crud.update_task(db, task_id, task, user.id)
    if not db_task:
        raise HTTPException(404, "任务不存在")
    return db_task


@router.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not crud.delete_task(db, task_id, user.id):
        raise HTTPException(404, "任务不存在")
    return {"ok": True}
