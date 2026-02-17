# Kaplia Chat - Project Context

## Overview
Self-hosted live chat widget with WebSocket communication. Includes:
- **Server** (`chat-server/index.js`) - Node.js + Express + WebSocket + SQLite
- **Widget** (`chat-server/widget.js`) - Client-side chat widget for websites
- **Admin Panel** (`chat-server/admin-panel/`) - React (Vite) dashboard for support agents

## Tech Stack
- **Backend**: Node.js, Express, `ws` (WebSocket), `sqlite3`, `maxmind` (GeoIP), `nodemailer` (SMTP email)
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
│   ├── .env                  # Telegram credentials (not in git)
│   ├── chat.db               # SQLite database
│   ├── geo/                  # MaxMind GeoIP databases
│   │   ├── city.mmdb
│   │   └── country.mmdb
│   └── admin-panel/
│       ├── src/
│       │   ├── components/   # React components (EditUserModal, Sidebar, ChatArea, OptionsModal, WidgetConfigurator, etc.)
│       │   ├── context/      # ChatContext (global state)
│       │   ├── hooks/        # useWebSocket hook
│       │   ├── i18n/         # Internationalization (uk, en, ru)
│       │   └── utils/        # dateUtils, linkUtils, notificationSound, titleNotification, browserNotification
│       └── dist/             # Production build (served by server)
├── chat-client/
│   └── chat.html             # Example client integration
├── CLAUDE.md                 # Project context for AI assistants
└── README.md
```

## Architecture Notes

### WebSocket Messages (client <-> server)
- `auth_success` - Admin authenticated, returns config
- `client_msg` - Message from website visitor
- `admin_reply` - Reply from admin to client
- `user_list` - List of active sessions (includes lastMessage per session)
- `client_typing` - Real-time typing preview (spy mode)
- `admin_typing` - Admin is typing indicator (animated dots in widget)
- `history_data` - Chat history for session
- `system` - System notifications (shown as toast)
- `user_connected` - User opened page with widget (with msgId if saved to DB)
- `user_left` - User closed page (with msgId if saved to DB)
- `user_info_update` - User metadata changed (triggers addUser + setUserOnline + updateUserInfo)
- `tab_visibility` - User tab active/inactive state (UI only, no msgId)
- `system_event` - Delayed system event saved to DB (tab_active/tab_inactive)
- `chat_opened` / `chat_closed` - User opened/closed chat widget
- `page_visit` - User navigated to a page (includes URL)
- `admin_update_user` - Admin edits user name/notes (saves to clientInfo + SQLite)
- `reset_chat` - Admin deleted session, widget resets (new sessionId for anonymous)
- `search_chats` / `search_results` - Search by name, email, message text (debounced, min 2 chars)

### Database Tables
- `config` - Key-value settings (password, token, webhook, rate limits, etc.)
- `admins` - Admin accounts (username, password_hash, business_hours JSON, smtp_config JSON)
- `sessions` - User sessions with metadata (includes `current_url` for page tracking)
- `messages` - Chat messages (sender: 'client' | 'support' | 'system')
  - System messages have `text` like: `user_connected`, `user_left`, `tab_active`, `tab_inactive`, `chat_opened`, `chat_closed`, `page_visit:URL`

### Admin Panel State
- `ChatContext` - Global state (users, messages, config, activeUserId, onlineUsers, tabActiveUsers)
- `useWebSocket` - WebSocket connection, auto-reconnect, sound notifications, `updateUserInfoFromAdmin()`
- `I18nProvider` - Internationalization context (uk, en, ru languages)
- Settings stored in `localStorage`: `kaplia_admin_pass`, `kaplia_sound_enabled`, `kaplia_sound_type`, `kaplia_notifications_enabled`, `kaplia_widget_config`
- Language stored in database (`admin_language` column in config table)

### Key Admin Components
- `EditUserModal` - Edit user name (2-60 chars) and admin notes (0-300 chars)
- `Sidebar` - User list with online/tab indicators, notes icon, edit/delete buttons, search, last message preview
- `ChatArea` - Message list with pagination, input area, typing indicator
- `Modal` - Base modal wrapper (sizes: sm, md, lg, xl)
- `ConfirmModal` - Delete confirmation dialogs
- `OptionsModal` - Consolidated settings modal with tabs (Password, Token, Webhook, Time, Sound, Messages, Spam, Schedule, SMTP, Other, Widget)
- `WidgetConfigurator` - Widget code snippet generator (visual settings, i18n, metadata, localStorage-based)

### Key Utils
- `titleNotification.js` - Flashing tab title on new messages (startTitleFlash/stopTitleFlash)
- `notificationSound.js` - 10 notification sounds with preview
- `browserNotification.js` - Browser push notifications (permission request, click handler, localStorage toggle)
- `dateUtils.js` - Date/time formatting with timezone support
- `linkUtils.js` - URL detection and clickable link conversion

### Navigation Detection (Anti-Spam for System Logs)
Server uses delayed logging to distinguish page navigation from real events:
- `pendingDisconnects` - Map of userId -> timeoutId (3s delay before logging user_left)
- `recentPageVisits` - Map of userId -> timestamp (suppresses tab_visibility logs during navigation)
- `pendingTabVisibility` - Map of userId -> {timeoutId, isActive} (500ms delay, cancelled if page_visit comes)
- When user navigates: only `page_visit` is logged, not `user_left`/`user_connected`/`tab_*`

## Features Implemented
- Real-time chat via WebSocket
- Spy typing (see what user types before send)
- Admin typing indicator (animated dots in widget)
- Rate limiting (max messages/min, max message length)
- 10 notification sounds with preview
- Flashing tab title on new messages (when admin tab is in background)
- CORS control (allowed origins with wildcard)
- Remember me + auto-reconnect (silent reconnect without toast)
- Delete messages and sessions
- Edit user (name + admin notes) from sidebar with pencil button
- Notes indicator icon in sidebar (amber, with tooltip)
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
- Anonymous name form (widget asks for name, sends to server)
- Anonymous name generator (deterministic Ukrainian adjective + animal, e.g. "Смілива Коала")
- Welcome messages for new anonymous users (personalized greeting + admin notification)
- Anonymous session reset (new sessionId on admin delete, no auto-reconnect)
- GeoIP detection via MaxMind (country, region, city, IP)
- User-Agent parsing (platform + browser detection)
- SVG icons for widget buttons (send arrow + chat bubble)
- Auto-deploy via GitHub webhook (`deploy-webhook.js` on port 9000 + `deploy.sh`)
- Telegram notifications on successful deploy
- Search in sidebar (by name, email, message text) with debounce + loading animation
- Last message preview in sidebar (like Telegram/WhatsApp) with time + "You:" prefix
- Browser push notifications (native Notification API, click opens chat, toggle in settings)
- Widget configurator tab in settings (visual config, i18n, metadata, live code snippet, localStorage)
- Multiple simultaneous admin connections (all admin tabs/devices receive real-time updates)
- Business hours settings (per-day schedule with enabled/disabled toggle and time ranges)
- SMTP settings tab (host, port, user, password, from name, SSL/TLS toggle, test email with custom recipient)
- Offline contact form in widget (shown outside business hours: name, email, phone, message → email via SMTP)
- Notification emails config in Schedule tab (one email per line, used for offline form submissions)
- REST endpoints: `GET /api/business-hours` (public), `POST /api/contact-form` (public, sends email via nodemailer)
- Widget fetches business hours via REST on load (before WS connection, critical for anonymous users)
- `isBusinessOffline()` — client-side check using server timezone offset

## Auto-Deploy
```
git push → GitHub webhook → deploy-webhook.js (port 9000) → deploy.sh → pm2 restart → Telegram notification
```
- `deploy-webhook.js` - HMAC signature verification, listens on port 9000, PM2 process: `deploy-hook`
- `deploy.sh` - git pull, rsync files to ~/chat-server/, npm install, build admin panel, pm2 restart chat-widget
- Telegram notification sent after successful deploy (requires TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in .env)
- `.env` file in ~/chat-server/ (not in git) — loaded by deploy.sh
- Deploy logs: `~/chat-server/deploy.log`
- **Important**: Admin panel is NOT built locally. Only commit and push — auto-deploy builds on server.

## Git Tags
- `v1.0-native-js` - Old version with vanilla JS admin panel
