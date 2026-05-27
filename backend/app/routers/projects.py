from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from .. import crud, schemas
from ..auth import get_current_user
from ..database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return crud.get_projects(db, user.id)


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    project: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return crud.create_project(db, project, user.id)


@router.get("/{project_id}", response_model=schemas.ProjectDetail)
def get_project(project_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    proj = crud.get_project(db, project_id, user.id)
    if not proj:
        raise HTTPException(404, "项目不存在")
    proj.task_count = len(proj.tasks)
    return proj


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: UUID,
    project: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    proj = crud.update_project(db, project_id, project, user.id)
    if not proj:
        raise HTTPException(404, "项目不存在")
    return proj


@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not crud.delete_project(db, project_id, user.id):
        raise HTTPException(404, "项目不存在")
    return {"ok": True}
