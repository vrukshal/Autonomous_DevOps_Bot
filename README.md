# DevOps Bot - Full-Stack MVP

A full-stack DevOps assistant: connect GitHub, track production repos, receive **workflow failure webhooks**, and get **guardrailed AI triage** on incidents.

## Features

- **Firebase Authentication**: Google sign-in using Firebase
- **GitHub OAuth Integration**: Connect GitHub account via OAuth App
- **Secure Token Storage**: GitHub access tokens encrypted with AES-256-GCM
- **Repository Management**: View connected GitHub repositories
- **Tracked Repositories**: Track repos, set environment, and optionally scope incidents to a **deploy workflow**
- **GitHub Webhooks**: `workflow_run` events create **incidents** when a run completes with failure, timeout, or cancellation
- **AI incident triage**: Optional OpenAI-powered summary, likely causes, and next steps with **input/output guardrails** (secret redaction, injection heuristics, JSON validation)
- **Integrations UI**: Copy webhook URL, check env readiness, **register repo webhooks** via GitHub API
- **Protected routes** and **Firebase ID token** verification on every API call

## Project Structure

```
.
├── frontend/          # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── pages/    # Login, Dashboard, Repos pages
│   │   ├── components/
│   │   ├── api/      # API client and GitHub API functions
│   │   └── firebase/ # Firebase configuration
│   └── package.json
├── backend/          # FastAPI backend
│   ├── main.py       # FastAPI app and routes
│   ├── auth.py       # Firebase Admin SDK integration
│   ├── crypto.py     # Token encryption/decryption
│   ├── github_oauth.py # GitHub OAuth flow
│   └── requirements.txt
└── README.md
```

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.9+
- Firebase project with Authentication enabled
- GitHub OAuth App credentials
- Firebase Admin SDK service account key (optional, can use gcloud auth)

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

5. Edit `.env` and fill in:
   - `GITHUB_CLIENT_ID`: Your GitHub OAuth App Client ID
   - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App Client Secret
   - `GITHUB_REDIRECT_URI`: `http://localhost:8000/api/auth/github/callback`
   - `GITHUB_TOKEN_ENC_KEY`: Generate with:
     ```bash
     python -c "import secrets; print(secrets.token_hex(32))"
     ```
   - `GITHUB_WEBHOOK_SECRET`: Generate a secret for webhook signature verification:
     ```bash
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     ```
   - `FIREBASE_SERVICE_ACCOUNT_KEY`: Path to Firebase service account JSON (optional if using gcloud auth)
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID (default: devopsbot-46359)
   - `FRONTEND_URL`: `http://localhost:3000`
   - `WEBHOOK_PUBLIC_URL`: Public **HTTPS** origin of this API (no path), e.g. `https://xxxx.ngrok-free.app` — required for GitHub to call `/api/webhooks/github`
   - `OPENAI_API_KEY`: Optional — enables AI triage on incidents (model defaults to `gpt-4o-mini`; override with `OPENAI_MODEL`)

6. Start the backend server. **Do not use the global `uvicorn` from Conda/base Python** (you will get `ModuleNotFoundError: firebase_admin`). Either:
   ```bash
   ./run.sh
   ```
   …or explicitly:
   ```bash
   ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Incidents pipeline (local dev)**:
   1. Start backend with `./run.sh` and frontend with `npm run dev`.
   2. Use ngrok (or similar) so `WEBHOOK_PUBLIC_URL` matches your tunnel.
   3. Ensure `GITHUB_WEBHOOK_SECRET` matches the secret configured on the GitHub webhook.
   4. Track a repo, then either use **Integrations → Register webhook** or add the webhook manually in GitHub repo settings (event: **Workflow runs** only).
   5. Cause a failing workflow run; an incident should appear under **Incidents** in the app. If `OPENAI_API_KEY` is unset, the incident is still created with `aiStatus: skipped_no_api_key`.

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:3000`

