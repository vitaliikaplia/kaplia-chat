(function() {
    const SERVER_URL = 'wss://chat.kaplia.pro';

    const config = window.KapliaChatConfig || { defaultLanguage: 'ua', initialMessages: ["Привіт!"], i18n: { ua: { title: 'Чат', subtitle: '', inputPlaceholder: '...', sendBtn: 'Send' } }, metadata: {}, useAdminTimezone: false };
    const lang = config.defaultLanguage || 'en';
    const texts = config.i18n[lang] || config.i18n['en'] || config.i18n['ua'];

    const style = document.createElement('style');
    style.innerHTML = `
        #kaplia-widget .kaplia-chat-btn { position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; background: #007bff; color: white; border-radius: 50%; border: none; font-size: 30px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 99999; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
        #kaplia-widget .kaplia-chat-btn:hover { transform: scale(1.1); }
        #kaplia-widget .kaplia-chat-box { position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 5px 25px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        #kaplia-widget .k-header { background: #007bff; color: white; padding: 15px; }
        #kaplia-widget .k-title { font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; }
        #kaplia-widget .k-subtitle { font-size: 12px; opacity: 0.9; margin-top: 5px; }
        #kaplia-widget .k-close { cursor: pointer; }
        #kaplia-widget .k-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
        #kaplia-widget .k-msg { padding: 8px 12px; border-radius: 10px; max-width: 80%; font-size: 14px; word-wrap: break-word; position: relative; min-width: 50px; }
        #kaplia-widget .k-msg.me { background: #007bff; color: white; align-self: flex-end; }
        #kaplia-widget .k-msg.support { background: #e9ecef; color: #333; align-self: flex-start; }
        #kaplia-widget .k-time { display: block; font-size: 10px; text-align: right; margin-top: 4px; opacity: 0.7; }
        #kaplia-widget .k-date-divider { align-self: center; background: rgba(0,0,0,0.1); color: #555; padding: 2px 8px; border-radius: 8px; font-size: 11px; margin: 10px 0; }
        #kaplia-widget .k-input-area { padding: 10px; border-top: 1px solid #ddd; display: flex; gap: 10px; background: white; }
        #kaplia-widget .k-input-area input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; }
        #kaplia-widget .k-input-area button { padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 20px; cursor: pointer; }
        
        /* Стиль для посилань у віджеті */
        #kaplia-widget .k-msg a { color: inherit; text-decoration: underline; font-weight: bold; }
    `;
    document.head.appendChild(style);

    const chatContainer = document.createElement('div');
    chatContainer.id = 'kaplia-widget';
    chatContainer.innerHTML = `<button class="kaplia-chat-btn" id="kChatBtn">💬</button><div class="kaplia-chat-box" id="kChatBox"><div class="k-header"><div class="k-title"><span>${texts.title}</span><span class="k-close" id="kCloseBtn">×</span></div><div class="k-subtitle">${texts.subtitle}</div></div><div class="k-messages" id="kMsgs"></div><div class="k-input-area"><input type="text" id="kInput" placeholder="${texts.inputPlaceholder}"><button id="kSendBtn">${texts.sendBtn || 'Send'}</button></div></div>`;
    document.body.appendChild(chatContainer);

    const box = document.getElementById('kChatBox');
    const msgs = document.getElementById('kMsgs');
    const inp = document.getElementById('kInput');
    let ws;
    let hasHistory = false;
    let sessionId;
    let lastRenderedDate = null;
    let clientDateFormat = 'd.m.Y';
    let clientTimeFormat = 'H:i';
    let serverTimezone = 0;

    if (config.metadata && config.metadata.user_id) { sessionId = 'auth_' + config.metadata.user_id; localStorage.setItem('kaplia_chat_id', sessionId); }
    else { sessionId = localStorage.getItem('kaplia_chat_id'); if (!sessionId || sessionId.startsWith('auth_')) { sessionId = 'guest_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('kaplia_chat_id', sessionId); } }

    function formatDatePHPStyle(dateObj, formatString) {
        let targetDate = dateObj;
        if (config.useAdminTimezone) {
            const utcMs = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
            targetDate = new Date(utcMs + (serverTimezone * 3600000));
        }
        const d = targetDate.getDate(), m = targetDate.getMonth() + 1, Y = targetDate.getFullYear();
        const H = targetDate.getHours(), i = targetDate.getMinutes(), s = targetDate.getSeconds();
        const pad = (n) => n < 10 ? '0' + n : n;
        const g = H % 12 || 12, A = H >= 12 ? 'PM' : 'AM';
        let result = formatString;
        result = result.replace(/d/g, pad(d)).replace(/m/g, pad(m)).replace(/Y/g, Y);
        result = result.replace(/H/g, pad(H)).replace(/i/g, pad(i)).replace(/s/g, pad(s)).replace(/g/g, g).replace(/A/g, A);
        return result;
    }

    // --- LINK FORMATTER ---
    function formatTextWithLinks(text) {
        let safeText = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return safeText.replace(urlRegex, function(url) {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });
    }

    function renderDateDivider(isoString) {
        if (!isoString) return;
        const date = new Date(isoString);
        const dateStr = formatDatePHPStyle(date, clientDateFormat);
        if (dateStr !== lastRenderedDate) { lastRenderedDate = dateStr; const div = document.createElement('div'); div.className = 'k-date-divider'; div.innerText = dateStr; msgs.appendChild(div); }
    }

    function showInitialMessages() {
        if (!hasHistory && config.initialMessages && config.initialMessages.length > 0) {
            const now = new Date().toISOString();
            config.initialMessages.forEach(msg => addMsg(msg, 'support', now, null, true));
        }
    }

    function scrollToBottom() { msgs.scrollTop = msgs.scrollHeight; }

    function openWidget() {
        const isHidden = box.style.display === 'none' || box.style.display === '';
        if (isHidden) { box.style.display = 'flex'; setTimeout(() => { inp.focus(); scrollToBottom(); }, 100); } else { scrollToBottom(); }
    }

    function connect() {
        ws = new WebSocket(`${SERVER_URL}?session=${sessionId}`);
        ws.onopen = () => { if (config.metadata) ws.send(JSON.stringify({ type: 'client_info', metadata: config.metadata })); };
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'config') { if (data.dateFormat) clientDateFormat = data.dateFormat; if (data.timeFormat) clientTimeFormat = data.timeFormat; if (data.timezone !== undefined) serverTimezone = parseFloat(data.timezone); }

                if (data.text && !data.type) {
                    addMsg(data.text, data.sender === 'support' ? 'support' : 'system', data.timestamp, data.id);
                    if (data.sender === 'support') openWidget();
                }

                if (data.type === 'sync_message') addMsg(data.text, 'me', data.timestamp, data.id);
                if (data.type === 'history') { hasHistory = true; msgs.innerHTML = ''; lastRenderedDate = null; data.messages.forEach(msg => { addMsg(msg.text, msg.sender === 'support' ? 'support' : 'me', msg.timestamp, msg.id); }); }

                if (data.type === 'message_deleted') {
                    const el = document.querySelector(`.k-msg[data-id='${data.msgId}']`);
                    if (el) el.remove();
                }

                if (data.type === 'reset_chat') { msgs.innerHTML = ''; hasHistory = false; lastRenderedDate = null; localStorage.removeItem('kaplia_chat_id'); sessionId = 'guest_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('kaplia_chat_id', sessionId); showInitialMessages(); }

                if (data.type === 'error') {
                    let errorMsg = '';
                    if (data.error === 'rate_limit_exceeded') {
                        errorMsg = `Забагато повідомлень. Зачекайте хвилину.`;
                    } else if (data.error === 'message_too_long') {
                        errorMsg = `Повідомлення занадто довге (макс. ${data.maxLength} символів)`;
                    }
                    if (errorMsg) {
                        const div = document.createElement('div');
                        div.className = 'k-msg system';
                        div.style.color = '#dc3545';
                        div.innerText = errorMsg;
                        msgs.appendChild(div);
                        scrollToBottom();
                    }
                }
            } catch(e) {}
        };
        ws.onclose = () => setTimeout(connect, 3000);
    }

    showInitialMessages();
    connect();

    document.getElementById('kChatBtn').onclick = toggleChat;
    document.getElementById('kCloseBtn').onclick = toggleChat;
    document.getElementById('kSendBtn').onclick = sendMessage;
    inp.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };

    inp.oninput = () => { if (ws && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'typing_update', text: inp.value })); } };

    function toggleChat() {
        const isHidden = box.style.display === 'none' || box.style.display === '';
        box.style.display = isHidden ? 'flex' : 'none';
        if(isHidden) { setTimeout(() => { inp.focus(); scrollToBottom(); }, 100); }
    }

    function sendMessage() {
        const text = inp.value.trim();
        if (text && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ text: text }));
            addMsg(text, 'me', new Date().toISOString());
            inp.value = '';
            ws.send(JSON.stringify({ type: 'typing_update', text: '' }));
        }
    }

    function addMsg(text, type, timestamp, msgId, skipDateDivider) {
        const ts = timestamp || new Date().toISOString();
        if (!skipDateDivider) renderDateDivider(ts);
        const div = document.createElement('div');
        div.className = `k-msg ${type}`;
        if (msgId) div.setAttribute('data-id', msgId);

        const dateObj = new Date(ts);
        const timeStr = formatDatePHPStyle(dateObj, clientTimeFormat);

        // Використовуємо форматер для посилань
        const formattedText = formatTextWithLinks(text);

        div.innerHTML = `${formattedText} <span class="k-time">${timeStr}</span>`;
        msgs.appendChild(div);
        scrollToBottom();
    }
})();