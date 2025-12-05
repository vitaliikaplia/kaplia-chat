const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./chat.db', (err) => {
    if (err) console.error('DB Error:', err.message);
    else console.log('Connected to SQLite database.');
});

const DEFAULT_API_TOKEN = 'MOJrnzS8pQyizRynxuuEJ98y8tPeJMg6';
let webhookConfig = { url: '', enabled: 0 };
let timeConfig = { timezone: '0', dateFormat: 'd.m.Y', timeFormat: 'H:i' };
let realtimeTypingEnabled = 0;
let systemLogsConfig = {
    onlineStatus: 1,    // user_connected, user_left
    tabActivity: 1,     // tab_active, tab_inactive
    chatWidget: 1,      // chat_opened, chat_closed
    pageVisits: 1       // page_visit
};
let allowedOrigins = [];
let rateLimitConfig = { maxMessagesPerMinute: 20, maxMessageLength: 1000 };
let messageLoadConfig = { adminMessagesLimit: 20, widgetMessagesLimit: 20 };

// Rate limiting storage: Map<sessionId, { timestamps: number[] }>
const rateLimitMap = new Map();

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS admins (
                                                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                  username TEXT UNIQUE,
                                                  password_hash TEXT,
                                                  api_token TEXT,
                                                  webhook_url TEXT,
                                                  webhook_enabled INTEGER DEFAULT 0,
                                                  timezone TEXT DEFAULT '0',
                                                  date_format TEXT DEFAULT 'd.m.Y',
                                                  time_format TEXT DEFAULT 'H:i',
                                                  realtime_typing INTEGER DEFAULT 0,
                                                  log_online_status INTEGER DEFAULT 1,
                                                  log_tab_activity INTEGER DEFAULT 1,
                                                  log_chat_widget INTEGER DEFAULT 1,
                                                  log_page_visits INTEGER DEFAULT 1,
                                                  allowed_origins TEXT DEFAULT ''
            )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
                                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                    session_id TEXT,
                                                    sender TEXT,
                                                    text TEXT,
                                                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

    db.run(`CREATE TABLE IF NOT EXISTS sessions (
                                                    session_id TEXT PRIMARY KEY,
                                                    metadata TEXT,
                                                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

    db.get("SELECT * FROM admins WHERE username = ?", ['admin'], (err, row) => {
        if (!row) {
            const hash = bcrypt.hashSync('1122334455667788', 10);
            db.run("INSERT INTO admins (username, password_hash, api_token) VALUES (?, ?, ?)",
                ['admin', hash, DEFAULT_API_TOKEN]);
            console.log("Default admin created.");
        } else {
            webhookConfig.url = row.webhook_url || '';
            webhookConfig.enabled = row.webhook_enabled || 0;
            timeConfig.timezone = row.timezone || '0';
            timeConfig.dateFormat = row.date_format || 'd.m.Y';
            timeConfig.timeFormat = row.time_format || 'H:i';
            realtimeTypingEnabled = row.realtime_typing || 0;
            systemLogsConfig.onlineStatus = row.log_online_status !== undefined ? row.log_online_status : 1;
            systemLogsConfig.tabActivity = row.log_tab_activity !== undefined ? row.log_tab_activity : 1;
            systemLogsConfig.chatWidget = row.log_chat_widget !== undefined ? row.log_chat_widget : 1;
            systemLogsConfig.pageVisits = row.log_page_visits !== undefined ? row.log_page_visits : 1;
            allowedOrigins = (row.allowed_origins || '').split('\n').filter(o => o.trim());
            rateLimitConfig.maxMessagesPerMinute = row.max_messages_per_minute || 20;
            rateLimitConfig.maxMessageLength = row.max_message_length || 1000;
            messageLoadConfig.adminMessagesLimit = row.admin_messages_limit || 20;
            messageLoadConfig.widgetMessagesLimit = row.widget_messages_limit || 20;

            db.all("PRAGMA table_info(admins)", (err, columns) => {
                const colNames = columns.map(c => c.name);
                if (!colNames.includes('api_token')) {
                    db.run("ALTER TABLE admins ADD COLUMN api_token TEXT", () => db.run("UPDATE admins SET api_token = ? WHERE username = 'admin'", [DEFAULT_API_TOKEN]));
                }
                if (!colNames.includes('webhook_url')) db.run("ALTER TABLE admins ADD COLUMN webhook_url TEXT");
                if (!colNames.includes('webhook_enabled')) db.run("ALTER TABLE admins ADD COLUMN webhook_enabled INTEGER DEFAULT 0");
                if (!colNames.includes('timezone')) db.run("ALTER TABLE admins ADD COLUMN timezone TEXT DEFAULT '0'");
                if (!colNames.includes('date_format')) db.run("ALTER TABLE admins ADD COLUMN date_format TEXT DEFAULT 'd.m.Y'");
                if (!colNames.includes('time_format')) db.run("ALTER TABLE admins ADD COLUMN time_format TEXT DEFAULT 'H:i'");
                if (!colNames.includes('realtime_typing')) db.run("ALTER TABLE admins ADD COLUMN realtime_typing INTEGER DEFAULT 0");
                if (!colNames.includes('log_online_status')) db.run("ALTER TABLE admins ADD COLUMN log_online_status INTEGER DEFAULT 1");
                if (!colNames.includes('log_tab_activity')) db.run("ALTER TABLE admins ADD COLUMN log_tab_activity INTEGER DEFAULT 1");
                if (!colNames.includes('log_chat_widget')) db.run("ALTER TABLE admins ADD COLUMN log_chat_widget INTEGER DEFAULT 1");
                if (!colNames.includes('log_page_visits')) db.run("ALTER TABLE admins ADD COLUMN log_page_visits INTEGER DEFAULT 1");
                if (!colNames.includes('allowed_origins')) db.run("ALTER TABLE admins ADD COLUMN allowed_origins TEXT DEFAULT ''");
                if (!colNames.includes('max_messages_per_minute')) db.run("ALTER TABLE admins ADD COLUMN max_messages_per_minute INTEGER DEFAULT 20");
                if (!colNames.includes('max_message_length')) db.run("ALTER TABLE admins ADD COLUMN max_message_length INTEGER DEFAULT 1000");
                if (!colNames.includes('admin_messages_limit')) db.run("ALTER TABLE admins ADD COLUMN admin_messages_limit INTEGER DEFAULT 20");
                if (!colNames.includes('widget_messages_limit')) db.run("ALTER TABLE admins ADD COLUMN widget_messages_limit INTEGER DEFAULT 20");
            });
        }
    });
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve React admin panel static files (excluding index.html which is handled by app.get('/'))
const adminBuildPath = path.join(__dirname, 'admin-panel', 'dist');
app.use(express.static(adminBuildPath, { index: false }));

const clients = new Map();
const clientInfo = new Map();
let adminSocket = null;

// Track pending disconnects for page navigation detection
const pendingDisconnects = new Map(); // userId -> timeoutId
const recentPageVisits = new Map(); // userId -> timestamp of last page_visit
const pendingTabVisibility = new Map(); // userId -> { timeoutId, isActive }
const NAVIGATION_GRACE_PERIOD = 3000; // 3 seconds to detect page navigation
const TAB_VISIBILITY_DELAY = 500; // delay before logging tab visibility

// Track last system event per user for deduplication
const lastSystemEvent = new Map(); // userId -> { eventType, timestamp }
const SYSTEM_EVENT_DEDUP_PERIOD = 60000; // 60 seconds - don't log same event twice within this period

function checkApiToken(token, callback) {
    if (!token) return callback(false);
    db.get("SELECT api_token FROM admins WHERE username = 'admin'", (err, row) => {
        if (row && row.api_token === token) callback(true); else callback(false);
    });
}

function checkOriginAllowed(origin) {
    if (allowedOrigins.length === 0) return true;
    return allowedOrigins.some(allowed => {
        const pattern = allowed.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`, 'i').test(origin);
    });
}

