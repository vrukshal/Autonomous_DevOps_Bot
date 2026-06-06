# Tracked Production Repositories - Implementation Summary

## Overview

This document summarizes the implementation of the "Tracked Production Repositories" MVP feature.

## Backend Implementation

### New Files Created

1. **`backend/tracked_repos.py`**
   - CRUD operations for tracked repositories
   - Firestore data access layer
   - Helper functions for repo key generation and webhook event storage

2. **`backend/github_api.py`**
   - GitHub API integration utilities
   - Workflow fetching functionality
   - Token decryption and API calls

3. **`backend/webhooks.py`**
   - GitHub webhook signature verification
   - Webhook event handling
   - workflow_run event processing

### Updated Files

1. **`backend/main.py`**
   - Added tracked repos endpoints:
     - `POST /api/tracked-repos` - Create tracked repo
     - `GET /api/tracked-repos` - List tracked repos
     - `PATCH /api/tracked-repos/{repoKey}` - Update settings
     - `DELETE /api/tracked-repos/{repoKey}` - Untrack repo
   - Added GitHub workflows endpoint:
     - `GET /api/github/workflows?owner=...&repo=...`
   - Added webhook endpoint:
     - `POST /api/webhooks/github` - No auth required (uses signature verification)

2. **`backend/github_oauth.py`**
   - Updated to include `repoId` in repository responses

3. **`backend/requirements.txt`**
   - Added `cryptography==41.0.7` for webhook signature verification
   - Added `pydantic==2.5.0` for request validation

## Frontend Implementation

### New Files Created

1. **`frontend/src/api/trackedRepos.ts`**
   - API client functions for tracked repos
   - TypeScript interfaces
   - Helper functions

2. **`frontend/src/pages/TrackedRepos.tsx`**
   - Tracked repositories list page
   - Settings modal component
   - Workflow selection UI

3. **`frontend/src/pages/TrackedRepos.module.css`**
   - Styling for tracked repos page
   - Modal styles
   - Form styles

### Updated Files

1. **`frontend/src/pages/Repos.tsx`**
   - Added "Track" button for each repository
   - Shows "Tracked" badge for tracked repos
   - Fetches tracked repos status on load
   - Added link to tracked repos page

2. **`frontend/src/pages/Repos.module.css`**
   - Added styles for track button
   - Added styles for tracked badge
   - Added action button styles

3. **`frontend/src/App.tsx`**
   - Added route for `/tracked-repos`

4. **`frontend/src/api/github.ts`**
   - Added `repoId` to `GitHubRepo` interface

## Data Model

### Tracked Repositories
```
users/{uid}/tracked_repos/{repoKey}
  - owner: string
  - repo: string
  - repoId: number
  - defaultBranch: string
  - isTracked: true
  - environment: "production" | "staging" | "development"
  - deployDetectionMode: "github_actions"
  - deployWorkflowId: number | null
  - deployWorkflowName: string | null
  - createdAt: timestamp
  - updatedAt: timestamp
```

### Webhook Events
```
users/{uid}/events/{eventId}
  - source: "github"
  - type: "workflow_run"
  - repoKey: string
  - receivedAt: timestamp
  - payload: object (raw JSON from GitHub)
```

## Environment Variables

### New Required Variable

- `GITHUB_WEBHOOK_SECRET`: Secret for verifying GitHub webhook signatures
  - Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`

## API Endpoints

### Tracked Repositories

- **POST** `/api/tracked-repos`
  - Body: `{ owner, repo, repoId, defaultBranch }`
  - Returns: TrackedRepo object

- **GET** `/api/tracked-repos`
  - Returns: Array of TrackedRepo objects

- **PATCH** `/api/tracked-repos/{repoKey}`
  - Body: `{ environment?, deployWorkflowId?, deployWorkflowName? }`
  - Returns: Updated TrackedRepo object

- **DELETE** `/api/tracked-repos/{repoKey}`
  - Returns: `{ message: "..." }`

### GitHub Integration

- **GET** `/api/github/workflows?owner=...&repo=...`
  - Returns: Array of workflow objects `{ id, name, path, state }`

### Webhooks

- **POST** `/api/webhooks/github`
  - No authentication required
  - Uses `X-Hub-Signature-256` header for verification
  - Processes `workflow_run` events
  - Stores events only for tracked repositories

## Security

1. **Webhook Signature Verification**
   - Uses HMAC SHA256 with `GITHUB_WEBHOOK_SECRET`
   - Constant-time comparison to prevent timing attacks
   - Validates `X-Hub-Signature-256` header

2. **Authentication**
   - All tracked repos endpoints require Firebase ID token
   - Webhook endpoint uses signature verification instead

3. **Data Isolation**
   - Each user's tracked repos are stored under their user ID
   - Webhook events are stored for all users tracking the repository

## Usage Flow

1. User views repositories on `/repos` page
2. User clicks "Track" on a repository
3. Repository is added to tracked repos
4. User navigates to `/tracked-repos` page
5. User clicks "Settings" on a tracked repo
6. User selects environment and deploy workflow
7. User saves settings
8. GitHub webhook sends `workflow_run` events
9. Events are stored in Firestore for tracked repositories

## Testing Checklist

- [ ] Create tracked repo via POST endpoint
- [ ] List tracked repos via GET endpoint
- [ ] Update tracked repo settings via PATCH endpoint
- [ ] Delete tracked repo via DELETE endpoint
- [ ] Fetch workflows for a repository
- [ ] Track repo from frontend
- [ ] View tracked repos page
- [ ] Open settings modal
- [ ] Select workflow from dropdown
- [ ] Save settings
- [ ] Untrack repository
- [ ] Receive webhook event (with ngrok for local testing)
- [ ] Verify webhook signature validation
- [ ] Verify events are stored only for tracked repos

## Next Steps

Future enhancements could include:
- Deployment detection logic based on workflow_run events
- Deployment history tracking
- Notification system for deployments
- Multiple workflow support per repository
- Deployment status dashboard
