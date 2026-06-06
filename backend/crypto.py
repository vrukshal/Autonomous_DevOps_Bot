"""
Encryption utilities for GitHub access tokens
Uses AES-256-GCM for authenticated encryption
"""
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import base64
import os
from dotenv import load_dotenv

load_dotenv()

# Get encryption key from environment
ENCRYPTION_KEY = os.getenv("GITHUB_TOKEN_ENC_KEY")

if not ENCRYPTION_KEY:
    raise ValueError(
        "GITHUB_TOKEN_ENC_KEY environment variable is required. "
        "Generate a 32-byte key: python -c 'import secrets; print(secrets.token_hex(32))'"
    )

# Convert hex string to bytes if needed
if len(ENCRYPTION_KEY) == 64:  # 32 bytes in hex
    ENCRYPTION_KEY_BYTES = bytes.fromhex(ENCRYPTION_KEY)
else:
    # Assume it's already base64 or raw bytes
    try:
        ENCRYPTION_KEY_BYTES = base64.b64decode(ENCRYPTION_KEY)
    except:
        ENCRYPTION_KEY_BYTES = ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY

# Ensure key is 32 bytes for AES-256
if len(ENCRYPTION_KEY_BYTES) != 32:
    raise ValueError(f"Encryption key must be 32 bytes, got {len(ENCRYPTION_KEY_BYTES)}")


def encrypt_token(token: str) -> str:
    """
    Encrypt GitHub access token using AES-256-GCM
    Returns base64-encoded ciphertext with nonce and tag
    """
    # Generate random nonce (12 bytes for GCM)
    nonce = get_random_bytes(12)
    
    # Create cipher
    cipher = AES.new(ENCRYPTION_KEY_BYTES, AES.MODE_GCM, nonce=nonce)
    
    # Encrypt and authenticate
    ciphertext, tag = cipher.encrypt_and_digest(token.encode('utf-8'))
    
    # Combine nonce, tag, and ciphertext
    encrypted_data = nonce + tag + ciphertext
    
    # Return base64-encoded result
    return base64.b64encode(encrypted_data).decode('utf-8')


def decrypt_token(encrypted_token: str) -> str:
    """
    Decrypt GitHub access token using AES-256-GCM
    Takes base64-encoded ciphertext with nonce and tag
    """
    try:
        # Decode from base64
        encrypted_data = base64.b64decode(encrypted_token.encode('utf-8'))
        
        # Extract nonce (12 bytes), tag (16 bytes), and ciphertext
        nonce = encrypted_data[:12]
        tag = encrypted_data[12:28]
        ciphertext = encrypted_data[28:]
        
        # Create cipher
        cipher = AES.new(ENCRYPTION_KEY_BYTES, AES.MODE_GCM, nonce=nonce)
        
        # Decrypt and verify
        decrypted_token = cipher.decrypt_and_verify(ciphertext, tag)
        
        return decrypted_token.decode('utf-8')
    except Exception as e:
        raise Exception(f"Decryption failed: {str(e)}")
