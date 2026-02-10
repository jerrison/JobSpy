#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRESH=false

for arg in "$@"; do
  case "$arg" in
    --fresh) FRESH=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

# --- Check ports ---
for port in 8000 5173; do
  if lsof -ti:"$port" >/dev/null 2>&1; then
    echo "Port $port is in use. Free it with:"
    echo "  lsof -ti:$port | xargs kill -9"
    exit 1
  fi
done

# --- Backend deps ---
cd "$ROOT/backend"

if [ "$FRESH" = true ] || [ ! -d .venv ]; then
  echo "Installing backend deps..."
  uv sync
else
  echo "Backend .venv exists, skipping uv sync"
fi

if [ "$FRESH" = true ] || ! uv pip show python-jobspy >/dev/null 2>&1; then
  echo "Installing python-jobspy (editable)..."
  uv pip install -e ..
else
  echo "python-jobspy already installed, skipping"
fi

# --- Frontend deps ---
cd "$ROOT/frontend"

if [ "$FRESH" = true ] || [ ! -d node_modules ]; then
  echo "Installing frontend deps..."
  npm install
else
  echo "node_modules exists, skipping npm install"
fi

# --- Start servers ---
cd "$ROOT/backend"
echo "Starting backend on :8000..."
uv run uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup INT TERM

cd "$ROOT/frontend"
echo "Starting frontend on :5173..."
npx vite --host
