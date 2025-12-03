import { useRef, useCallback, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { playNotificationSound } from '../utils/notificationSound';

export function useWebSocket(onSystemMessage, soundEnabled = true) {
  const soundEnabledRef = useRef(soundEnabled);
  const wsRef = useRef(null);
  const activeUserIdRef = useRef(null);
  const handleMessageRef = useRef(null);
  const onAuthErrorRef = useRef(null);
  const onSystemMessageRef = useRef(onSystemMessage);
  const passwordRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isManualDisconnectRef = useRef(false);
  const {
    state,
    setAuthenticated,
    setConfig,
    setUsers,
    addUser,
    updateUserInfo,
    removeUser,
    setMessages,
    prependMessages,
    setLoadingMore,
    addMessage,
    deleteMessage,
    deleteSystemMessagesFromState,
    setTyping,
    setNotification,
    setUserOnline,
    setTabActive,
  } = useChat();

  // Keep ref in sync with state
  useEffect(() => {
    activeUserIdRef.current = state.activeUserId;
  }, [state.activeUserId]);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case 'auth_success':
        setAuthenticated(true);
        setConfig({
          webhookUrl: data.webhookConfig?.url || '',
          webhookEnabled: data.webhookConfig?.enabled || false,
          apiToken: data.apiToken || '',
          timezone: data.timezone || '0',
          dateFormat: data.dateFormat || 'd.m.Y',
          timeFormat: data.timeFormat || 'H:i',
          realtimeTyping: data.realtimeTyping || false,
          allowedOrigins: data.allowedOrigins || '',
          maxMessagesPerMinute: data.maxMessagesPerMinute || 20,
          maxMessageLength: data.maxMessageLength || 1000,
        });
        if (onSystemMessageRef.current) {
          onSystemMessageRef.current('Успішна авторизація!');
        }
        break;

      case 'user_list':
        setUsers(data.users || []);
        break;

      case 'new_user':
        addUser(data.id);
        break;

      case 'user_connected':
        // User opened page with widget - mark as online
        addUser(data.id);
        setUserOnline(data.id, true);
        // Add system message to chat if this is the active user
        if (data.id === activeUserIdRef.current && data.msgId) {
          addMessage({
            id: data.msgId,
            userId: data.id,
            sender: 'system',
            text: 'user_connected',
            timestamp: data.timestamp,
          });
        }
        break;

      case 'user_info_update':
        updateUserInfo(data.id, data.info);
        break;

      case 'user_left':
        // User disconnected - mark as offline but don't remove from list
        setUserOnline(data.id, false);
        // Add system message to chat if this is the active user
        if (data.id === activeUserIdRef.current && data.msgId) {
          addMessage({
            id: data.msgId,
            userId: data.id,
            sender: 'system',
            text: 'user_left',
            timestamp: data.timestamp,
          });
        }
        break;

      case 'client_msg':
        // Add user first (before updating info to avoid overwriting)
        addUser(data.from);
        // Mark user as online since they sent a message
        setUserOnline(data.from, true);
        // Update user info if provided
        if (data.info) {
          updateUserInfo(data.from, data.info);
        }
        // Add message only if it's from the active chat
        if (data.from === activeUserIdRef.current) {
          addMessage({
            id: data.id,
            userId: data.from,
            sender: 'client',
            text: data.text,
            timestamp: data.timestamp,
          });
        }
        // Always update notification for non-active chats
        if (data.from !== activeUserIdRef.current) {
          setNotification(data.from, true);
        }
        // Play notification sound
        if (soundEnabledRef.current) {
          playNotificationSound();
        }
        break;

      case 'client_typing':
        if (data.userId === activeUserIdRef.current) {
          setTyping(data.text || '');
        }
        break;

      case 'tab_visibility':
        // Just update UI state (no msgId means no DB save - navigation detection)
        setTabActive(data.userId, data.isActive);
        break;

      case 'system_event':
        // Delayed system event that was saved to DB (real tab switch, not navigation)
        if (data.userId === activeUserIdRef.current && data.msgId) {
          addMessage({
            id: data.msgId,
            userId: data.userId,
            sender: 'system',
            text: data.eventType,
            timestamp: data.timestamp,
          });
        }
        break;

      case 'chat_opened':
      case 'chat_closed':
        // Add system message to chat if this is the active user
        if (data.userId === activeUserIdRef.current && data.msgId) {
          addMessage({
            id: data.msgId,
            userId: data.userId,
            sender: 'system',
            text: data.type,
            timestamp: data.timestamp,
          });
        }
        break;

      case 'page_visit':
        // Update user info with current URL
        updateUserInfo(data.userId, { current_url: data.url });
        // Add system message to chat if this is the active user
        if (data.userId === activeUserIdRef.current && data.msgId) {
          addMessage({
            id: data.msgId,
            userId: data.userId,
            sender: 'system',
            text: `page_visit:${data.url}`,
            timestamp: data.timestamp,
          });
        }
        break;

      case 'api_msg_sent':
      case 'admin_msg_sent':
        if (data.targetId === activeUserIdRef.current) {
          addMessage({
            id: data.id,
            userId: data.targetId,
            sender: 'support',
            text: data.text,
            timestamp: data.timestamp,
          });
        }
        break;

      case 'history_data':
        if (data.targetId === activeUserIdRef.current) {
          const messages = (data.messages || []).map(m => ({
            id: m.id,
            userId: data.targetId,
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
          }));
          setMessages(messages, data.hasMore || false);
        }
        break;

      case 'more_history':
        if (data.targetId === activeUserIdRef.current) {
          const messages = (data.messages || []).map(m => ({
            id: m.id,
            userId: data.targetId,
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
          }));
          prependMessages(messages, data.hasMore || false);
        }
        break;

      case 'message_deleted':
        deleteMessage(data.msgId);
        break;

      case 'session_deleted':
        removeUser(data.id);
        break;

      case 'system_messages_deleted':
        // Remove all system messages from current chat
        if (data.targetId === activeUserIdRef.current) {
          deleteSystemMessagesFromState();
        }
        break;

      case 'system':
        if (onSystemMessageRef.current) {
          onSystemMessageRef.current(data.text);
        }
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }, [
    setAuthenticated,
    setConfig,
    setUsers,
    addUser,
    updateUserInfo,
    setMessages,
    addMessage,
    deleteMessage,
    deleteSystemMessagesFromState,
    setTyping,
    removeUser,
    setNotification,
    setUserOnline,
    setTabActive,
  ]);

  // Keep handleMessage ref updated
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // Keep onSystemMessage ref updated
  useEffect(() => {
    onSystemMessageRef.current = onSystemMessage;
  }, [onSystemMessage]);

  // Keep soundEnabled ref updated
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const connect = useCallback((password, onAuthError, rememberMe = true, silent = false) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/?auth=${encodeURIComponent(password)}`;

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Store password for reconnection
    passwordRef.current = password;
    isManualDisconnectRef.current = false;

    // Store auth error callback
    onAuthErrorRef.current = onAuthError;
    let authSuccessReceived = false;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'auth_success') {
          authSuccessReceived = true;
          onAuthErrorRef.current = null;
          // Save password only if rememberMe is true
          if (rememberMe) {
            localStorage.setItem('kaplia_admin_pass', password);
          }
          // Show toast only for initial login, not reconnects
          if (!silent && onSystemMessageRef.current) {
            onSystemMessageRef.current('Успішна авторизація!');
          }
          // Still need to update state
          setAuthenticated(true);
          setConfig({
            webhookUrl: data.webhookConfig?.url || '',
            webhookEnabled: data.webhookConfig?.enabled || false,
            apiToken: data.apiToken || '',
            timezone: data.timezone || '0',
            dateFormat: data.dateFormat || 'd.m.Y',
            timeFormat: data.timeFormat || 'H:i',
            realtimeTyping: data.realtimeTyping || false,
            allowedOrigins: data.allowedOrigins || '',
            maxMessagesPerMinute: data.maxMessagesPerMinute || 20,
            maxMessageLength: data.maxMessageLength || 1000,
            adminMessagesLimit: data.adminMessagesLimit || 20,
            widgetMessagesLimit: data.widgetMessagesLimit || 20,
          });
          return; // Don't pass to handleMessage since we handled it here
        }
        if (handleMessageRef.current) {
          handleMessageRef.current(data);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code);
      // If closed without auth_success - wrong password
      if (!authSuccessReceived && onAuthErrorRef.current) {
        onAuthErrorRef.current();
        onAuthErrorRef.current = null;
        localStorage.removeItem('kaplia_admin_pass');
        setAuthenticated(false);
        return;
      }

      // Auto-reconnect if not manual disconnect and we have password
      if (!isManualDisconnectRef.current && passwordRef.current) {
        console.log('Connection lost, reconnecting in 2 seconds...');
        reconnectTimeoutRef.current = setTimeout(() => {
          if (passwordRef.current && !isManualDisconnectRef.current) {
            connect(passwordRef.current, null, false, true); // silent = true for reconnect
          }
        }, 2000);
      } else {
        setAuthenticated(false);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return ws;
  }, [setAuthenticated, setConfig]);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendReply = useCallback((targetId, text) => {
    send({ type: 'admin_reply', targetId, text });
  }, [send]);

  const getHistory = useCallback((targetId) => {
    send({ type: 'get_history', targetId });
  }, [send]);

  const loadMoreHistory = useCallback((targetId, beforeId) => {
    setLoadingMore(true);
    send({ type: 'get_history', targetId, beforeId });
  }, [send, setLoadingMore]);

  const deleteMessageCmd = useCallback((msgId, targetId) => {
    send({ type: 'delete_message', msgId, targetId });
  }, [send]);

  const deleteSession = useCallback((targetId) => {
    send({ type: 'delete_session', targetId });
  }, [send]);

  const deleteSystemMessages = useCallback((targetId) => {
    send({ type: 'delete_system_messages', targetId });
  }, [send]);

  const changePassword = useCallback((newPassword) => {
    send({ type: 'change_password', newPassword });
  }, [send]);

  const changeApiToken = useCallback((newToken) => {
    send({ type: 'change_api_token', newToken });
  }, [send]);

  const updateWebhook = useCallback((url, enabled) => {
    send({ type: 'update_webhook', url, enabled });
  }, [send]);

  const updateTimeSettings = useCallback((timezone, dateFormat, timeFormat) => {
    send({ type: 'update_time_settings', timezone, dateFormat, timeFormat });
  }, [send]);

  const updateRealtimeTyping = useCallback((enabled) => {
    send({ type: 'update_realtime_typing', enabled });
  }, [send]);

  const updateAllowedOrigins = useCallback((origins) => {
    send({ type: 'update_allowed_origins', origins });
  }, [send]);

  const updateRateLimit = useCallback((maxMessagesPerMinute, maxMessageLength) => {
    send({ type: 'update_rate_limit', maxMessagesPerMinute, maxMessageLength });
  }, [send]);

  const updateMessageLimits = useCallback((adminMessagesLimit, widgetMessagesLimit) => {
    send({ type: 'update_message_limits', adminMessagesLimit, widgetMessagesLimit });
  }, [send]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    passwordRef.current = null;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    localStorage.removeItem('kaplia_admin_pass');
    setAuthenticated(false);
  }, [setAuthenticated]);

  // Auto-connect on mount if saved password exists
  useEffect(() => {
    const savedPassword = localStorage.getItem('kaplia_admin_pass');
    if (savedPassword) {
      connect(savedPassword, null, false, true); // silent = true for auto-connect
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    connect,
    disconnect,
    send,
    sendReply,
    getHistory,
    loadMoreHistory,
    deleteMessage: deleteMessageCmd,
    deleteSession,
    deleteSystemMessages,
    changePassword,
    changeApiToken,
    updateWebhook,
    updateTimeSettings,
    updateRealtimeTyping,
    updateAllowedOrigins,
    updateRateLimit,
    updateMessageLimits,
  };
}
