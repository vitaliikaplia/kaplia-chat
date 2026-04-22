import { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';
import { playSound, soundOptions } from '../utils/notificationSound';
import { useTranslation, LANGUAGES } from '../i18n';
import { WidgetConfigurator } from './WidgetConfigurator';

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
  onSaveAnonymousOrigins,
  onSaveRateLimit,
  onSaveMessageLimits,
  onSaveBusinessHours,
  onSaveSmtp,
  onSaveTelegram,
  onToggleTelegramBot,
  onTestSmtp,
  soundEnabled,
  onSoundEnabledChange,
  soundType,
  onSoundTypeChange,
  notificationsEnabled,
  onNotificationsEnabledChange,
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
    { id: 'schedule', label: t('settings.tabs.schedule') },
    { id: 'smtp', label: 'SMTP' },
    { id: 'telegram', label: t('settings.tabs.telegram') },
    { id: 'other', label: t('settings.tabs.other') },
    { id: 'widget', label: t('settings.tabs.widget') },
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
  const [allowedAnonymousOrigins, setAllowedAnonymousOrigins] = useState('');

  // Spam
  const [maxMessagesPerMinute, setMaxMessagesPerMinute] = useState(20);
  const [maxMessageLength, setMaxMessageLength] = useState(1000);

  // Messages
  const [adminMessagesLimit, setAdminMessagesLimit] = useState(20);
  const [widgetMessagesLimit, setWidgetMessagesLimit] = useState(20);

  // Business Hours
  const DEFAULT_BUSINESS_HOURS = {
    mon: { enabled: true, from: '09:00', to: '18:00' },
    tue: { enabled: true, from: '09:00', to: '18:00' },
    wed: { enabled: true, from: '09:00', to: '18:00' },
    thu: { enabled: true, from: '09:00', to: '18:00' },
    fri: { enabled: true, from: '09:00', to: '18:00' },
    sat: { enabled: false, from: '10:00', to: '15:00' },
    sun: { enabled: false, from: '10:00', to: '15:00' },
  };
  const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, '0');
    const m = i % 2 === 0 ? '00' : '30';
    return `${h}:${m}`;
  });
  const [businessHours, setBusinessHours] = useState(DEFAULT_BUSINESS_HOURS);
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [notificationEmails, setNotificationEmails] = useState('');

  // SMTP
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpSsl, setSmtpSsl] = useState(true);
  const [smtpPasswordVisible, setSmtpPasswordVisible] = useState(false);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [smtpTestMode, setSmtpTestMode] = useState(false);

  // Telegram
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);

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
      setAllowedAnonymousOrigins(config.allowedAnonymousOrigins || '');
      setMaxMessagesPerMinute(config.maxMessagesPerMinute || 20);
      setMaxMessageLength(config.maxMessageLength || 1000);
      setAdminMessagesLimit(config.adminMessagesLimit || 20);
      setWidgetMessagesLimit(config.widgetMessagesLimit || 20);
      const scheduleConfig = config.businessHours || {};
      const normalizedBusinessHours = DAYS.reduce((acc, day) => {
        acc[day] = scheduleConfig[day] || DEFAULT_BUSINESS_HOURS[day];
        return acc;
      }, {});
      setBusinessHours(normalizedBusinessHours);
      setBusinessHoursEnabled(
        scheduleConfig.enabled !== undefined
          ? !!scheduleConfig.enabled
          : Object.keys(scheduleConfig).length > 0
      );
      setNotificationEmails(scheduleConfig.notificationEmails || '');
      const smtp = config.smtpConfig || {};
      setSmtpHost(smtp.host || '');
      setSmtpPort(smtp.port || '');
      setSmtpUser(smtp.user || '');
      setSmtpPassword(smtp.password || '');
      setSmtpFromName(smtp.fromName || '');
      setSmtpSsl(smtp.ssl !== undefined ? smtp.ssl : true);
      const telegram = config.telegramConfig || {};
      setTelegramBotToken(telegram.botToken || '');
      setTelegramChatId(telegram.chatId || '');
      setTelegramEnabled(!!telegram.enabled);
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

  const handleSaveAnonymousOrigins = () => {
    onSaveAnonymousOrigins(allowedAnonymousOrigins);
  };

  const handleSaveRateLimit = () => {
    onSaveRateLimit(parseInt(maxMessagesPerMinute) || 20, parseInt(maxMessageLength) || 1000);
  };

  const handleSaveMessageLimits = () => {
    onSaveMessageLimits(parseInt(adminMessagesLimit) || 20, parseInt(widgetMessagesLimit) || 20);
  };

  const toggleDay = (day) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  };

  const updateDayTime = (day, field, value) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  const handleSaveBusinessHours = () => {
    onSaveBusinessHours({ enabled: businessHoursEnabled, ...businessHours, notificationEmails });
  };

  const buildSmtpConfig = () => ({
    host: smtpHost,
    port: smtpPort,
    user: smtpUser,
    password: smtpPassword,
    fromName: smtpFromName,
    ssl: smtpSsl,
  });

  const handleSmtpSave = () => {
    onSaveSmtp(buildSmtpConfig());
  };

  const handleSmtpTest = () => {
    if (!smtpTestMode) {
      setSmtpTestMode(true);
      setSmtpTestEmail(smtpUser || '');
      return;
    }
    if (!smtpTestEmail.trim()) return;
    onTestSmtp({ ...buildSmtpConfig(), testEmail: smtpTestEmail.trim() });
    setSmtpTestMode(false);
  };

  const handleTelegramSave = () => {
    onSaveTelegram({
      botToken: telegramBotToken.trim(),
      chatId: telegramChatId.trim(),
    });
  };

  const handleTelegramToggle = () => {
    const nextEnabled = !telegramEnabled;
    onSaveTelegram({
      botToken: telegramBotToken.trim(),
      chatId: telegramChatId.trim(),
      enabled: nextEnabled,
    });
    setTelegramEnabled(nextEnabled);
    onToggleTelegramBot(nextEnabled);
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

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.sound.browserNotifications')}</span>
                <p className="text-xs text-gray-500">{t('settings.sound.browserNotificationsHint')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => onNotificationsEnabledChange(e.target.checked)}
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

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-700">{t('settings.schedule.title')}</span>
              <p className="text-xs text-gray-500 mt-1">{t('settings.schedule.hint')}</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
              <div>
                <span className="text-sm font-medium text-gray-700">{t('settings.schedule.enabled')}</span>
                <p className="text-xs text-gray-500">{t('settings.schedule.enabledHint')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessHoursEnabled}
                  onChange={(e) => setBusinessHoursEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            <div className="space-y-1">
              {DAYS.map((day) => {
                const dayData = businessHours[day] || { enabled: false, from: '09:00', to: '18:00' };
                return (
                  <div key={day} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleDay(day)}
                      className={`w-16 py-2 text-xs font-medium rounded-lg transition flex-shrink-0 ${
                        dayData.enabled
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {t(`settings.schedule.${day}`)}
                    </button>
                    {dayData.enabled ? (
                      <div className="flex items-center gap-1.5 flex-1">
                        <select
                          value={dayData.from}
                          onChange={(e) => updateDayTime(day, 'from', e.target.value)}
                          className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <span className="text-gray-400 text-xs">—</span>
                        <select
                          value={dayData.to}
                          onChange={(e) => updateDayTime(day, 'to', e.target.value)}
                          className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">{t('settings.schedule.dayOff')}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <hr className="border-gray-200" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.schedule.notificationEmails')}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {t('settings.schedule.notificationEmailsHint')}
              </p>
              <textarea
                value={notificationEmails}
                onChange={(e) => setNotificationEmails(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm font-mono"
                placeholder={t('settings.schedule.notificationEmailsPlaceholder')}
                rows={3}
              />
            </div>

            <button
              onClick={handleSaveBusinessHours}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {t('settings.schedule.save')}
            </button>
          </div>
        )}

        {/* SMTP Tab */}
        {activeTab === 'smtp' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.smtp.host')}
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.smtp.port')}
                </label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                  placeholder="587"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.smtp.user')}
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                placeholder="user@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.smtp.password')}
              </label>
              <div className="relative">
                <input
                  type={smtpPasswordVisible ? 'text' : 'password'}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                  placeholder={t('settings.smtp.passwordPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => setSmtpPasswordVisible(!smtpPasswordVisible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                >
                  {smtpPasswordVisible ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.smtp.fromName')}
              </label>
              <input
                type="text"
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                placeholder={t('settings.smtp.fromNamePlaceholder')}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">SSL/TLS</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={smtpSsl}
                  onChange={(e) => setSmtpSsl(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            {smtpTestMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.smtp.testEmail')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={smtpTestEmail}
                    onChange={(e) => setSmtpTestEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition text-sm"
                    placeholder="test@example.com"
                    onKeyDown={(e) => e.key === 'Enter' && handleSmtpTest()}
                  />
                  <button
                    onClick={() => setSmtpTestMode(false)}
                    className="px-3 py-2 text-gray-400 hover:text-gray-600 transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSmtpTest}
                className={`flex-1 font-medium py-2 px-4 rounded-lg transition text-sm ${
                  smtpTestMode
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300'
                }`}
              >
                {smtpTestMode ? t('settings.smtp.send') : t('settings.smtp.test')}
              </button>
              <button
                onClick={handleSmtpSave}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                {t('settings.smtp.save')}
              </button>
            </div>
          </div>
        )}

        {/* Telegram Tab */}
        {activeTab === 'telegram' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.telegram.botToken')}
              </label>
              <input
                type="password"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                placeholder={t('settings.telegram.botTokenPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings.telegram.chatId')}
              </label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm font-mono"
                placeholder={t('settings.telegram.chatIdPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('settings.telegram.chatIdHint')}
              </p>
            </div>

            <div className={`rounded-lg border px-4 py-3 text-sm ${
              telegramEnabled
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              {telegramEnabled ? t('settings.telegram.statusEnabled') : t('settings.telegram.statusDisabled')}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTelegramSave}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
              >
                {t('settings.telegram.save')}
              </button>
              <button
                onClick={handleTelegramToggle}
                disabled={!telegramBotToken.trim() || !telegramChatId.trim()}
                className={`flex-1 font-medium py-2 px-4 rounded-lg transition ${
                  telegramEnabled
                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {telegramEnabled ? t('settings.telegram.disable') : t('settings.telegram.enable')}
              </button>
            </div>
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
                  {t('settings.other.anonymousCors')}
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  {t('settings.other.anonymousCorsHint')}
                </p>
                <textarea
                  value={allowedAnonymousOrigins}
                  onChange={(e) => setAllowedAnonymousOrigins(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm font-mono"
                  placeholder={t('settings.other.anonymousCorsPlaceholder')}
                  rows={4}
                />
              </div>
              <button
                onClick={handleSaveAnonymousOrigins}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition text-sm"
              >
                {t('settings.other.anonymousCorsSave')}
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

        {/* Widget Tab */}
        {activeTab === 'widget' && <WidgetConfigurator />}
      </div>
    </Modal>
  );
}
