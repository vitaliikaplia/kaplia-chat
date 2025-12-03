import { useState, useRef, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { Message } from './Message';
import { SystemMessage } from './SystemMessage';
import { isDifferentDay, getDateDivider } from '../utils/dateUtils';

export function ChatArea({ onSendMessage, onDeleteMessage, onLoadMore, onDeleteSystemMessages }) {
  const { state } = useChat();
  const { activeUserId, messages, usersInfo, typingText, config, hasMoreMessages, loadingMoreMessages } = state;
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);
  const scrollHeightBeforeLoadRef = useRef(0);
  const isPrependingRef = useRef(false);

  const userInfo = activeUserId ? usersInfo[activeUserId] : null;
  const userName = userInfo?.user_name || userInfo?.name || 'Гість';
  const userEmail = userInfo?.user_email || userInfo?.email || '';

  // Reset initial load flag when active user changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    prevMessagesLengthRef.current = 0;
  }, [activeUserId]);

  // Auto-scroll to bottom on initial load or new messages at end
  useEffect(() => {
    if (messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    // If this is initial load or new message added at end, scroll to bottom
    if (isInitialLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isInitialLoadRef.current = false;
    } else if (messages.length > prevMessagesLengthRef.current) {
      // Check if new message was added at end (not prepended)
      const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (wasAtBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (typingText && messagesEndRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        if (wasAtBottom) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [typingText]);

  // Handle scroll to load more messages
  const handleScroll = () => {
    if (!hasMoreMessages || loadingMoreMessages) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    // Load more when scrolled near top (within 50px)
    if (container.scrollTop < 50) {
      // Save scroll height before loading
      scrollHeightBeforeLoadRef.current = container.scrollHeight;
      isPrependingRef.current = true;
      onLoadMore();
    }
  };

  // Restore scroll position after prepending messages
  useEffect(() => {
    if (!isPrependingRef.current) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    // Calculate new scroll position to maintain view
    const newScrollHeight = container.scrollHeight;
    const scrollDiff = newScrollHeight - scrollHeightBeforeLoadRef.current;
    container.scrollTop = scrollDiff;

    isPrependingRef.current = false;
  }, [messages]);

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
        <div className="flex items-center justify-between">
          <div className="font-medium text-gray-800">
            {userName}{userEmail && `: ${userEmail}`}
          </div>
          <button
            onClick={onDeleteSystemMessages}
            className="text-xs text-gray-400 hover:text-red-500 transition"
            title="Видалити системні повідомлення"
          >
            🗑 Очистити лог
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-1">
          {userInfo?.user_session && (
            <span>user_session: {userInfo.user_session},</span>
          )}
          {userInfo?.user_id && (
            <span>user_id: {userInfo.user_id},</span>
          )}
          <span
            className="cursor-pointer hover:text-blue-500"
            onClick={() => navigator.clipboard.writeText(activeUserId)}
            title="Клікніть для копіювання"
          >
            target_id: {activeUserId}
          </span>
          {userInfo?.current_url && (
            <>
              <span className="text-gray-400">📍</span>
              <a
                href={userInfo.current_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 hover:text-cyan-800 hover:underline truncate max-w-xs"
                title={userInfo.current_url}
              >
                {userInfo.current_url}
              </a>
            </>
          )}
        </div>
      </div>

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={handleScroll}
      >
        {/* Load more indicator */}
        {loadingMoreMessages && (
          <div className="text-center py-2 mb-2">
            <span className="text-gray-500 text-sm">Завантаження...</span>
          </div>
        )}
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
