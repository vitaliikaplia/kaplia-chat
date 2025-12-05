import { useState, useCallback } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { useWebSocket } from './hooks/useWebSocket';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { OptionsModal } from './components/OptionsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';

function AppContent() {
  const { state, setActiveUser, clearNotification, setConfig } = useChat();
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('kaplia_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [soundType, setSoundType] = useState(() => {
    return localStorage.getItem('kaplia_sound_type') || 'chime';
  });

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  const handleSystemMessage = useCallback((text) => {
    showToast(text, 'success');
  }, []);

  const {
    connect,
    disconnect,
    sendReply,
    getHistory,
    loadMoreHistory,
    deleteMessage,
    deleteSession,
    deleteSystemMessages,
    changePassword,
    changeApiToken,
    updateWebhook,
    updateTimeSettings,
    updateRealtimeTyping,
    updateSystemLogs,
    updateAllowedOrigins,
    updateRateLimit,
    updateMessageLimits,
  } = useWebSocket(handleSystemMessage, soundEnabled);

  const handleSoundEnabledChange = (enabled) => {
    setSoundEnabled(enabled);
    localStorage.setItem('kaplia_sound_enabled', String(enabled));
  };

  const handleSoundTypeChange = (type) => {
    setSoundType(type);
    localStorage.setItem('kaplia_sound_type', type);
  };

  const handleLogin = async (password, rememberMe) => {
    connect(password, () => {
      // Called on auth error (connection closed without auth_success)
      showToast('Невірний логін або пароль', 'error');
    }, rememberMe);
  };

  const handleSelectUser = (userId) => {
    setActiveUser(userId);
    clearNotification(userId);
    getHistory(userId);
  };

  const handleDeleteUser = (userId) => {
    deleteSession(userId);
  };

  const handleSendMessage = (targetId, text) => {
    sendReply(targetId, text);
  };

  const handleDeleteMessage = (msgId, targetId) => {
    deleteMessage(msgId, targetId);
  };

  const handleOpenSettings = (type) => {
    setActiveModal(type);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const handleLogout = () => {
    setActiveModal('logout');
  };

  const confirmLogout = () => {
    showToast('Ви вийшли з системи', 'success');
    disconnect();
  };

  const handleSavePassword = (newPassword) => {
    changePassword(newPassword);
    localStorage.setItem('kaplia_admin_pass', newPassword);
  };

  const handleSaveToken = (newToken) => {
    changeApiToken(newToken);
    setConfig({ apiToken: newToken });
  };

  const handleSaveWebhook = (url, enabled) => {
    updateWebhook(url, enabled);
    setConfig({ webhookUrl: url, webhookEnabled: enabled });
  };

  const handleSaveRealtimeTyping = (enabled) => {
    updateRealtimeTyping(enabled);
    setConfig({ realtimeTyping: enabled });
  };

  const handleSaveSystemLogs = (setting, enabled) => {
    updateSystemLogs(setting, enabled);
    setConfig({
      systemLogs: {
        ...state.config.systemLogs,
        [setting]: enabled
      }
    });
  };

  const handleSaveAllowedOrigins = (origins) => {
    updateAllowedOrigins(origins);
    setConfig({ allowedOrigins: origins });
  };

  const handleSaveRateLimit = (maxMessagesPerMinute, maxMessageLength) => {
    updateRateLimit(maxMessagesPerMinute, maxMessageLength);
    setConfig({ maxMessagesPerMinute, maxMessageLength });
  };

  const handleSaveMessageLimits = (adminMessagesLimit, widgetMessagesLimit) => {
    updateMessageLimits(adminMessagesLimit, widgetMessagesLimit);
    setConfig({ adminMessagesLimit, widgetMessagesLimit });
  };

  const handleLoadMore = () => {
    if (state.messages.length > 0 && state.activeUserId) {
      const oldestMsgId = state.messages[0].id;
      loadMoreHistory(state.activeUserId, oldestMsgId);
    }
  };

  const handleDeleteSystemMessages = () => {
    if (state.activeUserId) {
      deleteSystemMessages(state.activeUserId);
    }
  };

  const handleSaveTimeSettings = (timezone, dateFormat, timeFormat) => {
    updateTimeSettings(timezone, dateFormat, timeFormat);
    setConfig({ timezone, dateFormat, timeFormat });
  };

  if (!state.isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        onSelectUser={handleSelectUser}
        onDeleteUser={handleDeleteUser}
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
      />
      <ChatArea
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onLoadMore={handleLoadMore}
        onDeleteSystemMessages={handleDeleteSystemMessages}
      />

      {/* Modals */}
      <OptionsModal
        isOpen={activeModal === 'options'}
        onClose={handleCloseModal}
        config={state.config}
        onSavePassword={handleSavePassword}
        onSaveToken={handleSaveToken}
        onSaveWebhook={handleSaveWebhook}
        onSaveTimeSettings={handleSaveTimeSettings}
        onSaveRealtimeTyping={handleSaveRealtimeTyping}
        onSaveSystemLogs={handleSaveSystemLogs}
        onSaveAllowedOrigins={handleSaveAllowedOrigins}
        onSaveRateLimit={handleSaveRateLimit}
        onSaveMessageLimits={handleSaveMessageLimits}
        soundEnabled={soundEnabled}
        onSoundEnabledChange={handleSoundEnabledChange}
        soundType={soundType}
        onSoundTypeChange={handleSoundTypeChange}
        onCopyToken={() => showToast('Токен скопійовано', 'success')}
      />
      <ConfirmModal
        isOpen={activeModal === 'logout'}
        onClose={handleCloseModal}
        onConfirm={confirmLogout}
        title="Вихід"
        message="Вийти з адмін-панелі?"
        confirmText="Вийти"
        cancelText="Скасувати"
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

export default App;
