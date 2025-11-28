import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { playSound, soundOptions } from '../utils/notificationSound';

const tabs = [
  { id: 'spam', label: 'Захист від спаму' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'sound', label: 'Звук' },
  { id: 'other', label: 'Інше' },
];

export function OptionsModal({
  isOpen,
  onClose,
  config,
  onSaveWebhook,
  onSaveRealtimeTyping,
  onSaveAllowedOrigins,
  onSaveRateLimit,
  soundEnabled,
  onSoundEnabledChange,
  soundType,
  onSoundTypeChange
}) {
  const [activeTab, setActiveTab] = useState('spam');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [realtimeTyping, setRealtimeTyping] = useState(false);
  const [allowedOrigins, setAllowedOrigins] = useState('');
  const [maxMessagesPerMinute, setMaxMessagesPerMinute] = useState(20);
  const [maxMessageLength, setMaxMessageLength] = useState(1000);

  useEffect(() => {
    if (isOpen && config) {
      setWebhookUrl(config.webhookUrl || '');
      setWebhookEnabled(config.webhookEnabled || false);
      setRealtimeTyping(config.realtimeTyping || false);
      setAllowedOrigins(config.allowedOrigins || '');
      setMaxMessagesPerMinute(config.maxMessagesPerMinute || 20);
      setMaxMessageLength(config.maxMessageLength || 1000);
    }
  }, [isOpen, config]);

  const handleSaveWebhook = () => {
    onSaveWebhook(webhookUrl, webhookEnabled);
  };

  const handleSaveTyping = () => {
    onSaveRealtimeTyping(realtimeTyping);
  };

  const handleSaveOrigins = () => {
    onSaveAllowedOrigins(allowedOrigins);
  };

  const handleSaveRateLimit = () => {
    onSaveRateLimit(parseInt(maxMessagesPerMinute) || 20, parseInt(maxMessageLength) || 1000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Налаштування" size="lg">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 -mt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
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

        {/* Sound Tab */}
        {activeTab === 'sound' && (
          <div className="space-y-6">
            {/* Sound enabled toggle */}
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

            {/* Sound type selector */}
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

        {/* Other Tab */}
        {activeTab === 'other' && (
          <div className="space-y-6">
            {/* Realtime typing */}
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

            {/* CORS settings */}
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
