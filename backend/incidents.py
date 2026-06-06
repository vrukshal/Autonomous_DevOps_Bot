"""
Incidents: CI failures for tracked repos, optional AI triage stored in Firestore.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from google.cloud import firestore

from auth import db


def _incidents_col(user_id: str):
    return db.collection("users").document(user_id).collection("incidents")


def incident_doc_id(user_id: str, github_delivery_id: str) -> str:
    """Stable id so webhook retries stay idempotent per user."""
    return f"{user_id}_{github_delivery_id}".replace("/", "_")


def _serialize_value(val: Any) -> Any:
    if hasattr(val, "isoformat"):
        try:
            return val.isoformat()
        except Exception:
            return str(val)
    if isinstance(val, dict):
        return {k: _serialize_value(v) for k, v in val.items()}
    if isinstance(val, list):
        return [_serialize_value(v) for v in val]
    return val


def serialize_incident(doc_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(data)
    out["id"] = doc_id
    for key in list(out.keys()):
        out[key] = _serialize_value(out[key])
    return out


async def create_incident_if_needed(
    user_id: str,
    repo_key: str,
    owner: str,
    repo: str,
    github_delivery_id: str,
    workflow_run: Dict[str, Any],
    repository: Dict[str, Any],
) -> Optional[str]:
    """
    Create incident document if it does not exist. Returns incident id or None if skipped.
    """
    if db is None:
        raise RuntimeError("Firestore not initialized")

    iid = incident_doc_id(user_id, github_delivery_id)
    ref = _incidents_col(user_id).document(iid)
    if ref.get().exists:
        return iid

    wr = workflow_run or {}
    now = datetime.utcnow()
    doc = {
        "repoKey": repo_key,
        "owner": owner,
        "repo": repo,
        "githubDeliveryId": github_delivery_id,
        "workflowRunId": wr.get("id"),
        "workflowName": wr.get("name"),
        "workflowPath": wr.get("path"),
        "conclusion": wr.get("conclusion"),
        "branch": wr.get("head_branch"),
        "htmlUrl": wr.get("html_url"),
        "repositoryFullName": (repository or {}).get("full_name"),
        "status": "open",
        "aiStatus": "pending",
        "aiAnalysis": None,
        "aiError": None,
        "createdAt": now,
        "updatedAt": now,
        "source": "github_webhook",
        "eventType": "workflow_run",
        "payloadSnapshot": {
            "workflow_run": {
                "id": wr.get("id"),
                "name": wr.get("name"),
                "conclusion": wr.get("conclusion"),
                "head_branch": wr.get("head_branch"),
                "html_url": wr.get("html_url"),
            }
        },
    }
    ref.set(doc)
    return iid


async def update_incident_ai(
    user_id: str,
    incident_id: str,
    *,
    ai_status: str,
    ai_analysis: Optional[Dict[str, Any]] = None,
    ai_error: Optional[str] = None,
    clear_ai_fields: bool = False,
) -> None:
    if db is None:
        return
    ref = _incidents_col(user_id).document(incident_id)
    patch: Dict[str, Any] = {
        "aiStatus": ai_status,
        "updatedAt": datetime.utcnow(),
    }
    if clear_ai_fields:
        patch["aiAnalysis"] = None
        patch["aiError"] = None
    if ai_analysis is not None:
        patch["aiAnalysis"] = ai_analysis
    if ai_error is not None:
        patch["aiError"] = ai_error
    elif ai_status == "completed":
        patch["aiError"] = None
    ref.update(patch)


async def list_incidents(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    if db is None:
        raise RuntimeError("Firestore not initialized")
    col = _incidents_col(user_id)
    snaps = list(col.stream())

    def sort_key(s: firestore.DocumentSnapshot):
        data = s.to_dict() or {}
        ts = data.get("createdAt")
        if hasattr(ts, "timestamp"):
            return ts.timestamp()
        return 0.0

    snaps.sort(key=sort_key, reverse=True)
    out: List[Dict[str, Any]] = []
    for snap in snaps[:limit]:
        data = snap.to_dict() or {}
        out.append(serialize_incident(snap.id, data))
    return out


async def get_incident(user_id: str, incident_id: str) -> Optional[Dict[str, Any]]:
    if db is None:
        raise RuntimeError("Firestore not initialized")
    snap = _incidents_col(user_id).document(incident_id).get()
    if not snap.exists:
        return None
    return serialize_incident(snap.id, snap.to_dict() or {})


async def run_incident_ai_job(
    user_id: str, incident_id: str, raw_payload: Dict[str, Any]
) -> None:
    """Background task: run guardrailed model triage and persist results."""
    try:
        from ai_incidents import OPENAI_API_KEY, analyze_workflow_incident

        if not OPENAI_API_KEY:
            await update_incident_ai(
                user_id,
                incident_id,
                ai_status="skipped_no_api_key",
                ai_error="Set OPENAI_API_KEY in the backend environment to enable AI triage.",
            )
            return

        analysis = await analyze_workflow_incident(raw_payload)
        analyzed = dict(analysis)
        analyzed["analyzedAt"] = datetime.utcnow().isoformat() + "Z"
        await update_incident_ai(
            user_id,
            incident_id,
            ai_status="completed",
            ai_analysis=analyzed,
            ai_error=None,
        )
    except Exception as e:
        await update_incident_ai(
            user_id,
            incident_id,
            ai_status="failed",
            ai_error=str(e)[:2000],
        )


async def update_incident_status(
    user_id: str, incident_id: str, status: str
) -> Dict[str, Any]:
    if db is None:
        raise RuntimeError("Firestore not initialized")
    if status not in ("open", "acknowledged", "resolved"):
        raise ValueError("Invalid status")
    ref = _incidents_col(user_id).document(incident_id)
    if not ref.get().exists:
        raise ValueError("Incident not found")
    ref.update({"status": status, "updatedAt": datetime.utcnow()})
    snap = ref.get()
    return serialize_incident(snap.id, snap.to_dict() or {})
