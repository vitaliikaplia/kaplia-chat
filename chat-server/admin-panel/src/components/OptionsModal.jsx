import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { playSound, soundOptions } from '../utils/notificationSound';

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

const tabs = [
  { id: 'password', label: 'Пароль' },
  { id: 'token', label: 'API токен' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'time', label: 'Час' },
  { id: 'sound', label: 'Звук' },
  { id: 'messages', label: 'Повідомлення' },
  { id: 'spam', label: 'Спам' },
  { id: 'other', label: 'Інше' },
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
  onSaveAllowedOrigins,
  onSaveRateLimit,
  onSaveMessageLimits,
  soundEnabled,
  onSoundEnabledChange,
  soundType,
  onSoundTypeChange,
  onCopyToken
}) {
  const [activeTab, setActiveTab] = useState('password');

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
      setPasswordError('Введіть новий пароль');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Паролі не співпадають');
      return;
    }
    if (password.length < 6) {
      setPasswordError('Пароль має бути не менше 6 символів');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Налаштування" size="xl">
      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200 mb-4 -mt-2 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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

      {/* Tab content */}
      <div className="space-y-4">
        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Новий пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Введіть новий пароль"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Підтвердіть пароль
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="Повторіть пароль"
              />
            </div>

            {passwordError && (
              <div className="text-red-500 text-sm">{passwordError}</div>
            )}

            <button
              onClick={handleSavePassword}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Зберегти пароль
            </button>
          </div>
        )}

        {/* Token Tab */}
        {activeTab === 'token' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Токен для API запитів
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
                  placeholder="API токен"
                />
                <button
                  onClick={copyToken}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                  title="Копіювати"
                >
                  📋
                </button>
              </div>
            </div>

            <button
              onClick={generateToken}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
            >
              🔄 Генерувати новий токен
            </button>

            <button
              onClick={handleSaveToken}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Зберегти
            </button>
          </div>
        )}

        {/* Webhook Tab */}
        {activeTab === 'webhook' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Webhook увімкнено</span>
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
                URL вебхуку
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="https://example.com/webhook"
              />
              <p className="text-xs text-gray-500 mt-1">
                Сюди будуть надсилатися POST-запити при нових повідомленнях
              </p>
            </div>

            <button
              onClick={handleSaveWebhook}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Зберегти
            </button>
          </div>
        )}

        {/* Time Tab */}
        {activeTab === 'time' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Часовий пояс
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
                Формат дати
              </label>
              <input
                type="text"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                placeholder="d.m.Y"
              />
              <p className="text-xs text-gray-500 mt-1">
                Формати: d (день), m (місяць), Y (рік)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Формат часу
              </label>
              <input
                type="text"
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
                placeholder="H:i"
              />
              <p className="text-xs text-gray-500 mt-1">
                Формати: H (години 24), g (години 12), i (хвилини), s (секунди), A (AM/PM)
              </p>
            </div>

            <button
              onClick={handleSaveTime}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Зберегти
            </button>
          </div>
        )}

        {/* Sound Tab */}
        {activeTab === 'sound' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Звукові сповіщення</span>
                <p className="text-xs text-gray-500">Програвати звук при нових повідомленнях</p>
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
                Тип звуку сповіщення
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
                      <span className="text-sm text-gray-700">{sound.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound(sound.id);
                      }}
                      className="px-3 py-1 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                      title="Прослухати"
                    >
                      ▶ Тест
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
                Повідомлень в адмін чаті
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
                Скільки останніх повідомлень завантажувати в адмін панелі
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Повідомлень у віджеті
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
                Скільки останніх повідомлень завантажувати у віджеті клієнта
              </p>
            </div>

            <button
              onClick={handleSaveMessageLimits}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Зберегти
            </button>
          </div>
        )}

        {/* Spam Protection Tab */}
        {activeTab === 'spam' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макс. повідомлень за хвилину
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
                Скільки повідомлень може відправити один клієнт за хвилину
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Макс. символів в повідомленні
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
                Максимальна довжина одного повідомлення
              </p>
            </div>

            <button
              onClick={handleSaveRateLimit}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
            >
              Зберегти
            </button>
          </div>
        )}

        {/* Other Tab */}
        {activeTab === 'other' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Перегляд друку в реальному часі</span>
                  <p className="text-xs text-gray-500">Бачити що друкує клієнт до відправки</p>
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
                Зберегти
              </button>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Системні логи</span>
                <p className="text-xs text-gray-500 mb-3">Оберіть які події записувати в історію чату</p>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-gray-300">
                <button
                  onClick={() => handleToggleSystemLog('onlineStatus')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition border-r border-gray-300 ${
                    config.systemLogs?.onlineStatus
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Користувач онлайн/офлайн"
                >
                  Онлайн
                </button>
                <button
                  onClick={() => handleToggleSystemLog('tabActivity')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition border-r border-gray-300 ${
                    config.systemLogs?.tabActivity
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Вкладка активна/у фоні"
                >
                  Вкладка
                </button>
                <button
                  onClick={() => handleToggleSystemLog('chatWidget')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition border-r border-gray-300 ${
                    config.systemLogs?.chatWidget
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Віджет відкрито/закрито"
                >
                  Віджет
                </button>
                <button
                  onClick={() => handleToggleSystemLog('pageVisits')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                    config.systemLogs?.pageVisits
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Перехід на іншу сторінку"
                >
                  Сторінки
                </button>
              </div>
            </div>

            <hr className="border-gray-200" />

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дозволені домени (CORS)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Один домен на рядок. Підтримується * як wildcard.
                  Пусто = всі домени дозволено.
                </p>
                <textarea
                  value={allowedOrigins}
                  onChange={(e) => setAllowedOrigins(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm font-mono"
                  placeholder="https://example.com&#10;https://*.mydomain.com"
                  rows={4}
                />
              </div>
              <button
                onClick={handleSaveOrigins}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition text-sm"
              >
                Зберегти домени
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
