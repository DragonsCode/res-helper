#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export UV_CACHE_DIR="${UV_CACHE_DIR:-$project_root/.data/uv-cache}"
export npm_config_cache="${npm_config_cache:-$project_root/.data/npm-cache}"
cd "$project_root/backend"
uv sync --frozen
uv run --frozen alembic upgrade head
cd "$project_root/frontend"
npm ci
npm run build
