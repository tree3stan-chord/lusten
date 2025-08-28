#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

# ── config ──────────────────────────────────────────────────────────────
SITE="lusten.musicsian.com"
WEB_ROOT="/var/www/$SITE"
STAMP="${1:-$(date +%Y-%m-%d-%H%M%S)}"
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── build and deploy ────────────────────────────────────────────────────
echo "▶ Install dependencies"
npm install

echo "▶ Build Next.js application"
npm run build

echo "▶ Deploy to web root"
sudo rsync -az --delete \
  --include '/.next/***' \
  --include '/node_modules/***' \
  --include '/public/***' \
  --include '/src/***' \
  --include '/package.json' \
  --include '/package-lock.json' \
  --include '/next.config.ts' \
  --exclude '/.git/***' \
  --exclude '/.*' \
  --exclude '/deploy.sh' \
  "$PROJECT_DIR"/ "$WEB_ROOT"/

# ── fix permissions ─────────────────────────────────────────────────────
echo "▶ Fix ownership/permissions"
sudo chown -R root:root "$WEB_ROOT"
sudo find "$WEB_ROOT" -type d -exec chmod 0755 {} +
sudo find "$WEB_ROOT" -type f -exec chmod 0644 {} +
# Make next binary executable
sudo chmod +x "$WEB_ROOT/node_modules/.bin/next"

# ── start application ───────────────────────────────────────────────────
echo "▶ Start Next.js application"
echo "DEBUG: Current directory: $(pwd)"
echo "DEBUG: Changing to: $WEB_ROOT"
cd "$WEB_ROOT"
echo "DEBUG: Now in: $(pwd)"
echo "DEBUG: Contents: $(ls -la)"

# Kill existing process if running
echo "DEBUG: Checking for existing PID file"
if [ -f /tmp/lusten.pid ]; then
    OLD_PID=$(cat /tmp/lusten.pid)
    echo "DEBUG: Found existing PID: $OLD_PID"
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "  Stopping existing process $OLD_PID"
        kill "$OLD_PID"
        sleep 2
    fi
else
    echo "DEBUG: No existing PID file"
fi

# Also kill any process using port 3000
echo "DEBUG: Checking for processes on port 3000"
PORT_3000_OUTPUT=$(ss -tulpn | grep :3000 || echo "")
echo "DEBUG: Port 3000 output: '$PORT_3000_OUTPUT'"
if [ -n "$PORT_3000_OUTPUT" ]; then
    EXISTING_PID=$(echo "$PORT_3000_OUTPUT" | sed -n 's/.*pid=\([0-9]*\).*/\1/p' | head -1)
    if [ -n "$EXISTING_PID" ]; then
        echo "  Killing process $EXISTING_PID using port 3000"
        kill "$EXISTING_PID" 2>/dev/null || true
        sleep 2
    else
        echo "DEBUG: Could not extract PID from port output"
    fi
else
    echo "DEBUG: No process found on port 3000"
fi

# Start new process 
echo "DEBUG: About to start Next.js..."
echo "DEBUG: Running: npm start > /tmp/lusten.log 2>&1 &"
nohup npm start > /tmp/lusten.log 2>&1 &
START_PID=$!
echo "DEBUG: Background process started"
echo $START_PID > /tmp/lusten.pid
echo "  Started with PID: $START_PID"
echo "DEBUG: PID saved to file"

# Wait and check if process is still running
sleep 5
if kill -0 "$START_PID" 2>/dev/null; then
    echo "  ✓ Process is running on port 3000"
    # Verify it's actually listening
    if ss -tulpn | grep -q :3000; then
        echo "  ✓ Service is listening on port 3000"
    else
        echo "  ⚠ Process running but not listening on port 3000"
    fi
else
    echo "  ✗ Process failed to start"
    echo "  Log output:"
    cat /tmp/lusten.log 2>/dev/null || echo "  No log output available"
    exit 1
fi

# ── selinux restore ─────────────────────────────────────────────────────
echo "▶ Restore SELinux context"
sudo restorecon -Rv "$WEB_ROOT" >/dev/null 2>&1 || true

echo "✓ Deployed $SITE"
echo "  PID: $(cat /tmp/lusten.pid 2>/dev/null || echo 'unknown')"
echo ""
echo "▶ Visit: https://$SITE/"