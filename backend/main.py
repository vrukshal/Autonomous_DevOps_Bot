"""
FastAPI backend for DevOps Bot
Handles GitHub OAuth flow and repository management
"""
from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    Header,
    APIRouter,
    Request,
    BackgroundTasks,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from typing import Optional
import os
from dotenv import load_dotenv

from auth import verify_firebase_token, get_user_id
from github_oauth import (
    start_github_oauth,
    handle_github_callback,
    get_github_repos,
    disconnect_github,
    get_github_status,
)
from tracked_repos import (
    create_tracked_repo,
    get_tracked_repos,
    update_tracked_repo,
    delete_tracked_repo,
    get_tracked_repo,
)
from github_api import get_github_workflows, create_workflow_run_webhook
from webhooks import handle_github_webhook
from pydantic import BaseModel

from incidents import (
    list_incidents,
    get_incident,
    update_incident_status,
    run_incident_ai_job,
    update_incident_ai,
)
from integrations import get_integrations_status, get_webhook_callback_url

load_dotenv()

app = FastAPI(title="DevOps Bot API")

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_current_user(authorization: Optional[str] = Header(None)):
    """
    Dependency to verify Firebase ID token from Authorization header
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    try:
        # Extract token from "Bearer <token>"
        token = authorization.replace("Bearer ", "")
        decoded_token = verify_firebase_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


@app.get("/")
async def root():
    return {"message": "DevOps Bot API"}


@api_router.get("/auth/github/start")
async def github_start(current_user: dict = Depends(get_current_user)):
    """
    Start GitHub OAuth flow
    Returns the GitHub authorization URL
    """
    try:
        user_id = get_user_id(current_user)
        auth_url = await start_github_oauth(user_id)
        return {"authUrl": auth_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/auth/github/callback")
async def github_callback(
    code: str,
    state: str,
):
    """
    Handle GitHub OAuth callback
    Exchanges code for access token and stores it encrypted
    """
    try:
        redirect_url = await handle_github_callback(code, state)
        return RedirectResponse(url=redirect_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/github/status")
async def github_status(current_user: dict = Depends(get_current_user)):
    """
    Get GitHub connection status for the current user
    """
    try:
        user_id = get_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        status = await get_github_status(user_id)
        return status
    except HTTPException:
        raise
    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"Error in github_status endpoint: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@api_router.get("/github/repos")
async def github_repos(current_user: dict = Depends(get_current_user)):
    """
    Get list of GitHub repositories for the connected user
    """
    try:
        user_id = get_user_id(current_user)
        repos = await get_github_repos(user_id)
        return repos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/github/disconnect")
async def github_disconnect(current_user: dict = Depends(get_current_user)):
    """
    Disconnect GitHub integration for the current user
    """
    try:
        user_id = get_user_id(current_user)
        await disconnect_github(user_id)
        return {"message": "GitHub disconnected successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Tracked Repos Models
class CreateTrackedRepoRequest(BaseModel):
    owner: str
    repo: str
    repoId: int
    defaultBranch: str


class UpdateTrackedRepoRequest(BaseModel):
    environment: Optional[str] = None
    deployWorkflowId: Optional[int] = None
    deployWorkflowName: Optional[str] = None


# Tracked Repos Endpoints
@api_router.post("/tracked-repos")
async def create_tracked_repo_endpoint(
    request: CreateTrackedRepoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new tracked repository
    """
    try:
        user_id = get_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
        
        tracked_repo = await create_tracked_repo(
            user_id=user_id,
            owner=request.owner,
            repo=request.repo,
            repo_id=request.repoId,
            default_branch=request.defaultBranch
        )
        return tracked_repo
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/tracked-repos")
async def get_tracked_repos_endpoint(current_user: dict = Depends(get_current_user)):
    """
    Get all tracked repositories for the current user
    """
    try:
        user_id = get_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
        
        repos = await get_tracked_repos(user_id)
        return repos
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.patch("/tracked-repos/{repo_key}")
async def update_tracked_repo_endpoint(
    repo_key: str,
    request: UpdateTrackedRepoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update tracked repository settings
    """
    try:
        user_id = get_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
        
        updates = {}
        if request.environment is not None:
            updates["environment"] = request.environment
        if request.deployWorkflowId is not None:
            updates["deployWorkflowId"] = request.deployWorkflowId
        if request.deployWorkflowName is not None:
            updates["deployWorkflowName"] = request.deployWorkflowName
        
        updated_repo = await update_tracked_repo(user_id, repo_key, updates)
        return updated_repo
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.delete("/tracked-repos/{repo_key}")
async def delete_tracked_repo_endpoint(
    repo_key: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete (untrack) a repository
    """
    try:
        user_id = get_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
        
        await delete_tracked_repo(user_id, repo_key)
        return {"message": "Repository untracked successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# GitHub API Endpoints
@api_router.get("/github/workflows")
async def get_workflows_endpoint(
    owner: str,
    repo: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get GitHub Actions workflows for a repository
    """
    try:
        user_id = get_user_id(current_user)
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found")
        
        workflows = await get_github_workflows(owner, repo, user_id)
        return workflows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UpdateIncidentRequest(BaseModel):
    status: str


# Integrations & incidents
@api_router.get("/integrations/status")
async def integrations_status(current_user: dict = Depends(get_current_user)):
    _ = get_user_id(current_user)
    return get_integrations_status()


@api_router.post("/tracked-repos/{repo_key}/github-webhook")
async def register_github_webhook_for_repo(
    repo_key: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Create a GitHub repo webhook for workflow_run events (requires WEBHOOK_PUBLIC_URL and GITHUB_WEBHOOK_SECRET).
    """
    user_id = get_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")

    tracked = await get_tracked_repo(user_id, repo_key)
    if not tracked or not tracked.get("isTracked"):
        raise HTTPException(status_code=404, detail="Tracked repository not found")

    callback = get_webhook_callback_url()
    if not callback:
        raise HTTPException(
            status_code=400,
            detail="Set WEBHOOK_PUBLIC_URL in the backend environment to your public API base (e.g. https://xxxx.ngrok-free.app)",
        )

    secret = os.getenv("GITHUB_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status_code=400,
            detail="Set GITHUB_WEBHOOK_SECRET so GitHub can sign webhook deliveries",
        )

    owner = tracked.get("owner")
    repo = tracked.get("repo")
    if not owner or not repo:
        raise HTTPException(status_code=400, detail="Invalid tracked repo document")

    try:
        result = await create_workflow_run_webhook(
            owner, repo, user_id, callback, secret
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/incidents")
async def incidents_list(current_user: dict = Depends(get_current_user)):
    user_id = get_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    try:
        return await list_incidents(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/incidents/{incident_id}")
async def incidents_get(incident_id: str, current_user: dict = Depends(get_current_user)):
    user_id = get_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    doc = await get_incident(user_id, incident_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Incident not found")
    return doc


@api_router.patch("/incidents/{incident_id}")
async def incidents_patch(
    incident_id: str,
    body: UpdateIncidentRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = get_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    try:
        return await update_incident_status(user_id, incident_id, body.status)
    except ValueError as e:
        msg = str(e).lower()
        if "not found" in msg:
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/incidents/{incident_id}/analyze")
async def incidents_reanalyze(
    incident_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Re-run guardrailed AI triage using the incident snapshot (lighter than full webhook payload)."""
    user_id = get_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")

    inc = await get_incident(user_id, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    repo_owner = inc.get("owner")
    repo_name = inc.get("repo")
    synthetic = {
        "repository": {
            "full_name": inc.get("repositoryFullName") or f"{repo_owner}/{repo_name}",
            "name": repo_name,
            "owner": {"login": repo_owner},
        },
        "workflow_run": {
            "id": inc.get("workflowRunId"),
            "name": inc.get("workflowName"),
            "conclusion": inc.get("conclusion"),
            "head_branch": inc.get("branch"),
            "html_url": inc.get("htmlUrl"),
            "status": "completed",
        },
    }

    await update_incident_ai(
        user_id,
        incident_id,
        ai_status="pending",
        clear_ai_fields=True,
    )
    background_tasks.add_task(run_incident_ai_job, user_id, incident_id, synthetic)
    return {"queued": True}


# Webhook Endpoints (no auth required - uses signature verification)
@api_router.post("/webhooks/github")
async def github_webhook_endpoint(
    request: Request, background_tasks: BackgroundTasks
):
    """
    Handle GitHub webhook events
    """
    try:
        result = await handle_github_webhook(request, background_tasks)
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback

        print(f"Error handling webhook: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# Include API router
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
