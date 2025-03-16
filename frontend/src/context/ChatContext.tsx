import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect, useRef } from 'react';
import { ChatState, ChatAction, Chat, Message } from '../types/chat';
import { WebSocketService } from '../services/chat/websocket';
import { getStoredToken } from '../utils/auth';

// Initialize WebSocket service
const wsService = new WebSocketService();

const initialState: ChatState = {
  activeChat: null,
  chats: [],
  messages: {},
  isLoading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  console.log('Reducer called with action:', action);
  console.log('Current state:', state);
  
  switch (action.type) {
    case 'SET_ACTIVE_CHAT':
      return {
        ...state,
        activeChat: action.payload,
      };
    case 'SET_CHATS':
      return {
        ...state,
        chats: action.payload,
      };
    case 'ADD_CHAT':
      return {
        ...state,
        chats: [action.payload, ...state.chats],
      };
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload._id ? action.payload : chat
        ),
        activeChat:
          state.activeChat?._id === action.payload._id
            ? action.payload
            : state.activeChat,
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages,
        },
      };
    case 'ADD_MESSAGE':
      const updatedMessages = {
        ...state.messages,
        [action.payload.chatId]: [
          ...(state.messages[action.payload.chatId] || []),
          action.payload.message,
        ],
      };
      console.log('Updated messages state:', updatedMessages);
      return {
        ...state,
        messages: updatedMessages,
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: state.messages[action.payload.chatId].map(
            message =>
              message._id === action.payload.message._id
                ? action.payload.message
                : message
          ),
        },
      };
    case 'SET_TYPING':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload.chatId
            ? { ...chat, isTyping: action.payload.isTyping }
            : chat
        ),
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  setActiveChat: (chat: Chat) => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  loadChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const prevStateRef = useRef(state);

  // Debug state changes
  useEffect(() => {
    const stateKeys = ['activeChat', 'chats', 'messages', 'isLoading', 'error'] as const;
    const changes = stateKeys.filter(key => state[key] !== prevStateRef.current[key]);
    
    if (changes.length > 0) {
      console.log('[ChatContext] State changed:', changes);
      console.log('[ChatContext] Previous state:', prevStateRef.current);
      console.log('[ChatContext] New state:', state);
    }
    prevStateRef.current = state;
  }, [state]);

  // Initialize WebSocket connection and join user room
  useEffect(() => {
    console.log('[ChatContext] WebSocket effect running');
    
    const token = getStoredToken();
    const user = JSON.parse(localStorage.getItem('chat_user') || '{}');
    
    if (token && user._id) {
      console.log('[ChatContext] Initializing WebSocket connection');
      const socket = wsService.connect(token);

      // Join user's room
      wsService.send('join', user._id);
      console.log('[ChatContext] Joining user room:', user._id);

      // Set up WebSocket event listeners
      wsService.on('messageReceived', (payload) => {
        console.log('[ChatContext] Received new message via WebSocket:', payload);
        const { chatId, message } = payload;
        
        // Add message if we have the chat loaded OR if it's the active chat
        if (state.messages[chatId] !== undefined || state.activeChat?._id === chatId) {
          console.log('[ChatContext] Adding message to state for chat:', chatId);
          dispatch({
            type: 'ADD_MESSAGE',
            payload: { chatId, message },
          });

          // Update chat's last message
          const chat = state.chats.find(c => c._id === chatId);
          if (chat) {
            console.log('[ChatContext] Updating chat with new last message');
            dispatch({
              type: 'UPDATE_CHAT',
              payload: {
                ...chat,
                lastMessage: message
              }
            });
          }
        } else {
          console.log('[ChatContext] Loading messages for chat:', chatId);
          // Load messages for this chat since we don't have them
          loadMessages(chatId);
        }
      });

      return () => {
        console.log('[ChatContext] Cleanup: Disconnecting WebSocket');
        wsService.disconnect();
      };
    }
  }, []); // Empty dependency array to run only once

  // Join chat room when active chat changes
  useEffect(() => {
    if (state.activeChat?._id) {
      console.log('[ChatContext] Joining chat room:', state.activeChat._id);
      wsService.send('joinChat', state.activeChat._id);
      
      // Only load messages if they haven't been loaded yet
      if (!state.messages[state.activeChat._id]?.length) {
        console.log('[ChatContext] Loading messages for newly active chat');
        loadMessages(state.activeChat._id);
      } else {
        console.log('[ChatContext] Messages already loaded for chat:', state.activeChat._id);
      }
    }
  }, [state.activeChat?._id]);

  const setActiveChat = useCallback((chat: Chat) => {
    dispatch({ type: 'SET_ACTIVE_CHAT', payload: chat });
  }, []);

  const loadChats = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const token = localStorage.getItem('chat_auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch('http://localhost:3000/api/chats', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        }
        throw new Error('Failed to load chats');
      }

      const data = await response.json();
      console.log('Received chats:', data); // Debug log
      
      // Extract chats array from response
      const chats = data.chats || [];
      console.log('Processed chats:', chats); // Debug log
      
      dispatch({ type: 'SET_CHATS', payload: chats });
    } catch (error) {
      console.error('Error loading chats:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load chats',
      });
      // Initialize with empty array on error
      dispatch({ type: 'SET_CHATS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadMessages = useCallback(async (chatId: string) => {
    // Prevent duplicate loading
    if (state.messages[chatId]?.length) {
      console.log('[ChatContext] Skipping message load - already loaded');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/chats/${chatId}/messages`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('chat_auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      console.log('Received messages:', data);
      
      // Extract messages array from response
      const messages = data.messages || [];
      console.log('Processed messages:', messages);
      
      dispatch({
        type: 'SET_MESSAGES',
        payload: { chatId, messages },
      });
    } catch (error) {
      console.error('Error loading messages:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load messages',
      });
    }
  }, [state.messages]); // Add state.messages as dependency to access latest state

  const sendMessage = useCallback(async (chatId: string, content: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      const message = data.message || data;

      // Send message through WebSocket
      wsService.send('newMessage', { chatId, message });

      // Only dispatch if the message isn't already in the state
      if (!state.messages[chatId]?.find(m => m._id === message._id)) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: { chatId, message },
        });

        dispatch({
          type: 'UPDATE_CHAT',
          payload: {
            ...state.chats.find(chat => chat._id === chatId)!,
            lastMessage: message
          }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }, [state.messages, state.chats]);

  return (
    <ChatContext.Provider
      value={{
        state,
        setActiveChat,
        sendMessage,
        loadMessages,
        loadChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 