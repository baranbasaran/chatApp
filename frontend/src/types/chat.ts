import { User } from './user';

export interface Message {
  _id: string;
  chatId: string;
  sender: User;
  senderId: string;
  content: string;
  status?: 'sent' | 'delivered' | 'read';
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chat {
  _id: string;
  name?: string;
  isGroup: boolean;
  participants: User[];
  lastMessage?: Message;
  isTyping?: boolean;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatState {
  activeChat: Chat | null;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
}

export type ChatAction =
  | { type: 'SET_ACTIVE_CHAT'; payload: Chat }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: Chat }
  | { type: 'SET_MESSAGES'; payload: { chatId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'SET_TYPING'; payload: { chatId: string; isTyping: boolean } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'CLEAR_ERROR' }; 