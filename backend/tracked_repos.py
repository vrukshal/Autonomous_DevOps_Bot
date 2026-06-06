"""
Tracked repositories management
Handles CRUD operations for tracked production repositories
"""
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from auth import db


def get_repo_key(owner: str, repo: str) -> str:
    """
    Generate a stable repo key from owner and repo name
    Format: owner_repo (lowercase)
    """
    return f"{owner.lower()}_{repo.lower()}"


async def create_tracked_repo(
    user_id: str,
    owner: str,
    repo: str,
    repo_id: int,
    default_branch: str
) -> Dict:
    """
    Create a new tracked repository
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    repo_key = get_repo_key(owner, repo)
    now = datetime.utcnow()
    
    tracked_repo_data = {
        "owner": owner,
        "repo": repo,
        "repoId": repo_id,
        "defaultBranch": default_branch,
        "isTracked": True,
        "environment": "production",
        "deployDetectionMode": "github_actions",
        "deployWorkflowId": None,
        "deployWorkflowName": None,
        "createdAt": now,
        "updatedAt": now,
    }
    
    user_ref = db.collection("users").document(user_id)
    tracked_repos_ref = user_ref.collection("tracked_repos")
    tracked_repos_ref.document(repo_key).set(tracked_repo_data)
    
    return tracked_repo_data


async def get_tracked_repos(user_id: str) -> List[Dict]:
    """
    Get all tracked repositories for a user
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    user_ref = db.collection("users").document(user_id)
    tracked_repos_ref = user_ref.collection("tracked_repos")
    docs = tracked_repos_ref.stream()
    
    repos = []
    for doc in docs:
        data = doc.to_dict()
        if data and data.get("isTracked"):
            repos.append(data)
    
    return repos


async def get_tracked_repo(user_id: str, repo_key: str) -> Optional[Dict]:
    """
    Get a specific tracked repository
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    user_ref = db.collection("users").document(user_id)
    tracked_repos_ref = user_ref.collection("tracked_repos")
    doc = tracked_repos_ref.document(repo_key).get()
    
    if doc.exists:
        return doc.to_dict()
    return None


async def update_tracked_repo(
    user_id: str,
    repo_key: str,
    updates: Dict
) -> Dict:
    """
    Update tracked repository settings
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    user_ref = db.collection("users").document(user_id)
    tracked_repos_ref = user_ref.collection("tracked_repos")
    doc_ref = tracked_repos_ref.document(repo_key)
    
    # Check if repo exists
    doc = doc_ref.get()
    if not doc.exists:
        raise ValueError(f"Tracked repo {repo_key} not found")
    
    # Prepare updates
    update_data = {
        "updatedAt": datetime.utcnow(),
    }
    
    # Only update provided fields
    allowed_fields = ["environment", "deployWorkflowId", "deployWorkflowName"]
    for field in allowed_fields:
        if field in updates:
            update_data[field] = updates[field]
    
    doc_ref.update(update_data)
    
    # Return updated document
    updated_doc = doc_ref.get()
    return updated_doc.to_dict()


async def delete_tracked_repo(user_id: str, repo_key: str) -> None:
    """
    Delete (untrack) a repository
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    user_ref = db.collection("users").document(user_id)
    tracked_repos_ref = user_ref.collection("tracked_repos")
    doc_ref = tracked_repos_ref.document(repo_key)
    
    # Check if repo exists
    doc = doc_ref.get()
    if not doc.exists:
        raise ValueError(f"Tracked repo {repo_key} not found")
    
    doc_ref.delete()


async def is_repo_tracked(user_id: str, owner: str, repo: str) -> bool:
    """
    Check if a repository is tracked
    """
    repo_key = get_repo_key(owner, repo)
    tracked_repo = await get_tracked_repo(user_id, repo_key)
    return tracked_repo is not None and tracked_repo.get("isTracked", False)


def find_users_tracking_repo(repo_key: str) -> List[Tuple[str, Dict[str, Any]]]:
    """
    Return (firebase_user_id, tracked_repo_doc_dict) for every user tracking repo_key.
    Used by webhooks to route incidents to the correct accounts.
    """
    if db is None:
        return []

    results: List[Tuple[str, Dict[str, Any]]] = []
    users_ref = db.collection("users")
    for user_doc in users_ref.stream():
        user_id = user_doc.id
        tracked_repos_ref = user_doc.reference.collection("tracked_repos")
        repo_doc = tracked_repos_ref.document(repo_key).get()
        if not repo_doc.exists:
            continue
        data = repo_doc.to_dict()
        if data and data.get("isTracked"):
            results.append((user_id, data))
    return results


async def get_all_tracked_repo_keys() -> List[str]:
    """
    Get all repo keys across all users (for webhook matching)
    Returns list of repo keys in format "owner_repo"
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    repo_keys = []
    users_ref = db.collection("users")
    users = users_ref.stream()
    
    for user_doc in users:
        tracked_repos_ref = user_doc.reference.collection("tracked_repos")
        tracked_repos = tracked_repos_ref.stream()
        
        for repo_doc in tracked_repos:
            data = repo_doc.to_dict()
            if data and data.get("isTracked"):
                owner = data.get("owner", "")
                repo = data.get("repo", "")
                if owner and repo:
                    repo_keys.append(get_repo_key(owner, repo))
    
    return repo_keys


async def store_webhook_event(
    repo_key: str,
    event_type: str,
    delivery_id: str,
    payload: Dict
) -> str:
    """
    Store a webhook event in Firestore
    Returns the event ID
    """
    if db is None:
        raise Exception("Firestore not initialized")
    
    # Find which user(s) track this repo
    users_ref = db.collection("users")
    users = users_ref.stream()
    
    event_id = f"{delivery_id}_{datetime.utcnow().timestamp()}"
    
    for user_doc in users:
        tracked_repos_ref = user_doc.reference.collection("tracked_repos")
        repo_doc = tracked_repos_ref.document(repo_key).get()
        
        if repo_doc.exists:
            # Store event for this user
            events_ref = user_doc.reference.collection("events")
            event_data = {
                "source": "github",
                "type": event_type,
                "repoKey": repo_key,
                "receivedAt": datetime.utcnow(),
                "payload": payload,
            }
            events_ref.document(event_id).set(event_data)
    
    return event_id
