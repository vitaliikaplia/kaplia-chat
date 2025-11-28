import { useState } from 'react';
import { getTimeString } from '../utils/dateUtils';
import { linkify } from '../utils/linkUtils';

export function Message({ message, config, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);
  const isClient = message.sender === 'client';

  const renderText = (text) => {
    const parts = linkify(text);
    return parts.map((part) => {
      if (part.type === 'link') {
        return (
          <a
            key={part.key}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {part.url}
          </a>
        );
      }
      return <span key={part.key}>{part.content}</span>;
    });
  };

  return (
    <div
      className={`flex mb-3 ${isClient ? 'justify-start' : 'justify-end'}`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div className={`relative max-w-[70%] group`}>
        {/* Delete button */}
        {showDelete && (
          <button
            onClick={onDelete}
            className={`absolute top-1 ${isClient ? '-right-6' : '-left-6'} p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity`}
            title="Видалити"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl break-words ${
            isClient
              ? 'bg-white border border-gray-200 rounded-bl-md'
              : 'bg-blue-500 text-white rounded-br-md'
          }`}
        >
          <div className="whitespace-pre-wrap">{renderText(message.text)}</div>
        </div>

        {/* Timestamp */}
        <div
          className={`text-xs text-gray-400 mt-1 ${
            isClient ? 'text-left' : 'text-right'
          }`}
        >
          {getTimeString(message.timestamp, config.timeFormat, config.timezone)}
        </div>
      </div>
    </div>
  );
}
