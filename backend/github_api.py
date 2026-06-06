"""
GitHub API integration utilities
Handles GitHub API calls using stored access tokens
"""
import httpx
from typing import List, Dict, Optional
from auth import db
from crypto import decrypt_token


async def get_user_github_token(user_id: str) -> Optional[str]:
    """
    Get and decrypt GitHub access token for a user
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    user_ref = db.collection("users").document(user_id)
    integration_ref = user_ref.collection("integrations").document("github")
    integration_doc = integration_ref.get()
    
    if not integration_doc.exists:
        return None
    
    data = integration_doc.to_dict()
    if not data or not data.get("connected"):
        return None
    
    encrypted_token = data.get("accessTokenEncrypted")
    if not encrypted_token:
        return None
    
    try:
        return decrypt_token(encrypted_token)
    except Exception as e:
        print(f"Error decrypting token: {e}")
        return None


async def get_github_workflows(owner: str, repo: str, user_id: str) -> List[Dict]:
    """
    Get GitHub Actions workflows for a repository
    """
    access_token = await get_user_github_token(user_id)
    if not access_token:
        raise Exception("GitHub not connected or token not available")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/actions/workflows",
            headers={
                # OAuth tokens from the web flow require Bearer (token prefix is deprecated / rejected for some tokens)
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )

        if response.status_code != 200:
            raise Exception(
                f"Failed to fetch workflows (HTTP {response.status_code}): {response.text}"
            )
        
        data = response.json()
        workflows = []
        
        for workflow in data.get("workflows", []):
            workflows.append({
                "id": workflow.get("id"),
                "name": workflow.get("name"),
                "path": workflow.get("path"),
                "state": workflow.get("state"),
            })
        
        return workflows


async def list_repo_webhooks(owner: str, repo: str, user_id: str) -> List[Dict]:
    access_token = await get_user_github_token(user_id)
    if not access_token:
        raise Exception("GitHub not connected or token not available")
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/hooks",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        if r.status_code != 200:
            raise Exception(f"Failed to list hooks: HTTP {r.status_code}: {r.text[:500]}")
        return r.json()


async def create_workflow_run_webhook(
    owner: str,
    repo: str,
    user_id: str,
    callback_url: str,
    secret: str,
) -> Dict:
    """
    Register a repository webhook for workflow_run events pointing at this app.
    Requires GitHub token with repo scope (includes hooks on user repos).
    """
    access_token = await get_user_github_token(user_id)
    if not access_token:
        raise Exception("GitHub not connected or token not available")

    hooks = await list_repo_webhooks(owner, repo, user_id)
    for h in hooks:
        cfg = h.get("config") or {}
        if (cfg.get("url") or "").rstrip("/") == callback_url.rstrip("/"):
            return {"created": False, "hookId": h.get("id"), "message": "Webhook already exists"}

    body = {
        "name": "web",
        "active": True,
        "events": ["workflow_run"],
        "config": {
            "url": callback_url,
            "content_type": "json",
            "secret": secret,
            "insecure_ssl": "0",
        },
    }
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"https://api.github.com/repos/{owner}/{repo}/hooks",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
            json=body,
        )
        if r.status_code not in (201, 200):
            raise Exception(f"Failed to create hook: HTTP {r.status_code}: {r.text[:800]}")
        data = r.json()
        return {"created": True, "hookId": data.get("id"), "message": "Webhook created"}