function checkRateLimit(sessionId) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    if (!rateLimitMap.has(sessionId)) {
        rateLimitMap.set(sessionId, { timestamps: [] });
    }

    const userData = rateLimitMap.get(sessionId);
    // Remove timestamps older than 1 minute
    userData.timestamps = userData.timestamps.filter(ts => ts > oneMinuteAgo);

    if (userData.timestamps.length >= rateLimitConfig.maxMessagesPerMinute) {
        return false; // Rate limit exceeded
    }

    userData.timestamps.push(now);
    return true;
}

function validateMessage(text) {
    if (!text || typeof text !== 'string') {
        return { valid: false, error: 'empty_message' };
    }
    if (text.length > rateLimitConfig.maxMessageLength) {
        return { valid: false, error: 'message_too_long', maxLength: rateLimitConfig.maxMessageLength };
    }
    return { valid: true };
}

function saveMessage(sessionId, sender, text, timestamp, callback) {
    db.run("INSERT INTO messages (session_id, sender, text, timestamp) VALUES (?, ?, ?, ?)",
        [sessionId, sender, text, timestamp],
        function(err) {
            if (!err && callback) callback(this.lastID);
        }
    );
}

// Check if this event should be deduplicated (same event too recently)
function shouldDeduplicateEvent(userId, eventType) {
    const lastEvent = lastSystemEvent.get(userId);
    const now = Date.now();

    if (lastEvent && lastEvent.eventType === eventType && (now - lastEvent.timestamp) < SYSTEM_EVENT_DEDUP_PERIOD) {
        return true; // Skip this event
    }

    // Update last event
    lastSystemEvent.set(userId, { eventType, timestamp: now });
    return false;
}

