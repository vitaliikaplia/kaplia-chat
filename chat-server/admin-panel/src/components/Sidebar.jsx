import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { useTranslation } from '../i18n';
import { getTimeString } from '../utils/dateUtils';
import { ConfirmModal } from './ConfirmModal';
import { EditUserModal } from './EditUserModal';

export function Sidebar({
  onSelectUser,
  onDeleteUser,
  onEditUser,
  onOpenSettings,
  onLogout,
  onSearch,
  onSearchResultsHandler
}) {
  const { state } = useChat();
  const { t } = useTranslation();
  const { users, usersInfo, activeUserId, notifications, onlineUsers, tabActiveUsers, config } = state;
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editUserId, setEditUserId] = useState(null);

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const lastSearchQueryRef = useRef('');

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

  // Register search results handler
  useEffect(() => {
    if (onSearchResultsHandler) {
      onSearchResultsHandler((results, query) => {
        if (query === lastSearchQueryRef.current) {
          setSearchResults(results);
          setSearchLoading(false);
        }
      });
    }
    return () => {
      if (onSearchResultsHandler) {
        onSearchResultsHandler(null);
      }
    };
  }, [onSearchResultsHandler]);

  // Auto-focus input when search mode opens
  useEffect(() => {
    if (searchMode && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchMode]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSearchInput = useCallback((value) => {
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      lastSearchQueryRef.current = '';
      return;
    }

    if (value.trim().length > 100) return;

    setSearchLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      lastSearchQueryRef.current = value.trim();
      onSearch(value.trim());
    }, 400);
  }, [onSearch]);

  const openSearch = useCallback(() => {
    setSearchMode(true);
    setSearchQuery('');
    setSearchResults(null);
    setSearchLoading(false);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchMode(false);
    setSearchQuery('');
    setSearchResults(null);
    setSearchLoading(false);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Render a user item (reused in both normal and search modes)
  const renderUserItem = (userId, info, matchedText) => {
    const online = isUserOnline(userId);
    const name = info?.user_name || info?.name || t('sidebar.guest');
    const email = info?.user_email || info?.email || '';
    const initial = name.charAt(0).toUpperCase();

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
              {initial}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
              online ? 'bg-green-500' : 'bg-gray-400'
            }`}></span>
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className={`font-medium truncate ${online ? 'text-gray-800' : 'text-gray-500'}`}>
              {name}
            </div>
            {email && (
              <div className="text-sm text-gray-500 truncate">{email}</div>
            )}
            {matchedText && (
              <div className="text-xs text-gray-400 truncate mt-0.5 italic">
                {matchedText}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      {searchMode ? (
        <div className="p-4 border-b border-gray-200 relative">
          <div className="flex items-center gap-2">
            {/* Search icon on left */}
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {/* Search input */}
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
              maxLength={100}
              placeholder={t('sidebar.searchPlaceholder')}
              className="flex-1 outline-none text-gray-800 placeholder-gray-400 bg-transparent"
            />
            {/* Close button on right */}
            <button
              onClick={closeSearch}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Loading animation bar */}
          {searchLoading && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden">
              <div className="h-full bg-blue-500 animate-search-loading"></div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">{t('sidebar.title')}</h1>
          <div className="flex items-center gap-1">
            {/* Search button */}
            <button
              onClick={openSearch}
              className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
              title={t('sidebar.search')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            {/* Settings button */}
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
            {/* Logout button */}
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
      )}

      {/* User list / Search results */}
      <div className="flex-1 overflow-y-auto">
        {searchMode ? (
          <>
            {searchQuery.trim().length < 2 ? (
              <div className="p-4 text-gray-400 text-center text-sm">
                {t('sidebar.searchHint')}
              </div>
            ) : searchResults !== null && !searchLoading ? (
              searchResults.length === 0 ? (
                <div className="p-4 text-gray-400 text-center text-sm">
                  {t('sidebar.searchNoResults')}
                </div>
              ) : (
                searchResults.map((result) => renderUserItem(result.id, result.info, result.matchedText))
              )
            ) : null}
          </>
        ) : (
          <>
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
                          {/* Notes indicator */}
                          {usersInfo[userId]?.admin_notes && (
                            <span title={usersInfo[userId].admin_notes}>
                              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                        {usersInfo[userId]?.lastMessage ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs text-gray-400 truncate flex-1">
                              {usersInfo[userId].lastMessage.sender === 'support' && (
                                <span className="text-gray-500">{t('sidebar.you')}: </span>
                              )}
                              {usersInfo[userId].lastMessage.text}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {getTimeString(usersInfo[userId].lastMessage.timestamp, config.timeFormat, config.timezone)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-0.5">{getUserEmail(userId) || userId}</div>
                        )}
                      </div>

                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditUserId(userId);
                        }}
                        className="p-1 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded transition"
                        title={t('sidebar.editUser')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>

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
          </>
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

      {/* Edit user modal */}
      <EditUserModal
        isOpen={!!editUserId}
        onClose={() => setEditUserId(null)}
        userId={editUserId}
        userInfo={editUserId ? usersInfo[editUserId] : null}
        onSave={onEditUser}
      />
    </aside>
  );
}
