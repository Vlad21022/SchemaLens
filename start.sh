#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ┌─────────────────────────────┐"
echo "  │  SchemaLens — starting up   │"
echo "  └─────────────────────────────┘"
echo ""

# ── Backend ──────────────────────────────────────────────────────────────────
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  echo "→ Creating Python virtual environment…"
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "→ Installing Python dependencies…"
pip install -r requirements.txt -q

echo "→ Starting API server on http://localhost:8000"
uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "→ Installing frontend dependencies…"
  npm install
fi

echo "→ Starting dev server on http://localhost:5173"
echo ""
echo "  Open → http://localhost:5173"
echo ""

npm run dev

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null || true
