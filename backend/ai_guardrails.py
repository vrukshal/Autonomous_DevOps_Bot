"""
Input/output guardrails for incident AI analysis.
Redacts secrets from context, blocks obvious prompt-injection patterns in log text,
and validates model JSON before it is shown to users.
"""
import json
import re
from typing import Any, Dict, List, Optional

_SECRET_PATTERNS = [
    re.compile(r"(?i)(api[_-]?key|access[_-]?token|authorization|bearer\s+)[=:]\s*\S+"),
    re.compile(r"(?i)(client_secret|password|passwd|pwd|secret)\s*[=:]\s*\S+"),
    re.compile(r"(?i)(-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----)"),
    re.compile(r"(?i)(gh[pousr]_[A-Za-z0-9_]{20,})"),
    re.compile(r"(?i)(xox[baprs]-[A-Za-z0-9-]+)"),
    re.compile(r"(AIza[0-9A-Za-z_-]{35})"),
]

_INJECTION_SUBSTRINGS = [
    "ignore previous",
    "ignore all previous",
    "disregard your",
    "you are now",
    "new instructions:",
    "system override",
    "jailbreak",
    "developer mode",
]

MAX_CONTEXT_CHARS = 14_000
MAX_SINGLE_FIELD_CHARS = 4000


def _redact_line(line: str) -> str:
    out = line
    for pat in _SECRET_PATTERNS:
        out = pat.sub("[REDACTED]", out)
    return out


def sanitize_log_snippet(text: Optional[str]) -> str:
    if not text:
        return ""
    lines = text.splitlines()
    cleaned: List[str] = []
    for line in lines[:400]:
        low = line.lower()
        if any(s in low for s in _INJECTION_SUBSTRINGS):
            cleaned.append("[LINE REMOVED: possible instruction injection]")
            continue
        cleaned.append(_redact_line(line[:2000]))
    body = "\n".join(cleaned)
    if len(body) > MAX_SINGLE_FIELD_CHARS:
        body = body[: MAX_SINGLE_FIELD_CHARS - 20] + "\n...[truncated]"
    return body


def build_safe_incident_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Shrink and sanitize GitHub workflow_run payload for LLM context."""
    repo = payload.get("repository") or {}
    wr = payload.get("workflow_run") or {}
    safe: Dict[str, Any] = {
        "event": "workflow_run",
        "repository": {
            "full_name": repo.get("full_name"),
            "default_branch": repo.get("default_branch"),
            "private": repo.get("private"),
        },
        "workflow_run": {
            "id": wr.get("id"),
            "name": wr.get("name"),
            "path": wr.get("path"),
            "status": wr.get("status"),
            "conclusion": wr.get("conclusion"),
            "head_branch": wr.get("head_branch"),
            "head_sha": wr.get("head_sha"),
            "html_url": wr.get("html_url"),
            "run_attempt": wr.get("run_attempt"),
            "created_at": wr.get("created_at"),
            "updated_at": wr.get("updated_at"),
        },
    }
    head_commit = wr.get("head_commit") or {}
    if isinstance(head_commit, dict) and head_commit.get("message"):
        safe["head_commit_message"] = sanitize_log_snippet(str(head_commit.get("message")))[:2000]

    raw = json.dumps(safe, default=str)
    truncated = False
    if len(raw) > MAX_CONTEXT_CHARS:
        safe.pop("head_commit_message", None)
        raw = json.dumps(safe, default=str)
        truncated = True
    if len(raw) > MAX_CONTEXT_CHARS:
        raw = raw[: MAX_CONTEXT_CHARS - 30] + '..."}'
        truncated = True
    return {"truncated": truncated, "payload_json": raw}


def validate_ai_output(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize model output. Raises ValueError if unusable."""
    summary = data.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        raise ValueError("Invalid AI output: missing summary")
    summary = summary.strip()[:8000]

    causes = data.get("likely_causes")
    if not isinstance(causes, list):
        causes = []
    causes = [str(c).strip()[:500] for c in causes[:12] if str(c).strip()]

    steps = data.get("recommended_next_steps")
    if not isinstance(steps, list):
        steps = []
    steps = [str(s).strip()[:500] for s in steps[:12] if str(s).strip()]

    sev = data.get("severity_hint")
    if sev not in ("low", "medium", "high"):
        sev = "medium"

    conf = data.get("confidence_0_to_1")
    try:
        c = float(conf)
    except (TypeError, ValueError):
        c = 0.5
    c = max(0.0, min(1.0, c))

    notes = data.get("guardrail_notes")
    if not isinstance(notes, str):
        notes = ""
    notes = notes.strip()[:2000]

    return {
        "summary": summary,
        "likely_causes": causes,
        "recommended_next_steps": steps,
        "severity_hint": sev,
        "confidence_0_to_1": c,
        "guardrail_notes": notes,
    }
