import { useState, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import { useTranslation } from '../i18n';
import { ConfirmModal } from './ConfirmModal';

export function Sidebar({
  onSelectUser,
  onDeleteUser,
  onOpenSettings,
  onLogout
}) {
  const { state } = useChat();
  const { t } = useTranslation();
  const { users, usersInfo, activeUserId, notifications, onlineUsers, tabActiveUsers } = state;
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Sort users: online first, then offline
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUsers[a] ?? false;
      const bOnline = onlineUsers[b] ?? false;
      if (aOnline === bOnline) return 0;
      return aOnline ? -1 : 1;
    });
  }, [users, onlineUsers]);

  const isUserOnline = (userId) => onlineUsers[userId] ?? false;
  const isTabActive = (userId) => tabActiveUsers[userId] ?? false;

  const getUserName = (userId) => {
    const info = usersInfo[userId];
    return info?.user_name || info?.name || t('sidebar.guest');
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
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">{t('sidebar.title')}</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOpenSettings('options')}
            className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
            title={t('sidebar.settings')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            title={t('sidebar.logout')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-4 text-gray-500 text-center">
            {t('sidebar.noChats')}
          </div>
        ) : (
          sortedUsers.map((userId) => {
            const online = isUserOnline(userId);
            return (
              <div
                key={userId}
                onClick={() => onSelectUser(userId)}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition relative ${
                  activeUserId === userId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                } ${!online ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      online ? 'bg-blue-500' : 'bg-gray-400'
                    }`}>
                      {getInitial(userId)}
                    </div>
                    {notifications[userId] && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                    {/* Online indicator */}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                      online ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate flex items-center gap-1.5 ${online ? 'text-gray-800' : 'text-gray-500'}`}>
                      {getUserName(userId)}
                      {/* Tab active indicator - eye icon */}
                      {online && (
                        <span title={isTabActive(userId) ? t('sidebar.tabActive') : t('sidebar.tabBackground')}>
                          {isTabActive(userId) ? (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                            </svg>
                          )}
                        </span>
                      )}
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
                      title={t('sidebar.copyId')}
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
                    title={t('sidebar.deleteChat')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => onDeleteUser(deleteConfirm)}
        title={t('confirm.deleteChat')}
        message={t('confirm.deleteChatMessage')}
        confirmText={t('confirm.delete')}
        cancelText={t('confirm.cancel')}
        danger
      />
    </aside>
  );
}
