import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { ConfirmModal } from './ConfirmModal';

export function Sidebar({
  onSelectUser,
  onDeleteUser,
  onOpenSettings,
  onLogout
}) {
  const { state } = useChat();
  const { users, usersInfo, activeUserId, notifications } = state;
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const getUserName = (userId) => {
    const info = usersInfo[userId];
    return info?.user_name || info?.name || 'Гість';
  };

  const getUserEmail = (userId) => {
    const info = usersInfo[userId];
    return info?.user_email || info?.email || '';
  };

  const getInitial = (userId) => {
    const name = getUserName(userId);
    return name.charAt(0).toUpperCase();
  };

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Чати</h1>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">
            Немає активних чатів
          </div>
        ) : (
          users.map((userId) => (
            <div
              key={userId}
              onClick={() => onSelectUser(userId)}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition relative ${
                activeUserId === userId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {getInitial(userId)}
                  </div>
                  {notifications[userId] && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">
                    {getUserName(userId)}
                  </div>
                  {getUserEmail(userId) && (
                    <div className="text-sm text-gray-500 truncate">
                      {getUserEmail(userId)}
                    </div>
                  )}
                  <div
                    className="text-xs text-gray-400 truncate cursor-pointer hover:text-blue-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(userId);
                    }}
                    title="Клікніть для копіювання"
                  >
                    {userId}
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(userId);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                  title="Видалити чат"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings bar */}
      <div className="border-t border-gray-200 p-2 flex justify-around bg-gray-50">
        <button
          onClick={() => onOpenSettings('password')}
          className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
          title="Змінити пароль"
        >
          <span className="text-lg">🔐</span>
        </button>
        <button
          onClick={() => onOpenSettings('token')}
          className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
          title="API токен"
        >
          <span className="text-lg">🔑</span>
        </button>
        <button
          onClick={() => onOpenSettings('options')}
          className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
          title="Опції"
        >
          <span className="text-lg">⚙️</span>
        </button>
        <button
          onClick={() => onOpenSettings('timezone')}
          className="p-2 text-gray-600 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
          title="Часовий пояс"
        >
          <span className="text-lg">🌍</span>
        </button>
        <button
          onClick={onLogout}
          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          title="Вийти"
        >
          <span className="text-lg">🚪</span>
        </button>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => onDeleteUser(deleteConfirm)}
        title="Видалення чату"
        message="Видалити цей чат та всю історію повідомлень?"
        confirmText="Видалити"
        cancelText="Скасувати"
        danger
      />
    </aside>
  );
}
