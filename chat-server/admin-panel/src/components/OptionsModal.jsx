import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { playSound, soundOptions } from '../utils/notificationSound';
import { useTranslation, LANGUAGES } from '../i18n';

const TIMEZONE_OPTIONS = [
  { value: '-12', label: 'UTC -12:00' },
  { value: '-11', label: 'UTC -11:00' },
  { value: '-10', label: 'UTC -10:00' },
  { value: '-9.5', label: 'UTC -09:30' },
  { value: '-9', label: 'UTC -09:00' },
  { value: '-8', label: 'UTC -08:00' },
  { value: '-7', label: 'UTC -07:00' },
  { value: '-6', label: 'UTC -06:00' },
  { value: '-5', label: 'UTC -05:00' },
  { value: '-4', label: 'UTC -04:00' },
  { value: '-3.5', label: 'UTC -03:30' },
  { value: '-3', label: 'UTC -03:00' },
  { value: '-2', label: 'UTC -02:00' },
  { value: '-1', label: 'UTC -01:00' },
  { value: '0', label: 'UTC +00:00' },
  { value: '1', label: 'UTC +01:00' },
  { value: '2', label: 'UTC +02:00' },
  { value: '3', label: 'UTC +03:00' },
  { value: '3.5', label: 'UTC +03:30' },
  { value: '4', label: 'UTC +04:00' },
  { value: '4.5', label: 'UTC +04:30' },
  { value: '5', label: 'UTC +05:00' },
  { value: '5.5', label: 'UTC +05:30' },
  { value: '5.75', label: 'UTC +05:45' },
  { value: '6', label: 'UTC +06:00' },
  { value: '6.5', label: 'UTC +06:30' },
  { value: '7', label: 'UTC +07:00' },
  { value: '8', label: 'UTC +08:00' },
  { value: '8.75', label: 'UTC +08:45' },
  { value: '9', label: 'UTC +09:00' },
  { value: '9.5', label: 'UTC +09:30' },
  { value: '10', label: 'UTC +10:00' },
  { value: '10.5', label: 'UTC +10:30' },
  { value: '11', label: 'UTC +11:00' },
  { value: '12', label: 'UTC +12:00' },
  { value: '12.75', label: 'UTC +12:45' },
  { value: '13', label: 'UTC +13:00' },
  { value: '14', label: 'UTC +14:00' },
];

