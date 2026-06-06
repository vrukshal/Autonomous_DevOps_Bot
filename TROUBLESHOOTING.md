# Troubleshooting Guide

## Fixed Issues

### 1. Dashboard Alert on First Load
**Problem:** Dashboard showed "Failed to load GitHub status" alert even when GitHub wasn't connected (expected for first-time users).

**Fix:** Updated error handling to gracefully handle "not connected" state without showing error alerts. The dashboard now shows "Not Connected" status without alarming users.

### 2. 500 Error on `/api/github/status`
**Problem:** Getting 500 Internal Server Error when trying to check GitHub status.

**Fixes Applied:**
- Improved error handling in `get_github_status()` function
- Added better error logging with stack traces
- Made Firestore initialization more robust
- Return `{"connected": False}` for expected "not connected" cases instead of raising errors

## Common Causes of 500 Error

### 1. Firestore Not Initialized
**Symptoms:** 500 error with message about Firestore not being initialized.

**Solution:**
- Check that `FIREBASE_PROJECT_ID` is set correctly in `.env`
- If using service account key, verify `FIREBASE_SERVICE_ACCOUNT_KEY` path is correct
- For local development, you can use `gcloud auth application-default login` instead

### 2. Firebase Admin SDK Not Initialized
**Symptoms:** Token verification fails or Firestore operations fail.

**Solution:**
- Ensure Firebase Admin SDK is properly initialized
- Check backend logs for Firebase initialization warnings
- Verify your Firebase project ID matches the one in `.env`

### 3. Missing Environment Variables
**Symptoms:** Various errors related to configuration.

**Solution:**
Check your `backend/.env` file has all required variables:
```env
FIREBASE_PROJECT_ID=devopsbot-46359
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/serviceAccountKey.json
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/api/auth/github/callback
FRONTEND_URL=http://localhost:3000
GITHUB_TOKEN_ENC_KEY=your_64_char_hex_key
```

## Debugging Steps

### 1. Check Backend Logs
When you see a 500 error, check your backend terminal output. The improved error handling now prints:
- Full error messages
- Stack traces
- User ID being queried

### 2. Test Firestore Connection
You can test if Firestore is working by checking the backend logs when the server starts. Look for:
- "Warning: Could not initialize Firestore" - indicates Firestore setup issue
- "Warning: Could not initialize Firebase Admin" - indicates Firebase Admin SDK issue

### 3. Verify Firebase Configuration
1. Check that your Firebase project exists and is active
2. Verify the project ID matches `devopsbot-46359` (or update `.env` if different)
3. If using service account key, verify the file path is correct and the file exists

### 4. Test Authentication
The 500 error might also be caused by authentication issues:
- Verify Firebase ID token is being sent correctly from frontend
- Check that `Authorization: Bearer <token>` header is present
- Verify token is valid (not expired)

## Expected Behavior

### First Time User (GitHub Not Connected)
- Dashboard loads without errors
- Shows "Not Connected" status
- No error alerts
- Can click "Connect GitHub" button

### After Connecting GitHub
- Dashboard shows "Connected" status
- Displays GitHub username
- Shows "View Repositories" and "Disconnect GitHub" buttons

## Still Getting 500 Error?

If you're still getting a 500 error after these fixes:

1. **Check backend terminal output** - Look for the detailed error message and stack trace
2. **Verify Firebase setup** - Make sure Firebase Admin SDK and Firestore are properly configured
3. **Check environment variables** - Ensure all required variables are set in `.env`
4. **Test with a simple request** - Try accessing `http://localhost:8000/` to see if the server is running

## Getting Help

When reporting issues, please include:
- Full error message from backend terminal
- Stack trace (if available)
- Your `.env` file structure (without sensitive values)
- Firebase project ID
- Whether you're using service account key or gcloud auth
