# Kaplia Chat Admin Panel

React + Vite dashboard for Kaplia Chat support agents.

## Stack

- React 19
- Vite
- Tailwind CSS
- WebSocket connection to the main Node.js server

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

The production deploy builds this app on the server through `chat-server/deploy.sh`. Do not rely on a locally generated `dist/` for deployment.

## Main Files

- `src/App.jsx` - authenticated app shell, modals, sidebar/chat layout, notification settings
- `src/context/ChatContext.jsx` - global chat state, users, messages, config, notifications
- `src/hooks/useWebSocket.js` - admin WebSocket protocol, reconnects, server message handling
- `src/components/Sidebar.jsx` - chat list, online/tab indicators, search, edit/delete actions
- `src/components/ChatArea.jsx` - active conversation, pagination, typing, activity log cleanup
- `src/components/OptionsModal.jsx` - consolidated settings tabs including Telegram, SMTP, schedule, widget configurator
- `src/components/WidgetConfigurator.jsx` - embed snippet and visual widget configuration
- `src/i18n/` - Ukrainian, English, and Russian translations
- `src/utils/` - date formatting, links, notification sounds, title flash, browser notifications

## Runtime Notes

- Admin authentication uses `kaplia_admin_pass` in `localStorage` for remember-me reconnects.
- Server config arrives via `auth_success` and is merged into `ChatContext.config`.
- Telegram settings are managed from the Telegram tab and stored server-side in the `admins` table.
- Incoming visitor messages may include a `pageUrl`; the server stores it as `current_url`, which is shown in the chat header and forwarded to Telegram details as `Page`.
