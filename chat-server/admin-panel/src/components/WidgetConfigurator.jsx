import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';

const STORAGE_KEY = 'kaplia_widget_config';

const LANG_LABELS = { ua: 'Українська', en: 'English', ru: 'Русский' };

const DEFAULT_CONFIG = {
  anonymous: true,
  defaultLanguage: 'ua',
  useAdminTimezone: false,
  themeColor: '#007bff',
  position: 'bottom-right',
  offsetX: 20,
  offsetY: 20,
  i18n: {
    ua: { title: '', subtitle: '', inputPlaceholder: '', sendBtn: '', initialMessage: '' },
    en: { title: '', subtitle: '', inputPlaceholder: '', sendBtn: '', initialMessage: '' },
    ru: { title: '', subtitle: '', inputPlaceholder: '', sendBtn: '', initialMessage: '' },
  },
  metadata: {
    user_session: '',
    user_id: '',
    user_name: '',
    user_email: '',
  },
};

function deepMerge(defaults, saved) {
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (saved && saved[key] !== undefined) {
      if (typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])) {
        result[key] = deepMerge(defaults[key], saved[key]);
      } else {
        result[key] = saved[key];
      }
    }
  }
  return result;
}

function generateSnippet(config) {
  const parts = [];

  // 1. CSS overrides (only if color or position differs from defaults)
  const needsCSS = config.themeColor !== '#007bff'
    || config.position !== 'bottom-right'
    || config.offsetX !== 20
    || config.offsetY !== 20;

  if (needsCSS) {
    const cssRules = [];
    const color = config.themeColor;
    const isLeft = config.position === 'bottom-left';
    const x = config.offsetX;
    const y = config.offsetY;
    const colorChanged = color !== '#007bff';

    // Chat button
    let btnParts = [];
    if (colorChanged) btnParts.push(`background: ${color} !important`);
    btnParts.push(`bottom: ${y}px !important`);
    if (isLeft) {
      btnParts.push('right: auto !important', `left: ${x}px !important`);
    } else {
      btnParts.push(`right: ${x}px !important`);
    }
    cssRules.push(`  #kaplia-widget .kaplia-chat-btn { ${btnParts.join('; ')}; }`);

    // Chat box
    let boxParts = [];
    boxParts.push(`bottom: ${y + 70}px !important`);
    if (isLeft) {
      boxParts.push('right: auto !important', `left: ${x}px !important`);
    } else {
      boxParts.push(`right: ${x}px !important`);
    }
    cssRules.push(`  #kaplia-widget .kaplia-chat-box { ${boxParts.join('; ')}; }`);

    if (colorChanged) {
      cssRules.push(`  #kaplia-widget .k-header { background: ${color} !important; }`);
      cssRules.push(`  #kaplia-widget .k-msg.me { background: ${color} !important; }`);
      cssRules.push(`  #kaplia-widget .k-input-area button { background: ${color} !important; }`);
      cssRules.push(`  #kaplia-widget .k-name-form button { background: ${color} !important; }`);
      cssRules.push(`  #kaplia-widget .k-name-form input:focus { border-color: ${color} !important; }`);
    }

    parts.push(`<style>\n${cssRules.join('\n')}\n</style>`);
  }

  // 2. Config object
  const configObj = {};
  configObj.defaultLanguage = config.defaultLanguage;

  // Initial messages (fallback from default language)
  const defaultLangMsg = config.i18n[config.defaultLanguage]?.initialMessage;
  if (defaultLangMsg) {
    configObj.initialMessages = [defaultLangMsg];
  }

  configObj.useAdminTimezone = config.useAdminTimezone;

  // i18n block
  const i18nBlock = {};
  for (const lang of ['ua', 'en', 'ru']) {
    const lc = config.i18n[lang];
    if (!lc) continue;
    const entry = {};
    if (lc.title) entry.title = lc.title;
    if (lc.subtitle) entry.subtitle = lc.subtitle;
    if (lc.inputPlaceholder) entry.inputPlaceholder = lc.inputPlaceholder;
    if (lc.sendBtn) entry.sendBtn = lc.sendBtn;
    if (lc.initialMessage) entry.initialMessages = [lc.initialMessage];
    if (Object.keys(entry).length > 0) {
      i18nBlock[lang] = entry;
    }
  }
  if (Object.keys(i18nBlock).length > 0) {
    configObj.i18n = i18nBlock;
  }

  // Metadata (only if not anonymous)
  if (!config.anonymous) {
    configObj.metadata = {
      user_session: config.metadata.user_session || '{{ session_id }}',
      user_id: config.metadata.user_id || '{{ user.id }}',
      user_name: config.metadata.user_name || '{{ user.name }}',
      user_email: config.metadata.user_email || '{{ user.email }}',
    };
  }

  const configJSON = JSON.stringify(configObj, null, 2);
  parts.push(`<script>\nwindow.KapliaChatConfig = ${configJSON};\n</script>`);
  parts.push('<script src="https://chat.kaplia.pro/widget.js"></script>');

  return parts.join('\n');
}

