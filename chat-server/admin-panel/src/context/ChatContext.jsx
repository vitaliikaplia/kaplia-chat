import { createContext, useContext, useReducer, useCallback } from 'react';

const ChatContext = createContext(null);

const initialState = {
  isAuthenticated: false,
  users: [],
  usersInfo: {},
  onlineUsers: {}, // Track online status: { odUserId: true/false }
  tabActiveUsers: {}, // Track tab visibility: { odUserId: true/false }
  activeUserId: null,
  messages: [],
  typingText: '',
  config: {
    webhookUrl: '',
    webhookEnabled: false,
    apiToken: '',
    timezone: '0',
    dateFormat: 'd.m.Y',
    timeFormat: 'H:i',
    realtimeTyping: false,
    systemLogs: {
      onlineStatus: true,
      tabActivity: true,
      chatWidget: true,
      pageVisits: true
    },
    allowedOrigins: '',
    maxMessagesPerMinute: 20,
    maxMessageLength: 1000,
    adminMessagesLimit: 20,
    widgetMessagesLimit: 20,
  },
  notifications: {},
  hasMoreMessages: false,
  loadingMoreMessages: false,
};

function chatReducer(state, action) {
  switch (action.type) {
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };

    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };

    case 'SET_USERS':
      return {
        ...state,
        users: action.payload.map(u => u.id),
        usersInfo: action.payload.reduce((acc, u) => {
          acc[u.id] = u.info || {};
          return acc;
        }, {}),
      };

    case 'ADD_USER':
      if (state.users.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        users: [...state.users, action.payload],
        usersInfo: { ...state.usersInfo, [action.payload]: {} },
      };

    case 'UPDATE_USER_INFO':
      return {
        ...state,
        usersInfo: {
          ...state.usersInfo,
          [action.payload.id]: {
            ...state.usersInfo[action.payload.id],
            ...action.payload.info,
          },
        },
      };

    case 'REMOVE_USER':
      return {
        ...state,
        users: state.users.filter(id => id !== action.payload),
        usersInfo: Object.fromEntries(
          Object.entries(state.usersInfo).filter(([id]) => id !== action.payload)
        ),
        activeUserId: state.activeUserId === action.payload ? null : state.activeUserId,
        messages: state.activeUserId === action.payload ? [] : state.messages,
        notifications: Object.fromEntries(
          Object.entries(state.notifications).filter(([id]) => id !== action.payload)
        ),
      };

    case 'SET_ACTIVE_USER':
      return {
        ...state,
        activeUserId: action.payload,
        messages: [],
        typingText: '',
        hasMoreMessages: false,
        loadingMoreMessages: false,
        notifications: {
          ...state.notifications,
          [action.payload]: false,
        },
      };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload.messages, hasMoreMessages: action.payload.hasMore };

    case 'PREPEND_MESSAGES':
      return {
        ...state,
        messages: [...action.payload.messages, ...state.messages],
        hasMoreMessages: action.payload.hasMore,
        loadingMoreMessages: false,
      };

    case 'SET_LOADING_MORE':
      return { ...state, loadingMoreMessages: action.payload };

    case 'SET_HAS_MORE':
      return { ...state, hasMoreMessages: action.payload };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        notifications: action.payload.userId !== state.activeUserId && action.payload.sender === 'client'
          ? { ...state.notifications, [action.payload.userId]: true }
          : state.notifications,
      };

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(m => m.id !== action.payload),
      };

    case 'DELETE_SYSTEM_MESSAGES':
      return {
        ...state,
        messages: state.messages.filter(m => m.sender !== 'system'),
      };

    case 'SET_TYPING':
      return { ...state, typingText: action.payload };

    case 'SET_NOTIFICATION':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [action.payload.userId]: action.payload.hasNotification,
        },
      };

    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [action.payload]: false,
        },
      };

    case 'SET_USER_ONLINE':
      return {
        ...state,
        onlineUsers: {
          ...state.onlineUsers,
          [action.payload.userId]: action.payload.isOnline,
        },
      };

    case 'SET_TAB_ACTIVE':
      return {
        ...state,
        tabActiveUsers: {
          ...state.tabActiveUsers,
          [action.payload.userId]: action.payload.isActive,
        },
      };

    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const setAuthenticated = useCallback((value) => {
    dispatch({ type: 'SET_AUTHENTICATED', payload: value });
  }, []);

  const setConfig = useCallback((config) => {
    dispatch({ type: 'SET_CONFIG', payload: config });
  }, []);

  const setUsers = useCallback((users) => {
    dispatch({ type: 'SET_USERS', payload: users });
  }, []);

  const addUser = useCallback((userId) => {
    dispatch({ type: 'ADD_USER', payload: userId });
  }, []);

  const updateUserInfo = useCallback((id, info) => {
    dispatch({ type: 'UPDATE_USER_INFO', payload: { id, info } });
  }, []);

  const removeUser = useCallback((userId) => {
    dispatch({ type: 'REMOVE_USER', payload: userId });
  }, []);

  const setActiveUser = useCallback((userId) => {
    dispatch({ type: 'SET_ACTIVE_USER', payload: userId });
  }, []);

  const setMessages = useCallback((messages, hasMore = false) => {
    dispatch({ type: 'SET_MESSAGES', payload: { messages, hasMore } });
  }, []);

  const prependMessages = useCallback((messages, hasMore = false) => {
    dispatch({ type: 'PREPEND_MESSAGES', payload: { messages, hasMore } });
  }, []);

  const setLoadingMore = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING_MORE', payload: loading });
  }, []);

  const setHasMore = useCallback((hasMore) => {
    dispatch({ type: 'SET_HAS_MORE', payload: hasMore });
  }, []);

  const addMessage = useCallback((message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const deleteMessage = useCallback((msgId) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: msgId });
  }, []);

  const deleteSystemMessagesFromState = useCallback(() => {
    dispatch({ type: 'DELETE_SYSTEM_MESSAGES' });
  }, []);

  const setTyping = useCallback((text) => {
    dispatch({ type: 'SET_TYPING', payload: text });
  }, []);

  const setNotification = useCallback((userId, hasNotification) => {
    dispatch({ type: 'SET_NOTIFICATION', payload: { userId, hasNotification } });
  }, []);

  const clearNotification = useCallback((userId) => {
    dispatch({ type: 'CLEAR_NOTIFICATION', payload: userId });
  }, []);

  const setUserOnline = useCallback((userId, isOnline) => {
    dispatch({ type: 'SET_USER_ONLINE', payload: { userId, isOnline } });
  }, []);

  const setTabActive = useCallback((userId, isActive) => {
    dispatch({ type: 'SET_TAB_ACTIVE', payload: { userId, isActive } });
  }, []);

  const value = {
    state,
    setAuthenticated,
    setConfig,
    setUsers,
    addUser,
    updateUserInfo,
    removeUser,
    setActiveUser,
    setMessages,
    prependMessages,
    setLoadingMore,
    setHasMore,
    addMessage,
    deleteMessage,
    deleteSystemMessagesFromState,
    setTyping,
    setNotification,
    clearNotification,
    setUserOnline,
    setTabActive,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
