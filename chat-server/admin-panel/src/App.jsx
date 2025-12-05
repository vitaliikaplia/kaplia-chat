import { useState, useCallback, useEffect } from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import { useWebSocket } from './hooks/useWebSocket';
import { I18nProvider, useTranslation } from './i18n';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { OptionsModal } from './components/OptionsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { Toast } from './components/Toast';

function AppContent() {
  const { state, setActiveUser, clearNotification, setConfig } = useChat();
  const { t, changeLanguage } = useTranslation();
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('kaplia_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [soundType, setSoundType] = useState(() => {
    return localStorage.getItem('kaplia_sound_type') || 'chime';
  });

  // Sync language with config from server
  useEffect(() => {
    if (state.config.language) {
      changeLanguage(state.config.language);
    }
  }, [state.config.language, changeLanguage]);

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
    updateLanguage,
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
      showToast(t('login.error'), 'error');
    }, rememberMe);
  };

  const handleSelectUser = (userId) => {
    setActiveUser(userId);
    clearNotification(userId);
    getHistory(userId);
    // Close sidebar on mobile after selecting user
    setSidebarOpen(false);
  };

  // Swipe handling
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && !sidebarOpen) {
      setSidebarOpen(true);
    } else if (isLeftSwipe && sidebarOpen) {
      setSidebarOpen(false);
    }
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
    showToast(t('toast.logoutSuccess'), 'success');
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

  const handleSaveLanguage = (language) => {
    updateLanguage(language);
    setConfig({ language });
    changeLanguage(language);
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
    <div
      className="flex h-screen bg-gray-100 relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Mobile overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-30
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <Sidebar
          onSelectUser={handleSelectUser}
          onDeleteUser={handleDeleteUser}
          onOpenSettings={handleOpenSettings}
          onLogout={handleLogout}
        />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onLoadMore={handleLoadMore}
          onDeleteSystemMessages={handleDeleteSystemMessages}
          onOpenSidebar={() => setSidebarOpen(true)}
          sidebarOpen={sidebarOpen}
        />
      </div>

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
        onSaveLanguage={handleSaveLanguage}
        onSaveAllowedOrigins={handleSaveAllowedOrigins}
        onSaveRateLimit={handleSaveRateLimit}
        onSaveMessageLimits={handleSaveMessageLimits}
        soundEnabled={soundEnabled}
        onSoundEnabledChange={handleSoundEnabledChange}
        soundType={soundType}
        onSoundTypeChange={handleSoundTypeChange}
        onCopyToken={() => showToast(t('settings.token.copied'), 'success')}
      />
      <ConfirmModal
        isOpen={activeModal === 'logout'}
        onClose={handleCloseModal}
        onConfirm={confirmLogout}
        title={t('confirm.logoutTitle')}
        message={t('confirm.logoutMessage')}
        confirmText={t('sidebar.logout')}
        cancelText={t('confirm.cancel')}
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

function AppWithI18n() {
  const { state } = useChat();
  return (
    <I18nProvider initialLanguage={state.config.language || 'uk'}>
      <AppContent />
    </I18nProvider>
  );
}

function App() {
  return (
    <ChatProvider>
      <AppWithI18n />
    </ChatProvider>
  );
}

export default App;
