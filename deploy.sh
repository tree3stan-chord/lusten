#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

# ── config ──────────────────────────────────────────────────────────────
SITE="lusten.musicsian.com"
WEB_ROOT="/var/www/$SITE"
RELEASES="$WEB_ROOT/releases"
CURRENT="$WEB_ROOT/current"
STAMP="${1:-$(date +%Y-%m-%d-%H%M%S)}"   # you can pass a stamp manually if you want
KEEP="${KEEP:-10}"                       # how many releases to keep
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGE="${STAGE_DIR:-$HOME/builds/$SITE/$STAMP}"

# ── ensure dirs exist ───────────────────────────────────────────────────
echo "▶ Ensure web root"
sudo install -d -m 0755 "$WEB_ROOT"
sudo install -d -m 0755 "$RELEASES"

# ── build application ──────────────────────────────────────────────────
echo "▶ Install dependencies"
npm ci

echo "▶ Build Next.js application"
npm run build

# ── stage application files ───────────────────────────────────────────
echo "▶ Stage application files → $STAGE"
mkdir -p "$STAGE"

# Copy all necessary files for the Next.js app
rsync -az --delete \
  --include '/.next/***' \
  --include '/node_modules/***' \
  --include '/public/***' \
  --include '/src/***' \
  --include '/package.json' \
  --include '/package-lock.json' \
  --include '/next.config.ts' \
  --include '/tsconfig.json' \
  --include '/postcss.config.mjs' \
  --include '/.env.local' \
  --exclude '/.env.local.example' \
  --exclude '/README.md' \
  --exclude '/deploy.sh' \
  --exclude '/.git/***' \
  --exclude '/.*' \
  "$PROJECT_DIR"/ "$STAGE"/

echo "▶ Verify staged content"
ls -l "$STAGE"
test -f "$STAGE/package.json" || { echo "✗ package.json missing in stage"; exit 1; }
test -d "$STAGE/.next" || { echo "✗ .next build output missing in stage"; exit 1; }
test -d "$STAGE/node_modules" || { echo "✗ node_modules missing in stage"; exit 1; }

# ── publish ─────────────────────────────────────────────────────────────
echo "▶ Publish → $RELEASES/$STAMP"
sudo rsync -az --delete "$STAGE"/ "$RELEASES/$STAMP"/

echo "▶ Verify release contents"
sudo test -f "$RELEASES/$STAMP/package.json" || { echo "✗ package.json missing in release"; exit 1; }
sudo test -d "$RELEASES/$STAMP/.next" || { echo "✗ .next build output missing in release"; exit 1; }
sudo test -d "$RELEASES/$STAMP/node_modules" || { echo "✗ node_modules missing in release"; exit 1; }

# show release contents for debugging
echo "▶ Release contents:"
sudo ls -la "$RELEASES/$STAMP"

# ── harden perms & preflight readability (as nginx user) ────────────────
echo "▶ Fix ownership/permissions"
sudo chown -R root:root "$RELEASES/$STAMP"
sudo find "$RELEASES/$STAMP" -type d -exec chmod 0755 {} +
sudo find "$RELEASES/$STAMP" -type f -exec chmod 0644 {} +

NGINX_USER="nginx"
if id "$NGINX_USER" >/dev/null 2>&1; then
  sudo -u "$NGINX_USER" test -r "$RELEASES/$STAMP/package.json" || { echo "✗ nginx user cannot read release files"; exit 1; }
else
  echo "! Warn: nginx user '$NGINX_USER' not found; skipping readability check"
fi

# ── flip symlink (with rollback trap) ───────────────────────────────────
echo "▶ Flip symlink"
# Save previous target for potential rollback
prev="$(readlink -f "$CURRENT" 2>/dev/null || true)"
if [[ -n "$prev" ]]; then
  echo "  Previous release: $prev"
fi

# Remove old symlink first, then create new one atomically
if [[ -L "$CURRENT" ]]; then
  sudo rm -f "$CURRENT"
fi
sudo ln -sfn "$RELEASES/$STAMP" "$CURRENT"

