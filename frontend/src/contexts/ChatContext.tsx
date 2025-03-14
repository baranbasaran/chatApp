import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from './AuthContext';
import { Chat, Message } from '../types/chat';

interface ChatContextType {
  chats: Chat[];
  selectedChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  selectChat: (chat: Chat) => void;
  sendMessage: (content: string) => Promise<void>;
  createChat: (participantId: string) => Promise<void>;
  fetchChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchChats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/chats');
      
      // Ensure response.chats exists and is an array
      if (!response || !response.chats) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }

      // Ensure each chat has required properties
      const validChats = (response.chats as any[]).filter(chat => 
        chat && 
        typeof chat === 'object' && 
        '_id' in chat && 
        'participants' in chat &&
        Array.isArray(chat.participants)
      );

      setChats(validChats);
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chats');
      setChats([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (chatId: string) => {
    if (!chatId) {
      console.error('No chat ID provided');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/chats/${chatId}/messages`);
      
      // Ensure response.messages exists and is an array
      if (!response || !response.messages) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }

      // Ensure each message has required properties
      const validMessages = (response.messages as any[]).filter(message => 
        message && 
        typeof message === 'object' && 
        '_id' in message && 
        'content' in message &&
        'sender' in message
      );

      setMessages(validMessages);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
      setMessages([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const selectChat = (chat: Chat | null) => {
    if (!chat || !chat._id) {
      console.error('Invalid chat selected:', chat);
      return;
    }

    setSelectedChat(chat);
    fetchMessages(chat._id);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) {
      setError('Message cannot be empty');
      return;
    }

    if (!selectedChat?._id) {
      setError('No chat selected');
      return;
    }
    
    try {
      setError(null);
      const response = await api.post(`/chats/${selectedChat._id}/messages`, { content });
      
      if (!response || !response.message) {
        throw new Error('Invalid response format from server');
      }

      // Update messages
      setMessages(prev => [...prev, response.message]);
      
      // Update chat's last message in the chats list
      setChats(prev => prev.map(chat => 
        chat._id === selectedChat._id 
          ? { ...chat, lastMessage: response.message }
          : chat
      ));
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      throw err;
    }
  };

  const createChat = async (participantId: string) => {
    if (!participantId) {
      setError('Participant ID is required');
      return;
    }

    try {
      setError(null);
      const response = await api.post('/chats', {
        participants: [participantId],
        isGroup: false
      });

      if (!response || !response.chat) {
        throw new Error('Invalid response format from server');
      }

      setChats(prev => [...prev, response.chat]);
      selectChat(response.chat);
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat');
      throw err;
    }
  };

  useEffect(() => {
    if (user) {
      fetchChats();
    } else {
      // Clear state when user logs out
      setChats([]);
      setSelectedChat(null);
      setMessages([]);
    }
  }, [user]);

  const value = {
    chats,
    selectedChat,
    messages,
    isLoading,
    error,
    selectChat,
    sendMessage,
    createChat,
    fetchChats,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 