export function WidgetConfigurator() {
  const { t } = useTranslation();
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? deepMerge(DEFAULT_CONFIG, JSON.parse(saved)) : DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });
  const [copied, setCopied] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Helpers
  const update = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateI18n = (lang, field, value) => {
    setConfig(prev => ({
      ...prev,
      i18n: {
        ...prev.i18n,
        [lang]: { ...prev.i18n[lang], [field]: value },
      },
    }));
  };

  const updateMetadata = (field, value) => {
    setConfig(prev => ({
      ...prev,
      metadata: { ...prev.metadata, [field]: value },
    }));
  };

  // Generate snippet
  const snippet = useMemo(() => generateSnippet(config), [config]);

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const hintClass = 'text-xs text-gray-500 mt-1';

  return (
    <div className="space-y-6">
      {/* Anonymous mode */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">{t('settings.widget.anonymous')}</span>
            <p className="text-xs text-gray-500">{t('settings.widget.anonymousHint')}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.anonymous}
              onChange={(e) => update('anonymous', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
        {!config.anonymous && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            {t('settings.widget.anonymousNote')}
          </div>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* Default language */}
      <div className="space-y-2">
        <span className="text-sm font-medium text-gray-700">{t('settings.widget.defaultLanguage')}</span>
        <p className="text-xs text-gray-500">{t('settings.widget.defaultLanguageHint')}</p>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          {['ua', 'en', 'ru'].map((lang, index) => (
            <button
              key={lang}
              onClick={() => update('defaultLanguage', lang)}
              className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                index < 2 ? 'border-r border-gray-300' : ''
              } ${
                config.defaultLanguage === lang
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* useAdminTimezone */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-700">{t('settings.widget.useAdminTimezone')}</span>
          <p className="text-xs text-gray-500">{t('settings.widget.useAdminTimezoneHint')}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.useAdminTimezone}
            onChange={(e) => update('useAdminTimezone', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
        </label>
      </div>

      <hr className="border-gray-200" />

      {/* Visual customization */}
      <div className="space-y-4">
        <span className="text-sm font-medium text-gray-700">{t('settings.widget.visual')}</span>

        {/* Color picker */}
        <div>
          <label className={labelClass}>{t('settings.widget.themeColor')}</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={config.themeColor}
              onChange={(e) => update('themeColor', e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={config.themeColor}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) {
                  update('themeColor', v);
                }
              }}
              onBlur={() => {
                if (!/^#[0-9a-fA-F]{6}$/.test(config.themeColor)) {
                  update('themeColor', '#007bff');
                }
              }}
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm font-mono"
              placeholder="#007bff"
            />
          </div>
          <p className={hintClass}>{t('settings.widget.themeColorHint')}</p>
        </div>

        {/* Position */}
        <div>
          <label className={labelClass}>{t('settings.widget.position')}</label>
          <div className="flex rounded-lg overflow-hidden border border-gray-300">
            <button
              onClick={() => update('position', 'bottom-right')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition border-r border-gray-300 ${
                config.position === 'bottom-right'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('settings.widget.positionRight')}
            </button>
            <button
              onClick={() => update('position', 'bottom-left')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition ${
                config.position === 'bottom-left'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('settings.widget.positionLeft')}
            </button>
          </div>
        </div>

        {/* Offsets */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className={labelClass}>{t('settings.widget.offsetX')}</label>
            <input
              type="number"
              min="0"
              max="200"
              value={config.offsetX}
              onChange={(e) => update('offsetX', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className={labelClass}>{t('settings.widget.offsetY')}</label>
            <input
              type="number"
              min="0"
              max="200"
              value={config.offsetY}
              onChange={(e) => update('offsetY', parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          </div>
        </div>
        <p className={hintClass}>{t('settings.widget.offsetHint')}</p>
      </div>

      <hr className="border-gray-200" />

      {/* i18n texts */}
      <div className="space-y-4">
        <div>
          <span className="text-sm font-medium text-gray-700">{t('settings.widget.i18nTitle')}</span>
          <p className="text-xs text-gray-500">{t('settings.widget.i18nHint')}</p>
        </div>

        {['ua', 'en', 'ru'].map((lang) => (
          <div key={lang} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-gray-500 rounded px-2 py-0.5 uppercase">{lang}</span>
              <span className="text-xs text-gray-500">{LANG_LABELS[lang]}</span>
            </div>

            <div>
              <label className={labelClass}>{t('settings.widget.initialMessage')}</label>
              <input
                type="text"
                value={config.i18n[lang].initialMessage}
                onChange={(e) => updateI18n(lang, 'initialMessage', e.target.value)}
                className={inputClass}
                placeholder={lang === 'ua' ? 'Привіт! Чим можу допомогти?' : lang === 'en' ? 'Hello! How can I help you?' : 'Привет! Чем могу помочь?'}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>{t('settings.widget.title')}</label>
                <input
                  type="text"
                  value={config.i18n[lang].title}
                  onChange={(e) => updateI18n(lang, 'title', e.target.value)}
                  className={inputClass}
                  placeholder={lang === 'ua' ? 'Привіт! 👋' : lang === 'en' ? 'Hi there! 👋' : 'Привет! 👋'}
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.widget.subtitle')}</label>
                <input
                  type="text"
                  value={config.i18n[lang].subtitle}
                  onChange={(e) => updateI18n(lang, 'subtitle', e.target.value)}
                  className={inputClass}
                  placeholder={lang === 'ua' ? 'Чим можу допомогти?' : lang === 'en' ? 'How can I help?' : 'Чем могу помочь?'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>{t('settings.widget.inputPlaceholder')}</label>
                <input
                  type="text"
                  value={config.i18n[lang].inputPlaceholder}
                  onChange={(e) => updateI18n(lang, 'inputPlaceholder', e.target.value)}
                  className={inputClass}
                  placeholder={lang === 'ua' ? 'Введіть повідомлення...' : lang === 'en' ? 'Type your message...' : 'Введите сообщение...'}
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.widget.sendBtn')}</label>
                <input
                  type="text"
                  value={config.i18n[lang].sendBtn}
                  onChange={(e) => updateI18n(lang, 'sendBtn', e.target.value)}
                  className={inputClass}
                  placeholder={lang === 'ua' ? 'Надіслати' : lang === 'en' ? 'Send' : 'Отпр'}
                />
              </div>
            </div>

            {lang !== 'ru' && <hr className="border-gray-100" />}
          </div>
        ))}

        <p className={hintClass}>{t('settings.widget.initialMessageHint')}</p>
      </div>

      {/* Metadata (only when anonymous is OFF) */}
      {!config.anonymous && (
        <>
          <hr className="border-gray-200" />

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">{t('settings.widget.metadata')}</span>
              <p className="text-xs text-gray-500">{t('settings.widget.metadataHint')}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>{t('settings.widget.metadataSession')}</label>
                <input
                  type="text"
                  value={config.metadata.user_session}
                  onChange={(e) => updateMetadata('user_session', e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="{{ session_id }}"
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.widget.metadataUserId')}</label>
                <input
                  type="text"
                  value={config.metadata.user_id}
                  onChange={(e) => updateMetadata('user_id', e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="{{ user.id }}"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>{t('settings.widget.metadataUserName')}</label>
                <input
                  type="text"
                  value={config.metadata.user_name}
                  onChange={(e) => updateMetadata('user_name', e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="{{ user.name }}"
                />
              </div>
              <div>
                <label className={labelClass}>{t('settings.widget.metadataUserEmail')}</label>
                <input
                  type="text"
                  value={config.metadata.user_email}
                  onChange={(e) => updateMetadata('user_email', e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="{{ user.email }}"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <hr className="border-gray-200" />

      {/* Code snippet */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t('settings.widget.snippet')}</span>
          <button
            onClick={copySnippet}
            className={`px-3 py-1 text-xs rounded-lg transition ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {copied ? t('settings.widget.copied') : t('settings.widget.copy')}
          </button>
        </div>
        <p className="text-xs text-gray-500">{t('settings.widget.snippetHint')}</p>
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all select-all">
          {snippet}
        </pre>
      </div>
    </div>
  );
}
