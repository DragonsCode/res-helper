#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$project_root/.data/uv-cache}"
api_pid=""
web_pid=""
cleanup() {
  if [ -n "$api_pid" ]; then kill "$api_pid" 2>/dev/null || true; fi
  if [ -n "$web_pid" ]; then kill "$web_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM
cd "$project_root/backend"
"$project_root/backend/.venv/bin/python" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
api_pid=$!
cd "$project_root/frontend"
node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 &
web_pid=$!
wait -n "$api_pid" "$web_pid"
