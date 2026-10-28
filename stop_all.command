#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Soudia Parts Ticketing System - Stop Script
# ═══════════════════════════════════════════════════════════════════════

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "🛑 Stopping Soudia Parts Ticketing System..."

if [ -f "$DIR/.backend.pid" ]; then
    PID=$(cat "$DIR/.backend.pid")
    echo "Stopping backend PID $PID..."
    kill "$PID" 2>/dev/null || true
    rm -f "$DIR/.backend.pid"
fi

if [ -f "$DIR/.frontend.pid" ]; then
    PID=$(cat "$DIR/.frontend.pid")
    echo "Stopping frontend PID $PID..."
    kill "$PID" 2>/dev/null || true
    rm -f "$DIR/.frontend.pid"
fi

# Also kill any leftover listeners on 4002 and 3003
lsof -ti :4002 | xargs kill -9 2>/dev/null || true
lsof -ti :3003 | xargs kill -9 2>/dev/null || true

echo "✅ All Soudia Parts Ticketing services stopped."