function saveSystemEvent(sessionId, eventType, callback) {
    // Check if this event type should be logged based on settings
    const eventTypeToSetting = {
        'user_connected': 'onlineStatus',
        'user_left': 'onlineStatus',
        'tab_active': 'tabActivity',
        'tab_inactive': 'tabActivity',
        'chat_opened': 'chatWidget',
        'chat_closed': 'chatWidget'
    };

    // page_visit events start with "page_visit:"
    const setting = eventType.startsWith('page_visit:') ? 'pageVisits' : eventTypeToSetting[eventType];

    if (setting && !systemLogsConfig[setting]) {
        return; // Skip saving if this log type is disabled
    }

    const timestamp = new Date().toISOString();
    // sender = 'system', text contains the event type (user_connected, user_left, tab_active, tab_inactive)
    db.run("INSERT INTO messages (session_id, sender, text, timestamp) VALUES (?, ?, ?, ?)",
        [sessionId, 'system', eventType, timestamp],
        function(err) {
            if (!err && callback) callback(this.lastID, timestamp);
        }
    );
}

function updateSessionInfo(sessionId, metadata) {
    const jsonMeta = JSON.stringify(metadata);
    db.run(`INSERT INTO sessions (session_id, metadata, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(session_id) DO UPDATE SET metadata=excluded.metadata, updated_at=CURRENT_TIMESTAMP`, [sessionId, jsonMeta]);
}

function getHistory(sessionId, callback, limit = null, beforeId = null, excludeSystem = false) {
    let query, params;
    const senderFilter = excludeSystem ? " AND sender != 'system'" : "";

    if (beforeId) {
        // Load older messages (before given ID)
        query = `SELECT id, sender, text, timestamp FROM messages WHERE session_id = ? AND id < ?${senderFilter} ORDER BY id DESC LIMIT ?`;
        params = [sessionId, beforeId, limit || 20];
    } else if (limit) {
        // Load latest messages with limit
        query = `SELECT * FROM (SELECT id, sender, text, timestamp FROM messages WHERE session_id = ?${senderFilter} ORDER BY id DESC LIMIT ?) ORDER BY id ASC`;
        params = [sessionId, limit];
    } else {
        // Load all (fallback)
        query = `SELECT id, sender, text, timestamp FROM messages WHERE session_id = ?${senderFilter} ORDER BY id ASC`;
        params = [sessionId];
    }
    db.all(query, params, (err, rows) => {
        if (!err) {
            // If we loaded older messages, reverse to get correct order
            if (beforeId) rows = rows.reverse();
            callback(rows);
        }
    });
}

function getAllSessions(callback) {
    db.all("SELECT session_id, metadata, updated_at FROM sessions ORDER BY updated_at DESC", [], (err, rows) => { if (!err) callback(rows); });
}

function sendToUserTabs(userId, data) {
    wss.clients.forEach(client => {
        if (client.userId === userId && client.readyState === WebSocket.OPEN) client.send(JSON.stringify(data));
    });
}