export function OptionsModal({
  isOpen,
  onClose,
  config,
  onSavePassword,
  onSaveToken,
  onSaveWebhook,
  onSaveTimeSettings,
  onSaveRealtimeTyping,
  onSaveSystemLogs,
  onSaveLanguage,
  onSaveAllowedOrigins,
  onSaveRateLimit,
  onSaveMessageLimits,
  soundEnabled,
  onSoundEnabledChange,
  soundType,
  onSoundTypeChange,
  onCopyToken
}) {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState('password');
  const tabsContainerRef = useRef(null);
  const tabRefs = useRef({});

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    // Scroll to make the active tab visible with smooth animation
    const tabEl = tabRefs.current[tabId];
    const container = tabsContainerRef.current;
    if (tabEl && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();
      const scrollLeft = tabEl.offsetLeft - containerRect.width / 2 + tabRect.width / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  };

  const tabs = [
    { id: 'password', label: t('settings.tabs.password') },
    { id: 'token', label: t('settings.tabs.token') },
    { id: 'webhook', label: t('settings.tabs.webhook') },
    { id: 'time', label: t('settings.tabs.time') },
    { id: 'sound', label: t('settings.tabs.sound') },
    { id: 'messages', label: t('settings.tabs.messages') },
    { id: 'spam', label: t('settings.tabs.spam') },
    { id: 'other', label: t('settings.tabs.other') },
  ];

  // Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Token
  const [token, setToken] = useState('');

  // Webhook
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);

  // Time
  const [timezone, setTimezone] = useState('0');
  const [dateFormat, setDateFormat] = useState('d.m.Y');
  const [timeFormat, setTimeFormat] = useState('H:i');

  // Other
  const [realtimeTyping, setRealtimeTyping] = useState(false);
  const [allowedOrigins, setAllowedOrigins] = useState('');

  // Spam
  const [maxMessagesPerMinute, setMaxMessagesPerMinute] = useState(20);
  const [maxMessageLength, setMaxMessageLength] = useState(1000);

  // Messages
  const [adminMessagesLimit, setAdminMessagesLimit] = useState(20);
  const [widgetMessagesLimit, setWidgetMessagesLimit] = useState(20);

  useEffect(() => {
    if (isOpen && config) {
      setToken(config.apiToken || '');
      setWebhookUrl(config.webhookUrl || '');
      setWebhookEnabled(config.webhookEnabled || false);
      setTimezone(config.timezone || '0');
      setDateFormat(config.dateFormat || 'd.m.Y');
      setTimeFormat(config.timeFormat || 'H:i');
      setRealtimeTyping(config.realtimeTyping || false);
      setAllowedOrigins(config.allowedOrigins || '');
      setMaxMessagesPerMinute(config.maxMessagesPerMinute || 20);
      setMaxMessageLength(config.maxMessageLength || 1000);
      setAdminMessagesLimit(config.adminMessagesLimit || 20);
      setWidgetMessagesLimit(config.widgetMessagesLimit || 20);
    }
  }, [isOpen, config]);

  // Handlers
  const handleSavePassword = () => {
    if (!password) {
      setPasswordError(t('settings.password.errorEmpty'));
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError(t('settings.password.errorMismatch'));
      return;
    }
    if (password.length < 6) {
      setPasswordError(t('settings.password.errorLength'));
      return;
    }
    onSavePassword(password);
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(result);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    if (onCopyToken) onCopyToken();
  };

  const handleSaveToken = () => {
    if (token.trim()) {
      onSaveToken(token.trim());
    }
  };

  const handleSaveWebhook = () => {
    onSaveWebhook(webhookUrl, webhookEnabled);
  };

  const handleSaveTime = () => {
    onSaveTimeSettings(timezone, dateFormat, timeFormat);
  };

  const handleSaveTyping = () => {
    onSaveRealtimeTyping(realtimeTyping);
  };

  const handleToggleSystemLog = (setting) => {
    const currentValue = config.systemLogs?.[setting] ?? true;
    onSaveSystemLogs(setting, !currentValue);
  };

  const handleLanguageChange = (newLang) => {
    onSaveLanguage(newLang);
  };

  const handleSaveOrigins = () => {
    onSaveAllowedOrigins(allowedOrigins);
  };

  const handleSaveRateLimit = () => {
    onSaveRateLimit(parseInt(maxMessagesPerMinute) || 20, parseInt(maxMessageLength) || 1000);
  };

  const handleSaveMessageLimits = () => {
    onSaveMessageLimits(parseInt(adminMessagesLimit) || 20, parseInt(widgetMessagesLimit) || 20);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('settings.title')} size="xl">
      {/* Tabs with fade effect */}
      <div className="relative mb-4 -mt-2">
        {/* Left fade gradient */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        {/* Right fade gradient */}
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        {/* Scrollable tabs container */}
        <div
          ref={tabsContainerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="flex border-b border-gray-200 px-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => (tabRefs.current[tab.id] = el)}
                onClick={() => handleTabClick(tab.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.password.new')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={t('settings.password.newPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.password.confirm')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={t('settings.password.confirmPlaceholder')}
              />
            </div>

            {passwordError && (
              <div className="text-red-500 text-sm">{passwordError}</div>
            )}

            <button
              onClick={handleSavePassword}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {t('settings.password.save')}
            </button>
          </div>
        )}

        {/* Token Tab */}
        {activeTab === 'token' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.token.label')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                  placeholder={t('settings.token.placeholder')}
                />
                <button
                  onClick={copyToken}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                  title={t('settings.token.copy')}
                >
                  📋
                </button>
              </div>
            </div>

            <button
              onClick={generateToken}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
            >
              🔄 {t('settings.token.generate')}
            </button>

            <button
              onClick={handleSaveToken}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {t('settings.token.save')}
            </button>
          </div>
        )}

        {/* Webhook Tab */}
        {activeTab === 'webhook' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{t('settings.webhook.enabled')}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.webhook.url')}
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder={t('settings.webhook.urlPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.webhook.urlHint')}
              </p>
            </div>

            <button
              onClick={handleSaveWebhook}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {t('settings.webhook.save')}
            </button>
          </div>
        )}

        {/* Time Tab */}
        {activeTab === 'time' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.time.timezone')}
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              >
                {TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.time.dateFormat')}
              </label>
              <input
                type="text"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                placeholder={t('settings.time.dateFormatPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.time.dateFormatHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.time.timeFormat')}
              </label>
              <input
                type="text"
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                placeholder={t('settings.time.timeFormatPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.time.timeFormatHint')}
              </p>
            </div>

            <button
              onClick={handleSaveTime}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {t('settings.time.save')}
            </button>
          </div>
        )}

        {/* Sound Tab */}
        {activeTab === 'sound' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.sound.enabled')}</span>
                <p className="text-xs text-gray-500">{t('settings.sound.enabledHint')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => onSoundEnabledChange(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings.sound.type')}
              </label>
              <div className="space-y-2">
                {soundOptions.map((sound) => (
                  <div
                    key={sound.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                      soundType === sound.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => onSoundTypeChange(sound.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="soundType"
                        checked={soundType === sound.id}
                        onChange={() => onSoundTypeChange(sound.id)}
                        className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{t(sound.nameKey)}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound(sound.id);
                      }}
                      className="px-3 py-1 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                    >
                      ▶ {t('settings.sound.test')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.messages.adminLimit')}
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={adminMessagesLimit}
                onChange={(e) => setAdminMessagesLimit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.messages.adminLimitHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.messages.widgetLimit')}
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={widgetMessagesLimit}
                onChange={(e) => setWidgetMessagesLimit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.messages.widgetLimitHint')}
              </p>
            </div>

            <button
              onClick={handleSaveMessageLimits}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {t('settings.messages.save')}
            </button>
          </div>
        )}

        {/* Spam Protection Tab */}
        {activeTab === 'spam' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.spam.maxPerMinute')}
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={maxMessagesPerMinute}
                onChange={(e) => setMaxMessagesPerMinute(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.spam.maxPerMinuteHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.spam.maxLength')}
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                value={maxMessageLength}
                onChange={(e) => setMaxMessageLength(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.spam.maxLengthHint')}
              </p>
            </div>

            <button
              onClick={handleSaveRateLimit}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {t('settings.spam.save')}
            </button>
          </div>
        )}

        {/* Other Tab */}
        {activeTab === 'other' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">{t('settings.other.realtimeTyping')}</span>
                  <p className="text-xs text-gray-500">{t('settings.other.realtimeTypingHint')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={realtimeTyping}
                    onChange={(e) => setRealtimeTyping(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
              <button
                onClick={handleSaveTyping}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition text-sm"
              >
                {t('settings.other.save')}
              </button>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.other.systemLogs')}</span>
                <p className="text-xs text-gray-500 mb-3">{t('settings.other.systemLogsHint')}</p>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  onClick={() => handleToggleSystemLog('onlineStatus')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition border-r border-gray-300 ${
                    config.systemLogs?.onlineStatus
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('settings.other.logOnlineTitle')}
                >
                  {t('settings.other.logOnline')}
                </button>
                <button
                  onClick={() => handleToggleSystemLog('tabActivity')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition border-r border-gray-300 ${
                    config.systemLogs?.tabActivity
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('settings.other.logTabTitle')}
                >
                  {t('settings.other.logTab')}
                </button>
                <button
                  onClick={() => handleToggleSystemLog('chatWidget')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition border-r border-gray-300 ${
                    config.systemLogs?.chatWidget
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('settings.other.logWidgetTitle')}
                >
                  {t('settings.other.logWidget')}
                </button>
                <button
                  onClick={() => handleToggleSystemLog('pageVisits')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                    config.systemLogs?.pageVisits
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title={t('settings.other.logPagesTitle')}
                >
                  {t('settings.other.logPages')}
                </button>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.other.cors')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t('settings.other.corsHint')}
                </p>
                <textarea
                  value={allowedOrigins}
                  onChange={(e) => setAllowedOrigins(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm font-mono"
                  placeholder={t('settings.other.corsPlaceholder')}
                  rows={4}
                />
              </div>
              <button
                onClick={handleSaveOrigins}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition text-sm"
              >
                {t('settings.other.corsSave')}
              </button>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.other.language')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t('settings.other.languageHint')}
                </p>
                <div className="flex rounded-lg overflow-hidden border border-gray-300">
                  {LANGUAGES.map((lang, index) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                        index < LANGUAGES.length - 1 ? 'border-r border-gray-300' : ''
                      } ${
                        language === lang.code
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
