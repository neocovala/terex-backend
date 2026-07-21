#!/usr/bin/env bash
# start.sh — Start the Terex POC frontend
# All backend logic now runs client-side in the browser (see frontend/src/backend/) — no server needed.
# Usage: bash start.sh

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}✓ $1${NC}"; }
step() { echo -e "\n${BLUE}── $1${NC}"; }

echo -e "${BLUE}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  NeoSoft Digital × Terex ESG POC         ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

step "Starting React frontend"
cd frontend
npm install -q
npm run start &
FRONTEND_PID=$!
log "Frontend started on http://localhost:3000"
sleep 2

step "Opening browser"
cmd.exe /C start http://localhost:3000 2>/dev/null || \
  xdg-open http://localhost:3000 2>/dev/null || \
  echo "Open http://localhost:3000 in your browser"

echo ""
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo -e "${GREEN}  Application is running!${NC}"
echo -e "${GREEN}  Frontend : http://localhost:3000${NC}"
echo -e "${GREEN}══════════════════════════════════════════${NC}"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $FRONTEND_PID 2>/dev/null; echo 'Stopped.'" EXIT
wait
