"""Deploy endpoint — commit generated artifacts to GitHub.

Uses the server-held GITHUB_TOKEN. The browser only sends the files and target
repo details; it never handles the token.
"""
from __future__ import annotations

from fastapi import APIRouter

from ..models import DeployRequest, DeployResponse
from ..services.github_deploy import commit_files

router = APIRouter(prefix="/deploy", tags=["deploy"])


@router.post("/github", response_model=DeployResponse)
async def deploy_to_github(req: DeployRequest) -> DeployResponse:
    result = await commit_files(
        files=req.files,
        repository=req.repository,
        branch=req.branch,
        directory=req.directory,
        commit_message=req.commit_message,
    )
    return DeployResponse(**result)
