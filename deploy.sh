#!/usr/bin/env bash
# DragFit deploy script
# Usage: ./deploy.sh
# Run after `git pull` on the production server.

set -euo pipefail

# Always run from the directory this script lives in
cd "$(dirname "$0")"

START_TIME=$(date +%s)

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
dim()  { printf "\033[2m%s\033[0m\n" "$1"; }
ok()   { printf "\033[32m✓\033[0m %s\n" "$1"; }

bold "▶ DragFit deploy"
dim  "  $(git log -1 --format='%h %s')"
echo

# ── Backend ────────────────────────────────────────────────
bold "[1/3] Backend"
pushd backend > /dev/null
npm install
npm run build
popd > /dev/null
ok "backend built"

# Heads-up if there are SQL migrations the user might need to apply manually
if [ -d backend/migrations ] && [ "$(ls -A backend/migrations 2>/dev/null)" ]; then
  dim  "  pending SQL migrations (review and run as needed):"
  ls backend/migrations | sed 's/^/    backend\/migrations\//'
fi
echo

# ── Frontend ───────────────────────────────────────────────
bold "[2/3] Frontend"
pushd frontend > /dev/null
npm install
rm -rf .next
npm run build
popd > /dev/null
ok "frontend built"
echo

# ── PM2 restart ────────────────────────────────────────────
bold "[3/3] PM2 restart"
if pm2 ping > /dev/null 2>&1; then
  pm2 restart all --update-env
  ok "pm2 reloaded"
  echo
  pm2 status
else
  echo "PM2 daemon not reachable — start it manually:"
  echo "  pm2 start ecosystem.config.js"
  exit 1
fi

ELAPSED=$(( $(date +%s) - START_TIME ))
echo
ok "Done in ${ELAPSED}s"
