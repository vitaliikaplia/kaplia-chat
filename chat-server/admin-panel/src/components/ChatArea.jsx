import { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Message } from './Message';
import { SystemMessage } from './SystemMessage';
import { isDifferentDay, getDateDivider } from '../utils/dateUtils';

export function ChatArea({ onSendMessage, onDeleteMessage }) {
  const { state } = useChat();
  const { activeUserId, messages, usersInfo, typingText, config } = state;
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const userInfo = activeUserId ? usersInfo[activeUserId] : null;
  const userName = userInfo?.user_name || userInfo?.name || 'Гість';
  const userEmail = userInfo?.user_email || userInfo?.email || '';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingText]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUserId) return;

    onSendMessage(activeUserId, inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Group messages by date
  const renderMessages = () => {
    const result = [];
    let lastDate = null;

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.timestamp);

      // Add date divider if needed
      if (!lastDate || isDifferentDay(lastDate, msgDate, config.timezone)) {
        result.push(
          <div key={`divider-${index}`} className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 text-sm text-gray-500">
              {getDateDivider(msgDate, config.dateFormat, config.timezone)}
            </span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>
        );
      }
      lastDate = msgDate;

      // Render system message or regular message
      if (msg.sender === 'system') {
        result.push(
          <SystemMessage
            key={msg.id}
            message={msg}
            config={config}
          />
        );
      } else {
        result.push(
          <Message
            key={msg.id}
            message={msg}
            config={config}
            onDelete={() => onDeleteMessage(msg.id, activeUserId)}
          />
        );
      }
    });

    return result;
  };

  if (!activeUserId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p>Виберіть чат для початку спілкування</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {/* Chat header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="font-medium text-gray-800">
          {userName}{userEmail && `: ${userEmail}`}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {userInfo?.user_session && (
            <span>user_session: {userInfo.user_session}, </span>
          )}
          {userInfo?.user_id && (
            <span>user_id: {userInfo.user_id}, </span>
          )}
          <span
            className="cursor-pointer hover:text-blue-500"
            onClick={() => navigator.clipboard.writeText(activeUserId)}
            title="Клікніть для копіювання"
          >
            target_id: {activeUserId}
          </span>
        </div>
        {userInfo?.current_url && (
          <div className="text-xs mt-1 flex items-center gap-1">
            <span className="text-gray-400">📍</span>
            <a
              href={userInfo.current_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-600 hover:text-cyan-800 hover:underline truncate max-w-md"
              title={userInfo.current_url}
            >
              {userInfo.current_url}
            </a>
          </div>
        )}
      </div>

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            Немає повідомлень
          </div>
        ) : (
          renderMessages()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      {config.realtimeTyping && typingText && (
        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
          <div className="text-sm text-yellow-700">
            <span className="font-medium">Друкує:</span> {typingText}
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введіть повідомлення..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