async function sendWebhook(userId, message, metadata, timestamp) {
    if (!webhookConfig.enabled || !webhookConfig.url) return;
    const payload = { session_data: [{ session_id: userId, metadata: metadata || {}, updated_at: timestamp }], message_text: message };
    try { await fetch(webhookConfig.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch (error) { console.error("Webhook Error:", error.message); }
}

const handleApiMessageSend = (targetId, message, res) => {
    const timestamp = new Date().toISOString();
    saveMessage(targetId, 'support', message, timestamp, (newId) => {
        sendToUserTabs(targetId, { text: message, sender: 'support', timestamp: timestamp, id: newId });
        if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
            adminSocket.send(JSON.stringify({ type: 'api_msg_sent', targetId: targetId, text: message, timestamp: timestamp, id: newId }));
        }
        res.json({ status: 'success', sent_to: targetId, message: message, id: newId });
    });
};

app.get('/', (req, res) => {
    if (req.query['get-all-chats-api'] === 'true') {
        const token = req.query.token;
        checkApiToken(token, (isValid) => {
            if (!isValid) return res.status(403).json({ error: 'Invalid Token' });
            getAllSessions((rows) => {
                const result = rows.map(r => ({ session_id: r.session_id, metadata: JSON.parse(r.metadata || '{}'), updated_at: r.updated_at }));
                res.json(result);
            });
        });
        return;
    }

    if (req.query['send-message-to-chat-api'] === 'true') {
        const token = req.query.token;
        const targetId = req.query.targetId;
        const message = req.query.message;
        checkApiToken(token, (isValid) => {
            if (!isValid) return res.status(403).json({ error: 'Invalid Token' });
            if (!targetId || !message) return res.status(400).json({ error: 'Missing targetId or message' });
            handleApiMessageSend(targetId, message, res);
        });
        return;
    }
    // Serve React admin panel
    const indexPath = path.join(adminBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Fallback to old admin.html if React build doesn't exist
        res.sendFile(path.join(__dirname, 'admin.html'));
    }
});

app.post('/', (req, res) => {
    if (req.query['send-message-to-chat-api'] === 'true') {
        const token = req.query.token || req.body.token;
        const targetId = req.body.targetId || req.query.targetId;
        const message = req.body.message || req.query.message;
        checkApiToken(token, (isValid) => {
            if (!isValid) return res.status(403).json({ error: 'Invalid Token' });
            if (!targetId || !message) return res.status(400).json({ error: 'Missing targetId or message' });
            handleApiMessageSend(targetId, message, res);
        });
        return;
    }
    res.status(404).send('Not Found');
});

app.get('/widget.js', (req, res) => res.sendFile(path.join(__dirname, 'widget.js')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'favicon.ico')));