### 3. GitHub OAuth App Setup

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: DevOps Bot (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:8000/api/auth/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**
6. Add these to your backend `.env` file

### 4. Firebase Setup

1. Go to Firebase Console → Project Settings
2. Enable Authentication → Sign-in method → Google (enable it)
3. (Optional) Download service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file and set `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`

## Usage

1. Start the backend server (port 8000)
2. Start the frontend server (port 3000)
3. Navigate to `http://localhost:3000`
4. Sign in with Google
5. Click "Connect GitHub" on the dashboard
6. Authorize the application on GitHub
7. View your repositories on the Repos page
8. Click "Track" on any repository to start tracking it
9. Configure deployment settings in the Tracked Repositories page
10. Set up GitHub webhook to receive workflow_run events (see Webhook Setup below)

## API Endpoints

### Authentication Required
All endpoints require a Firebase ID token in the `Authorization: Bearer <token>` header.

- `GET /auth/github/start` - Start GitHub OAuth flow
- `GET /auth/github/callback` - Handle GitHub OAuth callback
- `GET /github/status` - Get GitHub connection status
- `GET /github/repos` - Get list of connected repositories
- `POST /github/disconnect` - Disconnect GitHub integration
- `GET /github/workflows?owner=...&repo=...` - Get GitHub Actions workflows for a repository
- `POST /tracked-repos` - Create a tracked repository
- `GET /tracked-repos` - Get all tracked repositories
- `PATCH /tracked-repos/{repoKey}` - Update tracked repository settings
- `DELETE /tracked-repos/{repoKey}` - Untrack a repository
- `POST /webhooks/github` - GitHub webhook endpoint (no auth required, uses signature verification)

## Security Features

- **Firebase ID Token Verification**: Every API request verifies the Firebase ID token
- **CSRF Protection**: OAuth state parameter prevents CSRF attacks
- **Token Encryption**: GitHub access tokens encrypted with AES-256-GCM before storage
- **Server-Side Token Handling**: Tokens are never exposed to the frontend

## Data Storage

### Data Storage

**GitHub Integration:**
```
users/{uid}/integrations/github
  - connected: boolean
  - accessTokenEncrypted: string (encrypted token)
  - githubUser: string
  - scopes: string
  - updatedAt: timestamp
```

**Tracked Repositories:**
```
users/{uid}/tracked_repos/{repoKey}
  - owner: string
  - repo: string
  - repoId: number
  - defaultBranch: string
  - isTracked: boolean
  - environment: string (default: "production")
  - deployDetectionMode: string (default: "github_actions")
  - deployWorkflowId: number | null
  - deployWorkflowName: string | null
  - createdAt: timestamp
  - updatedAt: timestamp
```

**Webhook Events:**
```
users/{uid}/events/{eventId}
  - source: "github"
  - type: "workflow_run"
  - repoKey: string
  - receivedAt: timestamp
  - payload: object (raw JSON)
```

## Development

### Frontend
- Uses Vite for fast development
- CSS Modules for styling (no frameworks)
- TypeScript for type safety
- React Router for navigation

### Backend
- FastAPI for async API handling
- Firebase Admin SDK for auth verification
- Firestore for data persistence
- PyCryptodome for encryption

## Troubleshooting

### Backend can't verify Firebase tokens
- Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly, or
- Use `gcloud auth application-default login` for local development

### GitHub OAuth fails
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Ensure callback URL matches exactly: `http://localhost:8000/api/auth/github/callback`
- Check that the OAuth App is not suspended

### CORS errors
- Ensure backend CORS middleware allows `http://localhost:3000`
- Check that frontend proxy is configured correctly in `vite.config.ts`

## GitHub Webhook Setup

To receive workflow_run events from GitHub:

1. **Generate Webhook Secret:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Add this to your `.env` file as `GITHUB_WEBHOOK_SECRET`

2. **Configure Webhook in GitHub:**
   - Go to your repository → Settings → Webhooks → Add webhook
   - **Payload URL**: `http://your-domain.com/api/webhooks/github` (or `http://localhost:8000/api/webhooks/github` for local testing with ngrok)
   - **Content type**: `application/json`
   - **Secret**: The same value as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events**: Select "Let me select individual events" → Check "Workflow runs"
   - **Active**: Checked
   - Click "Add webhook"

3. **For Local Development:**
   Use a tool like [ngrok](https://ngrok.com/) to expose your local server:
   ```bash
   ngrok http 8000
   ```
   Use the ngrok URL in your GitHub webhook configuration.

4. **Webhook Events:**
   Currently, the webhook handler processes `workflow_run` events. Events are stored in Firestore only if the repository is tracked by at least one user.

## License

MIT