# Verify the symlink is correct
echo "▶ Verify symlink"
if [[ ! -L "$CURRENT" ]]; then
  echo "✗ $CURRENT is not a symlink"
  exit 1
fi

LINK_TARGET="$(readlink -f "$CURRENT")"
echo "  Current → $LINK_TARGET"

# Ensure the symlink points to the right place
if [[ "$LINK_TARGET" != "$RELEASES/$STAMP" ]]; then
  echo "✗ Symlink points to wrong location"
  echo "  Expected: $RELEASES/$STAMP"
  echo "  Got: $LINK_TARGET"
  exit 1
fi

# Setup rollback function
rollback() {
  echo "⚠️  Rolling back symlink to previous release"
  # Kill the new process
  if [[ -n "${LUSTEN_PID:-}" ]]; then
    kill "$LUSTEN_PID" 2>/dev/null || true
  fi
  if [[ -n "${prev:-}" ]] && [[ -d "$prev" ]]; then
    sudo ln -sfn "$prev" "$CURRENT"
    echo "  Rolled back to: $prev"
  else
    echo "  No previous release to rollback to"
  fi
}
trap 'rollback' ERR

# ── start application from deployed location ───────────────────────────
echo "▶ Start Next.js from deployed location"
# Kill any existing lusten process
pkill -f "next start" -u "$(whoami)" || true

# Start from the deployed location
cd "$RELEASES/$STAMP"
nohup npm start > "$HOME/lusten.log" 2>&1 &
LUSTEN_PID=$!
echo "Started Lusten with PID: $LUSTEN_PID"
echo "$LUSTEN_PID" > "$HOME/lusten.pid"
cd "$PROJECT_DIR"  # return to original directory

# ── selinux restore (safe if SELinux is permissive/disabled) ────────────
echo "▶ Restore SELinux context"
sudo restorecon -Rv "$RELEASES/$STAMP" >/dev/null 2>&1 || true
sudo restorecon -v  "$CURRENT" >/dev/null 2>&1 || true


# ── nginx reload (only if config passes) ────────────────────────────────
echo "▶ Test & reload Nginx"
if sudo nginx -t 2>/dev/null; then
  sudo systemctl reload nginx
  echo "  ✓ Nginx reloaded"
else
  echo "✗ nginx -t failed"
  exit 1
fi

# ── quick health check (non-fatal) ─────────────────────────────────────
sleep 2  # Give the app a moment to start
if command -v curl >/dev/null 2>&1; then
  echo "▶ Health check: GET http://localhost:3000/"
  if curl -fsS -o /dev/null -w "  Status: %{http_code}\n" "http://localhost:3000/" --max-time 10; then
    echo "  ✓ Next.js app responding"
  else
    echo "  ⚠ App health check failed (non-fatal)"
  fi
  
  echo "▶ Health check: GET https://$SITE/ (via proxy)"
  if curl -fsS -o /dev/null -w "  Status: %{http_code}\n" "https://$SITE/" --max-time 10; then
    echo "  ✓ Site responding via proxy"
  else
    echo "  ⚠ Proxy health check failed (non-fatal)"
  fi
fi

# ── prune old releases ──────────────────────────────────────────────────
echo "▶ Prune old releases (keep $KEEP)"
CURRENT_RELEASE="$(basename "$(readlink -f "$CURRENT")")"
OLD_RELEASES=$(sudo bash -c "ls -1dt $RELEASES/* 2>/dev/null | grep -v '$CURRENT_RELEASE' | tail -n +$((KEEP+1))" || true)
if [[ -n "$OLD_RELEASES" ]]; then
  echo "$OLD_RELEASES" | while read -r old_release; do
    echo "  Removing: $(basename "$old_release")"
  done
  echo "$OLD_RELEASES" | sudo xargs -r rm -rf
else
  echo "  No old releases to prune"
fi

echo "✓ Deployed $STAMP → $SITE"
echo "  Next.js app: http://localhost:3000/"
echo "  Live at: https://$SITE/"
echo "  PID file: $HOME/lusten.pid"
echo "  Logs: $HOME/lusten.log"