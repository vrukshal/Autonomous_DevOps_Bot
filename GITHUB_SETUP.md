# GitHub Authentication Setup Guide

To make GitHub authentication work, you need to:

## Step 1: Create a GitHub OAuth App

1. **Go to GitHub Settings:**
   - Visit: https://github.com/settings/developers
   - Or: GitHub → Your Profile → Settings → Developer settings → OAuth Apps

2. **Create New OAuth App:**
   - Click "New OAuth App" button
   - Fill in the following:
     - **Application name**: `Autonomous DevOps Bot` (or any name you prefer)
     - **Homepage URL**: `http://localhost:3000`
     - **Authorization callback URL**: `http://localhost:8000/api/auth/github/callback`
     - **Application description**: (optional) "DevOps Bot for managing GitHub repositories"
   
3. **Register the Application:**
   - Click "Register application"
   - You'll be taken to the app details page

4. **Get Your Credentials:**
   - **Client ID**: Copy this immediately (it's visible on the page)
   - **Client Secret**: Click "Generate a new client secret" button
     - Copy the secret immediately (you can only see it once!)
     - If you lose it, you'll need to generate a new one

## Step 2: Generate Encryption Key

The encryption key is used to securely store GitHub access tokens. Generate it with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

This will output a 64-character hex string. Copy this value.

## Step 3: Create Backend .env File

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create `.env` file** (if it doesn't exist):
   ```bash
   touch .env
   ```

3. **Add the following to `.env`:**
   ```env
   # GitHub OAuth Configuration
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   GITHUB_REDIRECT_URI=http://localhost:8000/api/auth/github/callback
   
   # Frontend URL (for OAuth redirects)
   FRONTEND_URL=http://localhost:3000
   
   # Encryption Key for GitHub Tokens (64-character hex string)
   GITHUB_TOKEN_ENC_KEY=your_64_character_hex_key_here
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=devopsbot-46359
   FIREBASE_SERVICE_ACCOUNT_KEY=path/to/serviceAccountKey.json
   ```

4. **Replace the placeholder values:**
   - `your_github_client_id_here` → Your GitHub Client ID from Step 1
   - `your_github_client_secret_here` → Your GitHub Client Secret from Step 1
   - `your_64_character_hex_key_here` → The encryption key from Step 2
   - `path/to/serviceAccountKey.json` → Path to your Firebase service account key (optional for local dev)

## Step 4: Verify Your Setup

Your `.env` file should look something like this (with real values):

```env
GITHUB_CLIENT_ID=abc123def456ghi789
GITHUB_CLIENT_SECRET=xyz789secret123key456
GITHUB_REDIRECT_URI=http://localhost:8000/api/auth/github/callback
FRONTEND_URL=http://localhost:3000
GITHUB_TOKEN_ENC_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
FIREBASE_PROJECT_ID=devopsbot-46359
```

## Important Notes

1. **Callback URL Must Match Exactly:**
   - The callback URL in your GitHub OAuth App must be: `http://localhost:8000/api/auth/github/callback`
   - For production, you'll need to update both the GitHub OAuth App and the `.env` file

2. **Client Secret Security:**
   - Never commit your `.env` file to git
   - The Client Secret is sensitive - treat it like a password
   - If exposed, regenerate it in GitHub immediately

3. **Encryption Key:**
   - Keep this key secure - if lost, you won't be able to decrypt stored tokens
   - Use the same key across all environments for the same database

4. **For Production:**
   - Update the callback URL in GitHub OAuth App to your production URL
   - Update `GITHUB_REDIRECT_URI` and `FRONTEND_URL` in `.env`
   - Consider using environment variables or a secrets manager

## Testing

After setting up, test the flow:

1. Start your backend: `uvicorn main:app --reload --port 8000`
2. Start your frontend: `npm run dev` (in frontend directory)
3. Sign in with Google
4. Click "Connect GitHub" on the dashboard
5. You should be redirected to GitHub for authorization
6. After authorizing, you'll be redirected back to the dashboard

## Troubleshooting

**"Invalid OAuth state" error:**
- Make sure your callback URL matches exactly in GitHub OAuth App settings

**"Failed to exchange code for token" error:**
- Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are correct
- Check that the Client Secret hasn't expired (regenerate if needed)

**"Token verification failed" error:**
- Make sure Firebase is properly configured
- Check that `FIREBASE_PROJECT_ID` is correct
