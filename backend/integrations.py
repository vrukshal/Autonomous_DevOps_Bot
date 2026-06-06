"""
Public integration helpers (URLs, feature flags from environment).
"""
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv

load_dotenv()


def get_webhook_callback_url() -> Optional[str]:
    base = os.getenv("WEBHOOK_PUBLIC_URL", "").strip().rstrip("/")
    if not base:
        return None
    return f"{base}/api/webhooks/github"


def get_integrations_status() -> Dict[str, Any]:
    from ai_incidents import OPENAI_API_KEY

    callback = get_webhook_callback_url()
    return {
        "webhookCallbackUrl": callback,
        "webhookPublicUrlConfigured": bool(callback),
        "webhookSecretConfigured": bool(os.getenv("GITHUB_WEBHOOK_SECRET")),
        "openAiConfigured": bool(OPENAI_API_KEY),
        "openAiModel": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    }
