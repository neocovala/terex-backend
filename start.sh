#!/usr/bin/env bash
# start.sh — Start the full Terex POC application
# Run this from WSL2 Ubuntu terminal
# Usage: bash start.sh

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
step() { echo -e "\n${BLUE}── $1${NC}"; }

echo -e "${BLUE}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  NeoSoft Digital × Terex ESG · GCP POC  ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Check GCP auth ────────────────────────────────────────────────────────────
step "Checking GCP authentication"
if ! gcloud auth application-default print-access-token &>/dev/null; then
  warn "Not authenticated. Running: gcloud auth application-default login"
  gcloud auth application-default login
fi
log "GCP authenticated"

export GCP_PROJECT_ID="${GCP_PROJECT_ID:-terex-neosoft-poc}"
export GCP_REGION="${GCP_REGION:-us-central1}"
log "Project: $GCP_PROJECT_ID  Region: $GCP_REGION"

# ── Backend ───────────────────────────────────────────────────────────────────
step "Starting FastAPI backend"
cd backend
pip install -r requirements.txt -q
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
log "Backend started on http://localhost:8000  (PID $BACKEND_PID)"
sleep 2

# ── Frontend ──────────────────────────────────────────────────────────────────
step "Starting React frontend"
cd ../frontend
npm install -q
npm run dev &
FRONTEND_PID=$!
log "Frontend started on http://localhost:3000"
sleep 2

# ── Open browser ──────────────────────────────────────────────────────────────
step "Opening browser"
# Windows: open via cmd.exe from WSL2
cmd.exe /C start http://localhost:3000 2>/dev/null || \
  xdg-open http://localhost:3000 2>/dev/null || \
  echo "Open http://localhost:3000 in your browser"

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Application is running!${NC}"
echo -e "${GREEN}  Frontend : http://localhost:3000${NC}"
echo -e "${GREEN}  API docs : http://localhost:8000/docs${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
