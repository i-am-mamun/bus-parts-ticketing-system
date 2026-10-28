#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Soudia Parts Ticketing System - Unified Startup Script
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "================================================================="
echo "🚌 Starting Soudia Coach Parts Ticketing System (সৌদিয়া পার্টস টিকেটিং)"
echo "================================================================="

# 1. Check MySQL
if ! nc -z 127.0.0.1 3306 2>/dev/null; then
    echo "⚠️ Warning: Local MySQL on port 3306 is not reachable."
    echo "Make sure MySQL server is running ('mysql.server start' or Homebrew services)."
fi

# 2. Start Backend (FastAPI on port 4002)
echo "▶️ Launching Backend on http://127.0.0.1:4002..."
cd "$DIR/backend"
if [ ! -d ".venv" ]; then
    echo "Creating python virtualenv..."
    /opt/homebrew/bin/python3.12 -m venv .venv
    .venv/bin/pip install -r requirements.txt
fi
.venv/bin/python -m uvicorn app.main:app --port 4002 --reload > "$DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait a second for backend to bind port
sleep 1.5

# 3. Start Frontend (Next.js on port 3003)
echo "▶️ Launching Frontend on http://localhost:3003..."
cd "$DIR/frontend"
npm run dev > "$DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "$BACKEND_PID" > "$DIR/.backend.pid"
echo "$FRONTEND_PID" > "$DIR/.frontend.pid"

echo "================================================================="
echo "✅ Soudia Parts Ticketing System is now LIVE!"
echo "🌐 Application URL:  http://localhost:3003"
echo "🔧 Backend API Docs: http://127.0.0.1:4002/docs"
echo "🔑 Default Login:   Username: admin | Password: Admin@12345"
echo "================================================================="

# Open browser
sleep 2
open "http://localhost:3003" || true

echo "Press Ctrl+C to stop services or run ./stop_all.command"
wait $BACKEND_PID $FRONTEND_PID
