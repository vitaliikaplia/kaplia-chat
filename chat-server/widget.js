(function() {
    const SERVER_URL = 'wss://chat.kaplia.pro';

    // 1. ЗЧИТУЄМО КОНФІГУРАЦІЮ
    const config = window.KapliaChatConfig || {
        defaultLanguage: 'ua',
        initialMessages: ["Привіт! Чим можу допомогти?"],
        i18n: { ua: { title: 'Чат', subtitle: '', inputPlaceholder: '...', sendBtn: 'Send' } },
        metadata: {}
    };

    const lang = config.defaultLanguage || 'en';
    const texts = config.i18n[lang] || config.i18n['en'] || config.i18n['ua'];

    // 2. СТИЛІ
    const style = document.createElement('style');
    style.innerHTML = `
        #kaplia-widget .kaplia-chat-btn {
            position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px;
            background: #007bff; color: white; border-radius: 50%; border: none;
            font-size: 30px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 99999; display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s;
        }
        #kaplia-widget .kaplia-chat-btn:hover { transform: scale(1.1); }
        
        #kaplia-widget .kaplia-chat-box {
            position: fixed; bottom: 90px; right: 20px; width: 350px; height: 500px;
            background: white; border-radius: 12px; box-shadow: 0 5px 25px rgba(0,0,0,0.2);
            display: none; flex-direction: column; overflow: hidden; z-index: 99999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        #kaplia-widget .k-header { background: #007bff; color: white; padding: 15px; }
        #kaplia-widget .k-title { font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; }
        #kaplia-widget .k-subtitle { font-size: 12px; opacity: 0.9; margin-top: 5px; }
        #kaplia-widget .k-close { cursor: pointer; }
        
        #kaplia-widget .k-messages { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: #f9f9f9; }
        
        #kaplia-widget .k-msg { padding: 8px 12px; border-radius: 10px; max-width: 80%; font-size: 14px; word-wrap: break-word; }
        #kaplia-widget .k-msg.me { background: #007bff; color: white; align-self: flex-end; }
        #kaplia-widget .k-msg.support { background: #e9ecef; color: #333; align-self: flex-start; }
        
        #kaplia-widget .k-input-area { padding: 10px; border-top: 1px solid #ddd; display: flex; gap: 10px; background: white; }
        #kaplia-widget .k-input-area input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; }
        #kaplia-widget .k-input-area button { padding: 8px 15px; background: #007bff; color: white; border: none; border-radius: 20px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    // 3. HTML
    const chatContainer = document.createElement('div');
    chatContainer.id = 'kaplia-widget';

    chatContainer.innerHTML = `
        <button class="kaplia-chat-btn" id="kChatBtn">💬</button>
        <div class="kaplia-chat-box" id="kChatBox">
            <div class="k-header">
                <div class="k-title">
                    <span>${texts.title}</span>
                    <span class="k-close" id="kCloseBtn">×</span>
                </div>
                <div class="k-subtitle">${texts.subtitle}</div>
            </div>
            <div class="k-messages" id="kMsgs"></div>
            <div class="k-input-area">
                <input type="text" id="kInput" placeholder="${texts.inputPlaceholder}">
                <button id="kSendBtn">${texts.sendBtn || 'Send'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(chatContainer);

    // 4. ЛОГІКА
    const box = document.getElementById('kChatBox');
    const msgs = document.getElementById('kMsgs');
    const inp = document.getElementById('kInput');
    let ws;
    let hasHistory = false;
    let sessionId;

    // --- ГОЛОВНА ЗМІНА: ПРІОРИТЕТИ ID ---

    // Варіант 1: Якщо сайт передав ID користувача (залогінений юзер)
    if (config.metadata && config.metadata.user_id) {
        // Використовуємо префікс auth_, щоб відрізняти від гостей
        sessionId = 'auth_' + config.metadata.user_id;

        // Можемо зберегти в localStorage про всяк випадок, але основне джерело - конфіг
        localStorage.setItem('kaplia_chat_id', sessionId);
    }
    // Варіант 2: Якщо ID немає (гість), шукаємо в пам'яті або генеруємо новий
    else {
        sessionId = localStorage.getItem('kaplia_chat_id');

        // Якщо це новий гість, або попередній ID був "auth_" (тобто юзер вийшов з акаунту)
        if (!sessionId || sessionId.startsWith('auth_')) {
            sessionId = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('kaplia_chat_id', sessionId);
        }
    }
    // -------------------------------------

    function showInitialMessages() {
        if (!hasHistory && config.initialMessages && config.initialMessages.length > 0) {
            config.initialMessages.forEach(msg => addMsg(msg, 'support'));
        }
    }

    function connect() {
        ws = new WebSocket(`${SERVER_URL}?session=${sessionId}`);

        ws.onopen = () => {
            if (config.metadata) {
                ws.send(JSON.stringify({ type: 'client_info', metadata: config.metadata }));
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.text && !data.type) {
                    const type = data.sender === 'support' ? 'support' : 'system';
                    addMsg(data.text, type);
                }

                if (data.type === 'sync_message') {
                    addMsg(data.text, 'me');
                }

                if (data.type === 'history') {
                    hasHistory = true;
                    msgs.innerHTML = '';
                    data.messages.forEach(msg => {
                        const type = msg.sender === 'support' ? 'support' : 'me';
                        addMsg(msg.text, type);
                    });
                }

                if (data.type === 'reset_chat') {
                    msgs.innerHTML = '';
                    hasHistory = false;
                    localStorage.removeItem('kaplia_chat_id');
                    // Генеруємо новий гостьовий ID, бо старий був видалений
                    sessionId = 'guest_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('kaplia_chat_id', sessionId);
                    showInitialMessages();
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

    function toggleChat() {
        const isHidden = box.style.display === 'none' || box.style.display === '';
        box.style.display = isHidden ? 'flex' : 'none';
        if(isHidden) setTimeout(() => inp.focus(), 100);
    }

    function sendMessage() {
        const text = inp.value.trim();
        if (text && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ text: text }));
            addMsg(text, 'me');
            inp.value = '';
        }
    }

    function addMsg(text, type) {
        const div = document.createElement('div');
        div.className = `k-msg ${type}`;
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }
})();