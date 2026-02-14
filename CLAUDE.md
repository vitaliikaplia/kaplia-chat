# Kaplia Chat - Project Context

## Overview
Self-hosted live chat widget with WebSocket communication. Includes:
- **Server** (`chat-server/index.js`) - Node.js + Express + WebSocket + SQLite
- **Widget** (`chat-server/widget.js`) - Client-side chat widget for websites
- **Admin Panel** (`chat-server/admin-panel/`) - React (Vite) dashboard for support agents

## Tech Stack
- **Backend**: Node.js, Express, `ws` (WebSocket), `sqlite3`, `maxmind` (GeoIP)
- **Frontend (Admin)**: React 19, Vite, Tailwind CSS
- **Database**: SQLite (`chat-server/chat.db`)

## Key Commands

```bash
# Admin panel development
cd chat-server/admin-panel
npm install
npm run dev      # Dev server on localhost:5173
npm run build    # Build to dist/

# Server (production)
pm2 restart chat-widget
```

## Project Structure

```
kaplia-chat/
├── chat-server/
│   ├── index.js              # Main server (WebSocket + API + static)
│   ├── widget.js             # Client widget script
│   ├── deploy-webhook.js     # GitHub webhook receiver (port 9000)
│   ├── deploy.sh             # Auto-deploy shell script
│   ├── chat.db               # SQLite database
│   ├── geo/                  # MaxMind GeoIP databases
│   │   ├── city.mmdb
│   │   └── country.mmdb
│   └── admin-panel/
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── context/      # ChatContext (global state)
│       │   ├── hooks/        # useWebSocket hook
│       │   ├── i18n/         # Internationalization (uk, en, ru)
│       │   └── utils/        # dateUtils, linkUtils, notificationSound
│       └── dist/             # Production build (served by server)
├── chat-client/
│   └── chat.html             # Example client integration
└── README.md
```

## Architecture Notes

### WebSocket Messages (client <-> server)
- `auth_success` - Admin authenticated, returns config
- `client_msg` - Message from website visitor
- `admin_reply` - Reply from admin to client
- `user_list` - List of active sessions
- `client_typing` - Real-time typing preview (spy mode)
- `history_data` - Chat history for session
- `system` - System notifications (shown as toast)
- `user_connected` - User opened page with widget (with msgId if saved to DB)
- `user_left` - User closed page (with msgId if saved to DB)
- `tab_visibility` - User tab active/inactive state (UI only, no msgId)
- `system_event` - Delayed system event saved to DB (tab_active/tab_inactive)
- `chat_opened` / `chat_closed` - User opened/closed chat widget
- `page_visit` - User navigated to a page (includes URL)

### Database Tables
- `config` - Key-value settings (password, token, webhook, rate limits, etc.)
- `sessions` - User sessions with metadata (includes `current_url` for page tracking)
- `messages` - Chat messages (sender: 'client' | 'support' | 'system')
  - System messages have `text` like: `user_connected`, `user_left`, `tab_active`, `tab_inactive`, `chat_opened`, `chat_closed`, `page_visit:URL`

### Admin Panel State
- `ChatContext` - Global state (users, messages, config, activeUserId, onlineUsers, tabActiveUsers)
- `useWebSocket` - WebSocket connection, auto-reconnect, sound notifications
- `I18nProvider` - Internationalization context (uk, en, ru languages)
- Settings stored in `localStorage`: `kaplia_admin_pass`, `kaplia_sound_enabled`, `kaplia_sound_type`
- Language stored in database (`admin_language` column in config table)

### Navigation Detection (Anti-Spam for System Logs)
Server uses delayed logging to distinguish page navigation from real events:
- `pendingDisconnects` - Map of userId -> timeoutId (3s delay before logging user_left)
- `recentPageVisits` - Map of userId -> timestamp (suppresses tab_visibility logs during navigation)
- `pendingTabVisibility` - Map of userId -> {timeoutId, isActive} (500ms delay, cancelled if page_visit comes)
- When user navigates: only `page_visit` is logged, not `user_left`/`user_connected`/`tab_*`

## Features Implemented
- Real-time chat via WebSocket
- Spy typing (see what user types before send)
- Rate limiting (max messages/min, max message length)
- 10 notification sounds with preview
- CORS control (allowed origins with wildcard)
- Remember me + auto-reconnect (silent reconnect without toast)
- Delete messages and sessions
- Webhook for incoming messages
- REST API for sending messages
- Timezone/date format settings
- Toast notifications for all actions
- User online/offline status with visual indicators
- Tab activity tracking (active/background)
- Activity log (system messages) saved to DB
- Page URL tracking with navigation detection
- Smart navigation detection (no spam during page transitions)
- WebSocket heartbeat/ping-pong (keeps connection alive in throttled tabs)
- Message pagination with lazy loading (admin panel + widget)
- Configurable message limits (separate for admin and widget)
- Delete system messages from chat (clear activity log)
- Consolidated settings modal with tabs
- Granular system logs control (4 separate toggles: online status, tab activity, chat widget, page visits)
- Internationalization (i18n) - Ukrainian, English, Russian languages
- Mobile responsive design with swipe gestures
- Anonymous users support (separate domain list, lazy WebSocket connect)
- Anonymous name generator (deterministic Ukrainian adjective + animal, e.g. "Смілива Коала")
- GeoIP detection via MaxMind (country, region, city, IP)
- User-Agent parsing (platform + browser detection)
- Auto-deploy via GitHub webhook (`deploy-webhook.js` on port 9000 + `deploy.sh`)

## Auto-Deploy
```
git push → GitHub webhook → deploy-webhook.js (port 9000) → deploy.sh → pm2 restart
```
- `deploy-webhook.js` - HMAC signature verification, listens on port 9000
- `deploy.sh` - git pull, copy files, npm install, build admin panel, pm2 restart
- PM2 process name: `deploy-hook`

## Git Tags
- `v1.0-native-js` - Old version with vanilla JS admin panel