wss.on('connection', (ws, req) => {
    const parameters = url.parse(req.url, true);
    const sessionId = parameters.query.session;
    const authPass = parameters.query.auth;
    const origin = req.headers.origin || '';

    if (authPass) {
        db.get("SELECT * FROM admins WHERE username = ?", ['admin'], (err, row) => {
            if (row && bcrypt.compareSync(authPass, row.password_hash)) {
                console.log('Admin connected');
                adminSocket = ws;
                ws.isAdmin = true;

                ws.send(JSON.stringify({
                    type: 'auth_success',
                    webhookConfig: webhookConfig,
                    apiToken: row.api_token,
                    timezone: timeConfig.timezone,
                    dateFormat: timeConfig.dateFormat,
                    timeFormat: timeConfig.timeFormat,
                    realtimeTyping: realtimeTypingEnabled,
                    systemLogs: systemLogsConfig,
                    allowedOrigins: row.allowed_origins || '',
                    maxMessagesPerMinute: rateLimitConfig.maxMessagesPerMinute,
                    maxMessageLength: rateLimitConfig.maxMessageLength,
                    adminMessagesLimit: messageLoadConfig.adminMessagesLimit,
                    widgetMessagesLimit: messageLoadConfig.widgetMessagesLimit
                }));

                getAllSessions((rows) => {
                    const usersList = rows.map(r => ({ id: r.session_id, info: JSON.parse(r.metadata || '{}') }));
                    ws.send(JSON.stringify({ type: 'user_list', users: usersList }));

                    // Send current online status for all connected users
                    const onlineUserIds = new Set();
                    const tabActiveUserIds = new Set();
                    wss.clients.forEach(client => {
                        if (client.userId && client.readyState === WebSocket.OPEN) {
                            onlineUserIds.add(client.userId);
                            if (client.tabActive) {
                                tabActiveUserIds.add(client.userId);
                            }
                        }
                    });
                    // Send online status for each user
                    onlineUserIds.forEach(userId => {
                        ws.send(JSON.stringify({ type: 'user_connected', id: userId }));
                        if (tabActiveUserIds.has(userId)) {
                            ws.send(JSON.stringify({ type: 'tab_visibility', userId: userId, isActive: true }));
                        }
                    });
                });

                ws.on('message', (message) => {
                    try {
                        const data = JSON.parse(message);
                        if (data.type === 'change_password') {
                            const newHash = bcrypt.hashSync(data.newPassword, 10);
                            db.run("UPDATE admins SET password_hash = ? WHERE username = ?", [newHash, 'admin'], () => ws.send(JSON.stringify({ type: 'system', text: 'Пароль успішно змінено!' })));
                        }
                        if (data.type === 'change_api_token') {
                            db.run("UPDATE admins SET api_token = ? WHERE username = ?", [data.newToken, 'admin'], () => ws.send(JSON.stringify({ type: 'system', text: 'Токен оновлено!' })));
                        }
                        if (data.type === 'update_webhook') {
                            const enabled = data.enabled ? 1 : 0;
                            db.run("UPDATE admins SET webhook_url = ?, webhook_enabled = ? WHERE username = ?", [data.url, enabled, 'admin'], () => {
                                webhookConfig.url = data.url; webhookConfig.enabled = enabled;
                                ws.send(JSON.stringify({ type: 'system', text: 'Webhook збережено!' }));
                            });
                        }
                        if (data.type === 'update_time_settings') {
                            db.run("UPDATE admins SET timezone = ?, date_format = ?, time_format = ? WHERE username = ?",
                                [data.timezone, data.dateFormat, data.timeFormat, 'admin'], () => {
                                    timeConfig.timezone = data.timezone;
                                    timeConfig.dateFormat = data.dateFormat;
                                    timeConfig.timeFormat = data.timeFormat;
                                    ws.send(JSON.stringify({ type: 'system', text: 'Налаштування часу збережено!' }));
                                });
                        }
                        if (data.type === 'update_realtime_typing') {
                            const enabled = data.enabled ? 1 : 0;
                            db.run("UPDATE admins SET realtime_typing = ? WHERE username = ?", [enabled, 'admin'], () => {
                                realtimeTypingEnabled = enabled;
                                ws.send(JSON.stringify({ type: 'system', text: `Перегляд набору: ${enabled ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}` }));
                            });
                        }
                        if (data.type === 'update_system_logs') {
                            const { setting, enabled } = data;
                            const value = enabled ? 1 : 0;
                            const columnMap = {
                                onlineStatus: 'log_online_status',
                                tabActivity: 'log_tab_activity',
                                chatWidget: 'log_chat_widget',
                                pageVisits: 'log_page_visits'
                            };
                            const column = columnMap[setting];
                            if (column) {
                                db.run(`UPDATE admins SET ${column} = ? WHERE username = ?`, [value, 'admin'], () => {
                                    systemLogsConfig[setting] = value;
                                    ws.send(JSON.stringify({ type: 'system_logs_updated', setting, enabled: value }));
                                });
                            }
                        }
                        if (data.type === 'update_allowed_origins') {
                            db.run("UPDATE admins SET allowed_origins = ? WHERE username = ?", [data.origins, 'admin'], () => {
                                allowedOrigins = data.origins.split('\n').filter(o => o.trim());
                                ws.send(JSON.stringify({ type: 'system', text: 'Дозволені домени збережено!' }));
                            });
                        }
                        if (data.type === 'update_rate_limit') {
                            db.run("UPDATE admins SET max_messages_per_minute = ?, max_message_length = ? WHERE username = ?",
                                [data.maxMessagesPerMinute, data.maxMessageLength, 'admin'], () => {
                                    rateLimitConfig.maxMessagesPerMinute = data.maxMessagesPerMinute;
                                    rateLimitConfig.maxMessageLength = data.maxMessageLength;
                                    ws.send(JSON.stringify({ type: 'system', text: 'Ліміти повідомлень збережено!' }));
                                });
                        }

                        if (data.type === 'get_history') {
                            const limit = data.limit || messageLoadConfig.adminMessagesLimit;
                            const beforeId = data.beforeId || null;
                            getHistory(data.targetId, (rows) => {
                                if (beforeId) {
                                    // Loading older messages
                                    const hasMore = rows.length === limit;
                                    ws.send(JSON.stringify({
                                        type: 'more_history',
                                        targetId: data.targetId,
                                        messages: rows,
                                        hasMore: hasMore
                                    }));
                                } else {
                                    // Initial load - check if there are older messages
                                    if (rows.length > 0) {
                                        const oldestId = rows[0].id;
                                        db.get("SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND id < ?", [data.targetId, oldestId], (err, result) => {
                                            ws.send(JSON.stringify({
                                                type: 'history_data',
                                                targetId: data.targetId,
                                                messages: rows,
                                                hasMore: result ? result.count > 0 : false
                                            }));
                                        });
                                    } else {
                                        ws.send(JSON.stringify({
                                            type: 'history_data',
                                            targetId: data.targetId,
                                            messages: rows,
                                            hasMore: false
                                        }));
                                    }
                                }
                            }, limit, beforeId);
                        }

                        if (data.type === 'update_message_limits') {
                            db.run("UPDATE admins SET admin_messages_limit = ?, widget_messages_limit = ? WHERE username = ?",
                                [data.adminMessagesLimit, data.widgetMessagesLimit, 'admin'], () => {
                                    messageLoadConfig.adminMessagesLimit = data.adminMessagesLimit;
                                    messageLoadConfig.widgetMessagesLimit = data.widgetMessagesLimit;
                                    ws.send(JSON.stringify({ type: 'system', text: 'Налаштування повідомлень збережено!' }));
                                });
                        }

                        if (data.type === 'admin_reply') {
                            const timestamp = new Date().toISOString();
                            saveMessage(data.targetId, 'support', data.text, timestamp, (newId) => {
                                sendToUserTabs(data.targetId, { text: data.text, sender: 'support', timestamp: timestamp, id: newId });
                                // Send confirmation back to admin
                                ws.send(JSON.stringify({ type: 'admin_msg_sent', targetId: data.targetId, text: data.text, timestamp: timestamp, id: newId }));
                            });
                        }

                        if (data.type === 'delete_message') {
                            db.run("DELETE FROM messages WHERE id = ?", [data.msgId], (err) => {
                                if (!err) {
                                    ws.send(JSON.stringify({ type: 'message_deleted', msgId: data.msgId }));
                                    sendToUserTabs(data.targetId, { type: 'message_deleted', msgId: data.msgId });
                                }
                            });
                        }

                        if (data.type === 'delete_system_messages') {
                            const targetId = data.targetId;
                            db.run("DELETE FROM messages WHERE session_id = ? AND sender = 'system'", [targetId], function(err) {
                                if (!err) {
                                    ws.send(JSON.stringify({ type: 'system_messages_deleted', targetId: targetId, count: this.changes }));
                                    ws.send(JSON.stringify({ type: 'system', text: `Видалено ${this.changes} системних повідомлень` }));
                                }
                            });
                        }

                        if (data.type === 'delete_session') {
                            const targetId = data.targetId;
                            db.serialize(() => {
                                db.run("DELETE FROM messages WHERE session_id = ?", [targetId]);
                                db.run("DELETE FROM sessions WHERE session_id = ?", [targetId], (err) => {
                                    if (!err) {
                                        ws.send(JSON.stringify({ type: 'session_deleted', id: targetId }));
                                        wss.clients.forEach(client => {
                                            if (client.userId === targetId) {
                                                if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'reset_chat' }));
                                                client.close();
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    } catch (e) { console.error(e); }
                });
                ws.on('close', () => { adminSocket = null; });
            } else { ws.close(); }
        });
        return;
    }

    if (!checkOriginAllowed(origin)) {
        console.log(`Origin blocked: ${origin}`);
        ws.close(4003, 'Origin not allowed');
        return;
    }

    const userId = sessionId || 'anon_' + Math.random().toString(36).substr(2, 5);
    ws.userId = userId;

    // Check if this is a reconnect after page navigation
    const pendingDisconnect = pendingDisconnects.get(userId);
    if (pendingDisconnect) {
        // Cancel the pending disconnect - user just navigated to another page
        clearTimeout(pendingDisconnect);
        pendingDisconnects.delete(userId);
        // Don't log user_connected since they were never really "disconnected"
        // Just notify admin that user is still online (for UI state)
        if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
            adminSocket.send(JSON.stringify({ type: 'user_connected', id: userId }));
        }
    } else {
        // This is a fresh connection - save and notify (with deduplication)
        if (!shouldDeduplicateEvent(userId, 'user_connected')) {
            saveSystemEvent(userId, 'user_connected', (msgId, timestamp) => {
                if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                    adminSocket.send(JSON.stringify({ type: 'user_connected', id: userId, msgId, timestamp }));
                }
            });
        } else {
            // Still notify admin for UI, but don't save to DB
            if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                adminSocket.send(JSON.stringify({ type: 'user_connected', id: userId }));
            }
        }
    }

    ws.send(JSON.stringify({
        type: 'config',
        dateFormat: timeConfig.dateFormat,
        timeFormat: timeConfig.timeFormat,
        timezone: timeConfig.timezone,
        messagesLimit: messageLoadConfig.widgetMessagesLimit
    }));

    getHistory(userId, (rows) => {
        if (rows.length > 0) {
            const oldestId = rows[0].id;
            // Count older non-system messages
            db.get("SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND id < ? AND sender != 'system'", [userId, oldestId], (err, result) => {
                ws.send(JSON.stringify({
                    type: 'history',
                    messages: rows,
                    hasMore: result ? result.count > 0 : false
                }));
            });
        } else {
            // Send empty history so client knows there's no history
            ws.send(JSON.stringify({
                type: 'history',
                messages: [],
                hasMore: false
            }));
        }
    }, messageLoadConfig.widgetMessagesLimit, null, true);

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);

            // Heartbeat ping - just respond with pong to keep connection alive
            if (parsed.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong' }));
                return;
            }

            // Load older messages for widget (excluding system messages)
            if (parsed.type === 'load_more') {
                const beforeId = parsed.beforeId;
                const limit = messageLoadConfig.widgetMessagesLimit;
                getHistory(userId, (rows) => {
                    const hasMore = rows.length === limit;
                    ws.send(JSON.stringify({
                        type: 'more_history',
                        messages: rows,
                        hasMore: hasMore
                    }));
                }, limit, beforeId, true);
                return;
            }

            if (parsed.type === 'typing_update') {
                if (realtimeTypingEnabled && adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                    adminSocket.send(JSON.stringify({ type: 'client_typing', userId: userId, text: parsed.text }));
                }
                return;
            }

            if (parsed.type === 'tab_visibility') {
                // Store tab active state on websocket object
                ws.tabActive = parsed.isActive;

                // Always update UI state immediately
                if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                    adminSocket.send(JSON.stringify({ type: 'tab_visibility', userId: userId, isActive: parsed.isActive }));
                }

                // Skip logging if this is part of page navigation
                const recentVisit = recentPageVisits.get(userId);
                if (pendingDisconnects.has(userId) || (recentVisit && Date.now() - recentVisit < NAVIGATION_GRACE_PERIOD)) {
                    return;
                }

                // Cancel previous pending tab visibility for this user
                const prevPending = pendingTabVisibility.get(userId);
                if (prevPending) {
                    clearTimeout(prevPending.timeoutId);
                }

                // Delay logging to check if page_visit comes soon (navigation detection)
                const timeoutId = setTimeout(() => {
                    pendingTabVisibility.delete(userId);
                    // Check again if page_visit happened
                    const recentVisitNow = recentPageVisits.get(userId);
                    if (recentVisitNow && Date.now() - recentVisitNow < NAVIGATION_GRACE_PERIOD) {
                        return; // Skip, was navigation
                    }
                    const eventType = parsed.isActive ? 'tab_active' : 'tab_inactive';
                    // Skip if same event was logged recently
                    if (shouldDeduplicateEvent(userId, eventType)) {
                        return;
                    }
                    saveSystemEvent(userId, eventType, (msgId, timestamp) => {
                        if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                            adminSocket.send(JSON.stringify({ type: 'system_event', userId: userId, eventType, msgId, timestamp }));
                        }
                    });
                }, TAB_VISIBILITY_DELAY);

                pendingTabVisibility.set(userId, { timeoutId, isActive: parsed.isActive });
                return;
            }

            if (parsed.type === 'chat_opened' || parsed.type === 'chat_closed') {
                saveSystemEvent(userId, parsed.type, (msgId, timestamp) => {
                    if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                        adminSocket.send(JSON.stringify({ type: parsed.type, userId: userId, msgId, timestamp }));
                    }
                });
                return;
            }

            if (parsed.type === 'page_visit') {
                const url = parsed.url;
                // Cancel any pending tab_visibility log (this was navigation, not real tab switch)
                const pendingTab = pendingTabVisibility.get(userId);
                if (pendingTab) {
                    clearTimeout(pendingTab.timeoutId);
                    pendingTabVisibility.delete(userId);
                }

                // Mark this user as having recent page visit (to suppress tab_visibility logs)
                recentPageVisits.set(userId, Date.now());
                setTimeout(() => {
                    const lastVisit = recentPageVisits.get(userId);
                    if (lastVisit && Date.now() - lastVisit >= NAVIGATION_GRACE_PERIOD) {
                        recentPageVisits.delete(userId);
                    }
                }, NAVIGATION_GRACE_PERIOD + 100);

                // Update current_url in session metadata
                const currentMeta = clientInfo.get(userId) || {};
                currentMeta.current_url = url;
                clientInfo.set(userId, currentMeta);
                updateSessionInfo(userId, currentMeta);

                // Always notify admin about URL change (for sidebar display)
                if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                    adminSocket.send(JSON.stringify({
                        type: 'user_info_update',
                        id: userId,
                        info: { current_url: url }
                    }));
                }

                // Save as system event with URL in text (respects systemLogs settings)
                saveSystemEvent(userId, `page_visit:${url}`, (msgId, timestamp) => {
                    if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                        adminSocket.send(JSON.stringify({
                            type: 'page_visit',
                            userId: userId,
                            url: url,
                            msgId,
                            timestamp
                        }));
                    }
                });
                return;
            }

            if (parsed.type === 'client_info') {
                clientInfo.set(userId, parsed.metadata);
                updateSessionInfo(userId, parsed.metadata);
                if (adminSocket && adminSocket.readyState === WebSocket.OPEN) adminSocket.send(JSON.stringify({ type: 'user_info_update', id: userId, info: parsed.metadata }));
            }
            if (parsed.text) {
                // Validate message
                const validation = validateMessage(parsed.text);
                if (!validation.valid) {
                    ws.send(JSON.stringify({ type: 'error', error: validation.error, maxLength: validation.maxLength }));
                    return;
                }

                // Check rate limit
                if (!checkRateLimit(userId)) {
                    ws.send(JSON.stringify({ type: 'error', error: 'rate_limit_exceeded', maxPerMinute: rateLimitConfig.maxMessagesPerMinute }));
                    return;
                }

                const timestamp = new Date().toISOString();
                saveMessage(userId, 'client', parsed.text, timestamp, (newId) => {
                    const meta = clientInfo.get(userId);
                    sendWebhook(userId, parsed.text, meta, timestamp);

                    if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                        adminSocket.send(JSON.stringify({
                            type: 'client_msg',
                            from: userId,
                            text: parsed.text,
                            info: meta,
                            timestamp: timestamp,
                            id: newId
                        }));
                    }

                    wss.clients.forEach(client => {
                        if (client.userId === userId && client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({
                                type: 'sync_message',
                                text: parsed.text,
                                sender: 'me',
                                timestamp: timestamp,
                                id: newId
                            }));
                        }
                    });
                });
            }
        } catch (e) { console.error(e); }
    });

    ws.on('close', () => {
        let hasActive = false;
        for (const c of wss.clients) { if (c.userId === userId && c.readyState === WebSocket.OPEN) { hasActive = true; break; } }
        if (!hasActive) {
            // Delay the disconnect to detect page navigation
            const timeoutId = setTimeout(() => {
                pendingDisconnects.delete(userId);
                // Check again if user reconnected
                let stillActive = false;
                for (const c of wss.clients) { if (c.userId === userId && c.readyState === WebSocket.OPEN) { stillActive = true; break; } }
                if (!stillActive) {
                    // Skip if same event was logged recently
                    if (!shouldDeduplicateEvent(userId, 'user_left')) {
                        saveSystemEvent(userId, 'user_left', (msgId, timestamp) => {
                            if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                                adminSocket.send(JSON.stringify({ type: 'user_left', id: userId, msgId, timestamp }));
                            }
                        });
                    }
                }
            }, NAVIGATION_GRACE_PERIOD);
            pendingDisconnects.set(userId, timeoutId);

            // Notify admin immediately about offline status (for UI), but don't save to DB yet
            if (adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                adminSocket.send(JSON.stringify({ type: 'user_left', id: userId }));
            }
        }
    });
});

server.listen(8080, () => { console.log('Chat Server running on port 8080'); });
