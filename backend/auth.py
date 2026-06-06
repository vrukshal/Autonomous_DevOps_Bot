"""
Firebase Authentication utilities
Verifies Firebase ID tokens using Firebase Admin SDK
"""
import firebase_admin
from firebase_admin import credentials, auth
from google.cloud import firestore
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin SDK
if not firebase_admin._apps:
    # Use service account key if provided, otherwise use default credentials
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
    if service_account_path and os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    else:
        # Try to use default credentials (for local development with gcloud auth)
        try:
            firebase_admin.initialize_app()
        except Exception as e:
            # If no credentials available, we'll need to handle this
            print(f"Warning: Could not initialize Firebase Admin: {e}")
            print("Please set FIREBASE_SERVICE_ACCOUNT_KEY environment variable")

# Initialize Firestore
try:
    db = firestore.Client(project=os.getenv("FIREBASE_PROJECT_ID", "devopsbot-46359"))
except Exception as e:
    print(f"Warning: Could not initialize Firestore: {e}")
    print("Firestore operations will fail. Please check your Firebase configuration.")
    db = None


def verify_firebase_token(token: str) -> dict:
    """
    Verify Firebase ID token and return decoded token
    """
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise Exception(f"Token verification failed: {str(e)}")


def get_user_id(decoded_token: dict) -> str:
    """
    Extract user ID from decoded Firebase token
    """
    return decoded_token.get("uid") or decoded_token.get("user_id")
