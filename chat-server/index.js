const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const path = require('path');
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
let allowedOrigins = [];

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
            allowedOrigins = (row.allowed_origins || '').split('\n').filter(o => o.trim());

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
                if (!colNames.includes('allowed_origins')) db.run("ALTER TABLE admins ADD COLUMN allowed_origins TEXT DEFAULT ''");
            });
        }
    });
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clients = new Map();
const clientInfo = new Map();
let adminSocket = null;

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

function saveMessage(sessionId, sender, text, timestamp, callback) {
    db.run("INSERT INTO messages (session_id, sender, text, timestamp) VALUES (?, ?, ?, ?)",
        [sessionId, sender, text, timestamp],
        function(err) {
            if (!err && callback) callback(this.lastID);
        }
    );
}

function updateSessionInfo(sessionId, metadata) {
    const jsonMeta = JSON.stringify(metadata);
    db.run(`INSERT INTO sessions (session_id, metadata, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(session_id) DO UPDATE SET metadata=excluded.metadata, updated_at=CURRENT_TIMESTAMP`, [sessionId, jsonMeta]);
}

function getHistory(sessionId, callback) {
    db.all("SELECT id, sender, text, timestamp FROM messages WHERE session_id = ? ORDER BY id ASC", [sessionId], (err, rows) => { if (!err) callback(rows); });
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
    res.sendFile(path.join(__dirname, 'admin.html'));
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
                    allowedOrigins: row.allowed_origins || ''
                }));

                getAllSessions((rows) => {
                    const usersList = rows.map(r => ({ id: r.session_id, info: JSON.parse(r.metadata || '{}') }));
                    ws.send(JSON.stringify({ type: 'user_list', users: usersList }));
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
                        if (data.type === 'update_allowed_origins') {
                            db.run("UPDATE admins SET allowed_origins = ? WHERE username = ?", [data.origins, 'admin'], () => {
                                allowedOrigins = data.origins.split('\n').filter(o => o.trim());
                                ws.send(JSON.stringify({ type: 'system', text: 'Дозволені домени збережено!' }));
                            });
                        }

                        if (data.type === 'get_history') {
                            getHistory(data.targetId, (rows) => ws.send(JSON.stringify({ type: 'history_data', targetId: data.targetId, messages: rows })));
                        }

                        if (data.type === 'admin_reply') {
                            const timestamp = new Date().toISOString();
                            saveMessage(data.targetId, 'support', data.text, timestamp, (newId) => {
                                sendToUserTabs(data.targetId, { text: data.text, sender: 'support', timestamp: timestamp, id: newId });
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

    ws.send(JSON.stringify({
        type: 'config',
        dateFormat: timeConfig.dateFormat,
        timeFormat: timeConfig.timeFormat,
        timezone: timeConfig.timezone
    }));

    getHistory(userId, (rows) => {
        if (rows.length > 0) ws.send(JSON.stringify({ type: 'history', messages: rows }));
    });

    ws.on('message', (message) => {
        try {
            const parsed = JSON.parse(message);

            if (parsed.type === 'typing_update') {
                if (realtimeTypingEnabled && adminSocket && adminSocket.readyState === WebSocket.OPEN) {
                    adminSocket.send(JSON.stringify({ type: 'client_typing', userId: userId, text: parsed.text }));
                }
                return;
            }

            if (parsed.type === 'client_info') {
                clientInfo.set(userId, parsed.metadata);
                updateSessionInfo(userId, parsed.metadata);
                if (adminSocket && adminSocket.readyState === WebSocket.OPEN) adminSocket.send(JSON.stringify({ type: 'user_info_update', id: userId, info: parsed.metadata }));
            }
            if (parsed.text) {
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
        if (!hasActive && adminSocket && adminSocket.readyState === WebSocket.OPEN) adminSocket.send(JSON.stringify({ type: 'user_left', id: userId }));
    });
});

server.listen(8080, () => { console.log('Chat Server running on port 8080'); });
