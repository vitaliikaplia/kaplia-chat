import { createContext, useContext, useReducer, useCallback } from 'react';

const ChatContext = createContext(null);

const initialState = {
  isAuthenticated: false,
  users: [],
  usersInfo: {},
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
    allowedOrigins: '',
    maxMessagesPerMinute: 20,
    maxMessageLength: 1000,
  },
  notifications: {},
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
          [action.payload.id]: action.payload.info,
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
        notifications: {
          ...state.notifications,
          [action.payload]: false,
        },
      };

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

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

  const setMessages = useCallback((messages) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  }, []);

  const addMessage = useCallback((message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const deleteMessage = useCallback((msgId) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: msgId });
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
    addMessage,
    deleteMessage,
    setTyping,
    setNotification,
    clearNotification,
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
