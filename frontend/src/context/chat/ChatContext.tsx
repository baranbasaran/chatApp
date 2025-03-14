import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { ChatState, ChatAction, Chat, Message } from '../../types/chat';

const initialState: ChatState = {
  activeChat: null,
  chats: [],
  messages: {},
  isLoading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
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
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: [
            ...(state.messages[action.payload.chatId] || []),
            action.payload.message,
          ],
        },
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
      console.log('Received messages:', data); // Debug log
      
      // Extract messages array from response
      const messages = data.messages || [];
      console.log('Processed messages:', messages); // Debug log
      
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
  }, []);

  const sendMessage = useCallback(async (chatId: string, content: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('chat_auth_token')}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      console.log('Received message response:', data); // Debug log
      
      // Extract message from response
      const message = data.message || data;
      console.log('Processed message:', message); // Debug log

      dispatch({
        type: 'ADD_MESSAGE',
        payload: { chatId, message },
      });

      // Also update the chat's last message
      dispatch({
        type: 'UPDATE_CHAT',
        payload: {
          ...state.chats.find(chat => chat._id === chatId)!,
          lastMessage: message
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }, [state.chats]);

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

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
} 