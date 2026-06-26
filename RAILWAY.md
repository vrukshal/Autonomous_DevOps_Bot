# Deploying on Railway

Use **two Railway services** from this repo: one for **`backend/`** (API) and one for **`frontend/`** (static SPA). Railway assigns public HTTPS URLs for each.

---

## A. Backend service (FastAPI)

### Service settings

| Railway field | Value |
|---------------|--------|
| **Root Directory** | `backend` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

Railway sets **`PORT`** automatically. Do not use `8000` in production.

### Environment variables (backend)

| Variable | Required | Notes |
|----------|----------|--------|
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth App |
| `GITHUB_REDIRECT_URI` | Yes | `https://<BACKEND_PUBLIC_HOST>/api/auth/github/callback` — must match GitHub OAuth App callback URL exactly |
| `GITHUB_TOKEN_ENC_KEY` | Yes | 64 hex chars: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `GITHUB_WEBHOOK_SECRET` | Yes for signed webhooks | Same secret you enter on GitHub webhooks |
| `FIREBASE_PROJECT_ID` | Yes | Firebase console project ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **Recommended on Railway** | Entire service account JSON as **one line** (minified) or multiline in Railway’s variable editor — avoids uploading a file |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Alternative | Local path to JSON file (mainly for dev) |
| `FRONTEND_URL` | Yes | Public SPA URL, e.g. `https://your-frontend.up.railway.app` — used for OAuth redirect UX and **CORS** |
| `WEBHOOK_PUBLIC_URL` | Yes for webhooks | `https://<BACKEND_PUBLIC_HOST>` — **no** path, **no** trailing slash |
| `OPENAI_API_KEY` | No | Enables AI triage on incidents |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `OPENAI_BASE_URL` | No | OpenAI-compatible API base if not default |
| `CORS_EXTRA_ORIGINS` | No | Comma-separated extra browser origins if you have more than one front-end URL |

After deploy, copy the backend **public URL** (e.g. `https://xxx.up.railway.app`) and set:

- `WEBHOOK_PUBLIC_URL` = that origin  
- `GITHUB_REDIRECT_URI` = `https://xxx.up.railway.app/api/auth/github/callback`  
Update the same callback URL in **GitHub → OAuth App** settings.

---

## B. Frontend service (Vite + React)

### Service settings

| Railway field | Value |
|---------------|--------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npx vite preview --host 0.0.0.0 --port $PORT` |

### Build-time variable (critical)

The SPA must know where the API lives. Set **before build**:

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `https://your-backend.up.railway.app/api` |

Use your **real** backend Railway URL + `/api` (no trailing slash after `api`, or one slash is fine — the app normalizes).

Redeploy the frontend whenever the API URL changes.

---

## C. GitHub OAuth App

1. **Homepage URL:** your frontend Railway URL.  
2. **Authorization callback URL:** `https://<BACKEND>/api/auth/github/callback` (same as `GITHUB_REDIRECT_URI`).

---

## D. Firebase

1. **Authentication → Settings → Authorized domains:** add your Railway **frontend** hostname (e.g. `your-frontend.up.railway.app`) and any custom domain.  
2. Service account: paste JSON into **`FIREBASE_SERVICE_ACCOUNT_JSON`** on the backend service (see above).

---

## E. GitHub webhooks

Webhook **Payload URL:**

`https://<BACKEND_PUBLIC_HOST>/api/webhooks/github`

Secret = `GITHUB_WEBHOOK_SECRET`.  
Events: **Workflow runs** (as in local setup).

---

## F. Order of operations (avoid chicken-and-egg)

1. Deploy **backend** first; set env vars except `FRONTEND_URL` can be a placeholder, then fix after frontend exists.  
2. Deploy **frontend**; set `VITE_API_BASE_URL` to backend `/api` URL; set `FRONTEND_URL` on backend to frontend URL; redeploy backend if CORS was wrong.  
3. Update **GitHub OAuth** callback and **Firebase** authorized domains to the final URLs.

---

## G. Optional: one repo, two services in Railway

Create two services from the same GitHub repo; set **different root directories** and different **Start** / **Build** commands as above. Link a public domain per service if you want stable URLs before updating GitHub/Firebase.
