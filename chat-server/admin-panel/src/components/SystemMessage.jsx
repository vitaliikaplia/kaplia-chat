import { getTimeString } from '../utils/dateUtils';
import { useTranslation } from '../i18n';

export function SystemMessage({ message, config }) {
  const { t } = useTranslation();
  const messageText = message.text;

  // Check if it's a page_visit with URL
  const isPageVisit = messageText.startsWith('page_visit:');
  const eventType = isPageVisit ? 'page_visit' : messageText;
  const pageUrl = isPageVisit ? messageText.replace('page_visit:', '') : null;

  const EVENT_CONFIG = {
    user_connected: {
      icon: '🟢',
      textKey: 'systemEvents.user_connected',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
    },
    user_left: {
      icon: '🔴',
      textKey: 'systemEvents.user_left',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
    },
    tab_active: {
      icon: '👁',
      textKey: 'systemEvents.tab_active',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
    },
    tab_inactive: {
      icon: '👁‍🗨',
      textKey: 'systemEvents.tab_inactive',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-600',
    },
    chat_opened: {
      icon: '💬',
      textKey: 'systemEvents.chat_opened',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
    },
    chat_closed: {
      icon: '✖️',
      textKey: 'systemEvents.chat_closed',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
    },
    page_visit: {
      icon: '🔗',
      textKey: 'systemEvents.page_visit',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      textColor: 'text-cyan-700',
    },
  };

  const eventConfig = EVENT_CONFIG[eventType] || {
    icon: 'ℹ️',
    textKey: null,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-600',
  };

  const displayText = eventConfig.textKey ? t(eventConfig.textKey) : messageText;
  const timeStr = getTimeString(message.timestamp, config.timeFormat, config.timezone);

  // Special layout for page_visit with URL
  if (isPageVisit && pageUrl) {
    return (
      <div className="flex justify-center my-2">
        <div className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg border ${eventConfig.bgColor} ${eventConfig.borderColor} max-w-md`}>
          <div className="flex items-center gap-2">
            <span className="text-sm">{eventConfig.icon}</span>
            <span className={`text-xs font-medium ${eventConfig.textColor}`}>
              {displayText}
            </span>
            <span className="text-xs text-gray-400">
              {timeStr}
            </span>
          </div>
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-600 hover:text-cyan-800 hover:underline truncate max-w-full"
            title={pageUrl}
          >
            {pageUrl}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-2">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${eventConfig.bgColor} ${eventConfig.borderColor}`}>
        <span className="text-sm">{eventConfig.icon}</span>
        <span className={`text-xs font-medium ${eventConfig.textColor}`}>
          {displayText}
        </span>
        <span className="text-xs text-gray-400">
          {timeStr}
        </span>
      </div>
    </div>
  );
}
