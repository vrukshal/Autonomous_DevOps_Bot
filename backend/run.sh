#!/usr/bin/env bash
# Always use project venv (avoids ModuleNotFoundError: firebase_admin when conda/base uvicorn is first on PATH)
set -euo pipefail
cd "$(dirname "$0")"
if [[ ! -x venv/bin/uvicorn ]]; then
  echo "Missing backend/venv. Create it and install deps:" >&2
  echo "  python3 -m venv venv && ./venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi
exec ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000 "$@"
