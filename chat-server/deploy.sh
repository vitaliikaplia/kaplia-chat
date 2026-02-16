#!/bin/bash
set -e

DEPLOY_DIR="$HOME/chat-server"
REPO_SUBDIR="chat-server"

cd "$DEPLOY_DIR"

# Load env variables (.env is not in git)
if [ -f "$DEPLOY_DIR/.env" ]; then
    export $(grep -v '^#' "$DEPLOY_DIR/.env" | xargs)
fi

echo "=== Deploy started at $(date) ==="

echo ">> git pull"
git pull origin master

echo ">> copy files from repo subdirectory"
# The repo root is kaplia-chat/, but server runs from ~/chat-server/
# After git pull, files are in ~/chat-server/chat-server/
# Copy them to ~/chat-server/ (the actual working directory)
cp -f "$DEPLOY_DIR/$REPO_SUBDIR/index.js" "$DEPLOY_DIR/"
cp -f "$DEPLOY_DIR/$REPO_SUBDIR/widget.js" "$DEPLOY_DIR/"
cp -f "$DEPLOY_DIR/$REPO_SUBDIR/package.json" "$DEPLOY_DIR/"
cp -f "$DEPLOY_DIR/$REPO_SUBDIR/deploy-webhook.js" "$DEPLOY_DIR/"
cp -f "$DEPLOY_DIR/$REPO_SUBDIR/deploy.sh" "$DEPLOY_DIR/"
rsync -a --delete "$DEPLOY_DIR/$REPO_SUBDIR/admin-panel/" "$DEPLOY_DIR/admin-panel/"

echo ">> npm install (server)"
cd "$DEPLOY_DIR"
npm install --production

echo ">> npm install (admin panel)"
cd "$DEPLOY_DIR/admin-panel"
npm install

echo ">> npm run build (admin panel)"
npm run build

echo ">> pm2 restart chat-widget"
cd "$DEPLOY_DIR"
pm2 restart chat-widget

echo "=== Deploy finished at $(date) ==="

# Telegram notification
if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    COMMIT_MSG=$(cd "$DEPLOY_DIR" && git log -1 --pretty=format:"%s")
    COMMIT_HASH=$(cd "$DEPLOY_DIR" && git log -1 --pretty=format:"%h")
    TEXT="✅ <b>Kaplia Chat deployed</b>%0A%0A<code>${COMMIT_HASH}</code> ${COMMIT_MSG}"
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="$TEXT" \
        -d parse_mode="HTML" > /dev/null 2>&1 || true
fi
