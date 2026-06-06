# Quick Start Guide

## Running the Application

### Backend Setup (First Time)

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file:**
   ```bash
   # Copy the example (or create manually)
   # Then edit .env and add your credentials:
   # - GITHUB_CLIENT_ID
   # - GITHUB_CLIENT_SECRET
   # - GITHUB_TOKEN_ENC_KEY (generate with: python -c "import secrets; print(secrets.token_hex(32))")
   # - FIREBASE_PROJECT_ID=devopsbot-46359
   # - FRONTEND_URL=http://localhost:3000
   # - GITHUB_REDIRECT_URI=http://localhost:8000/api/auth/github/callback
   ```

### Running Backend

```bash
cd backend
source venv/bin/activate  # If not already activated
uvicorn main:app --reload --port 8000
```

Backend will run at: `http://localhost:8000`

### Frontend Setup (First Time)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

### Running Frontend

```bash
cd frontend
npm run dev
```

Frontend will run at: `http://localhost:3000`

## Usage Flow

1. Open `http://localhost:3000` in your browser
2. You'll see the landing page explaining the product
3. Click "Get Started" to sign in with Google
4. After signing in, you'll be taken to the Dashboard
5. Click "Connect GitHub" to authorize GitHub access
6. View your repositories on the Repos page

## Troubleshooting

- **Backend won't start**: Make sure you've created the `.env` file with all required variables
- **Frontend can't connect to backend**: Ensure backend is running on port 8000
- **GitHub OAuth fails**: Verify your GitHub OAuth App callback URL matches exactly: `http://localhost:8000/api/auth/github/callback`
