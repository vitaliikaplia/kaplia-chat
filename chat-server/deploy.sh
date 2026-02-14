#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Deploy started at $(date) ==="

echo ">> git pull"
git pull origin master

echo ">> npm install (server)"
npm install --production

echo ">> npm install (admin panel)"
cd admin-panel
npm install

echo ">> npm run build (admin panel)"
npm run build
cd ..

echo ">> pm2 restart chat-widget"
pm2 restart chat-widget

echo "=== Deploy finished at $(date) ==="
