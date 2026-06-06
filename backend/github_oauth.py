"""
GitHub OAuth flow implementation
Handles OAuth authorization, token exchange, and API calls
"""
import os
import secrets
import httpx
from datetime import datetime
from typing import Optional, Dict, List
from dotenv import load_dotenv

from auth import db
from crypto import encrypt_token, decrypt_token

load_dotenv()

# GitHub OAuth configuration
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:8000/api/auth/github/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Store OAuth state temporarily (in production, use Redis or similar)
oauth_states: Dict[str, str] = {}


async def start_github_oauth(user_id: str) -> str:
    """
    Start GitHub OAuth flow
    Generates CSRF state and returns GitHub authorization URL
    """
    if not GITHUB_CLIENT_ID:
        raise ValueError("GITHUB_CLIENT_ID environment variable is required")
    
    # Generate CSRF state token
    state = secrets.token_urlsafe(32)
    oauth_states[state] = user_id
    
    # GitHub OAuth scopes
    scopes = "repo"  # Access to repositories
    
    # Build authorization URL
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope={scopes}"
        f"&state={state}"
    )
    
    return auth_url


async def handle_github_callback(code: str, state: str) -> str:
    """
    Handle GitHub OAuth callback
    Exchanges authorization code for access token
    Stores encrypted token in Firestore
    """
    if not GITHUB_CLIENT_SECRET:
        raise ValueError("GITHUB_CLIENT_SECRET environment variable is required")
    
    # Verify CSRF state
    if state not in oauth_states:
        raise ValueError("Invalid OAuth state")
    
    user_id = oauth_states.pop(state)
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to exchange code for token: {response.text}")
        
        token_data = response.json()
        
        if "error" in token_data:
            raise Exception(f"GitHub OAuth error: {token_data.get('error_description', token_data['error'])}")
        
        access_token = token_data.get("access_token")
        if not access_token:
            raise Exception("No access token in response")
        
        scopes = token_data.get("scope", "")
    
    # Get GitHub user info
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        
        if user_response.status_code != 200:
            raise Exception(f"Failed to get GitHub user info: {user_response.text}")
        
        github_user_data = user_response.json()
        github_username = github_user_data.get("login")
    
    # Encrypt access token
    encrypted_token = encrypt_token(access_token)
    
    # Store in Firestore
    user_ref = db.collection("users").document(user_id)
    integration_ref = user_ref.collection("integrations").document("github")
    
    integration_ref.set({
        "connected": True,
        "accessTokenEncrypted": encrypted_token,
        "githubUser": github_username,
        "scopes": scopes,
        "updatedAt": datetime.utcnow(),
    })
    
    # Redirect to frontend dashboard
    return f"{FRONTEND_URL}/dashboard"


async def get_github_status(user_id: str) -> Dict:
    """
    Get GitHub connection status for a user
    """
    try:
        if db is None:
            raise Exception("Firestore not initialized. Please check Firebase configuration.")
        
        user_ref = db.collection("users").document(user_id)
        integration_ref = user_ref.collection("integrations").document("github")
        integration_doc = integration_ref.get()
        
        if not integration_doc.exists:
            return {"connected": False}
        
        data = integration_doc.to_dict()
        if not data:
            return {"connected": False}
        
        return {
            "connected": data.get("connected", False),
            "githubUser": data.get("githubUser"),
        }
    except Exception as e:
        # Log the error for debugging
        print(f"Error getting GitHub status for user {user_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return not connected instead of raising - this is expected for first-time users
        # But if it's a Firestore init error, we should raise it
        if "not initialized" in str(e).lower():
            raise
        return {"connected": False}


async def get_github_repos(user_id: str) -> List[Dict]:
    """
    Get list of GitHub repositories for the connected user
    Decrypts token and calls GitHub API
    """
    # Get encrypted token from Firestore
    user_ref = db.collection("users").document(user_id)
    integration_ref = user_ref.collection("integrations").document("github")
    integration_doc = integration_ref.get()
    
    if not integration_doc.exists:
        raise Exception("GitHub not connected")
    
    data = integration_doc.to_dict()
    if not data.get("connected"):
        raise Exception("GitHub not connected")
    
    encrypted_token = data.get("accessTokenEncrypted")
    if not encrypted_token:
        raise Exception("GitHub access token not found")
    
    # Decrypt token
    access_token = decrypt_token(encrypted_token)
    
    # Fetch repositories from GitHub API
    async with httpx.AsyncClient() as client:
        repos = []
        page = 1
        per_page = 100
        
        while True:
            response = await client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
                params={
                    "per_page": per_page,
                    "page": page,
                    "sort": "updated",
                },
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch repositories: {response.text}")
            
            page_repos = response.json()
            if not page_repos:
                break
            
            for repo in page_repos:
                repos.append({
                    "name": repo.get("full_name", repo.get("name")),
                    "private": repo.get("private", False),
                    "defaultBranch": repo.get("default_branch", "main"),
                    "repoId": repo.get("id"),
                })
            
            # Check if there are more pages
            if len(page_repos) < per_page:
                break
            
            page += 1
    
    return repos


async def disconnect_github(user_id: str) -> None:
    """
    Disconnect GitHub integration
    Removes stored token from Firestore
    """
    user_ref = db.collection("users").document(user_id)
    integration_ref = user_ref.collection("integrations").document("github")
    integration_ref.set({
        "connected": False,
        "updatedAt": datetime.utcnow(),
    }, merge=True)
