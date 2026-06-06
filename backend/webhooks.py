"""
GitHub webhook handler
Handles incoming webhook events from GitHub, opens incidents, and schedules AI triage.
"""
import os
import hmac
import hashlib
import json
from typing import Any, Dict, Tuple

from fastapi import Request, HTTPException, BackgroundTasks
from dotenv import load_dotenv

from tracked_repos import get_repo_key, store_webhook_event, find_users_tracking_repo
from incidents import create_incident_if_needed, run_incident_ai_job

load_dotenv()

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET")


def verify_webhook_signature(payload_body: bytes, signature_header: str) -> bool:
    """
    Verify GitHub webhook signature using HMAC SHA256
    """
    if not GITHUB_WEBHOOK_SECRET:
        raise ValueError("GITHUB_WEBHOOK_SECRET not configured")

    if not signature_header:
        return False

    if not signature_header.startswith("sha256="):
        return False

    expected_signature = signature_header.replace("sha256=", "")

    mac = hmac.new(
        GITHUB_WEBHOOK_SECRET.encode("utf-8"),
        msg=payload_body,
        digestmod=hashlib.sha256,
    )
    calculated_signature = mac.hexdigest()

    return hmac.compare_digest(expected_signature, calculated_signature)


async def handle_github_webhook(
    request: Request, background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Handle incoming GitHub webhook
    """
    event_type = request.headers.get("X-GitHub-Event")
    delivery_id = request.headers.get("X-GitHub-Delivery")
    signature = request.headers.get("X-Hub-Signature-256")

    if not event_type:
        raise HTTPException(status_code=400, detail="Missing X-GitHub-Event header")

    if not delivery_id:
        raise HTTPException(status_code=400, detail="Missing X-GitHub-Delivery header")

    payload_body = await request.body()

    if GITHUB_WEBHOOK_SECRET:
        if not signature:
            raise HTTPException(
                status_code=401,
                detail="Missing X-Hub-Signature-256 (configure GitHub webhook with the same secret as GITHUB_WEBHOOK_SECRET)",
            )
        if not verify_webhook_signature(payload_body, signature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    else:
        print(
            "Warning: GITHUB_WEBHOOK_SECRET is not set; accepting unsigned webhooks (dev only)."
        )

    try:
        payload = json.loads(payload_body.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if event_type == "workflow_run":
        await handle_workflow_run_event(payload, delivery_id, background_tasks)

    return {"status": "ok", "event": event_type, "delivery": delivery_id}


def _owner_repo_from_repository(repository: Dict[str, Any]) -> Tuple[str, str]:
    owner_obj = repository.get("owner") or {}
    if isinstance(owner_obj, dict):
        owner = owner_obj.get("login") or ""
    else:
        owner = str(owner_obj or "")
    repo_name = repository.get("name") or ""
    return owner, repo_name


async def handle_workflow_run_event(
    payload: Dict[str, Any], delivery_id: str, background_tasks: BackgroundTasks
) -> None:
    """
    Persist raw event for tracked repos and open incidents on failed completed runs.
    """
    repository = payload.get("repository") or {}
    owner, repo_name = _owner_repo_from_repository(repository)
    if not owner or not repo_name:
        print("Warning: Could not extract owner/repo from workflow_run event")
        return

    repo_key = get_repo_key(owner, repo_name)

    try:
        await store_webhook_event(
            repo_key=repo_key,
            event_type="workflow_run",
            delivery_id=delivery_id,
            payload=payload,
        )
    except Exception as e:
        print(f"Error storing workflow_run event: {e}")

    wr = payload.get("workflow_run") or {}
    action = payload.get("action")
    status = wr.get("status")
    conclusion = wr.get("conclusion") or ""

    completed = action == "completed" and status == "completed"
    bad = conclusion in ("failure", "timed_out", "cancelled")

    if not (completed and bad):
        return

    wf_id = wr.get("workflow_id")
    try:
        users = find_users_tracking_repo(repo_key)
    except Exception as e:
        print(f"Error routing workflow_run: {e}")
        return

    for user_id, tracked in users:
        deploy_wf_id = tracked.get("deployWorkflowId")
        if deploy_wf_id is not None:
            try:
                if int(deploy_wf_id) != int(wf_id):
                    continue
            except (TypeError, ValueError):
                continue

        try:
            incident_id = await create_incident_if_needed(
                user_id=user_id,
                repo_key=repo_key,
                owner=owner,
                repo=repo_name,
                github_delivery_id=delivery_id,
                workflow_run=wr,
                repository=repository,
            )
        except Exception as e:
            print(f"Error creating incident for {user_id}: {e}")
            continue

        if incident_id:
            background_tasks.add_task(
                run_incident_ai_job, user_id, incident_id, payload
            )
