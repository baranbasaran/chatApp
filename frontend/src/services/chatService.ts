import { Chat, Message } from '../types/chat';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const chatService = {
  async getChats(): Promise<Chat[]> {
    const response = await fetch(`${API_URL}/chats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('chat_auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }

    return response.json();
  },

  async createChat(userId: string): Promise<Chat> {
    const response = await fetch(`${API_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('chat_auth_token')}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create chat');
    }

    return response.json();
  },

  async getMessages(chatId: string, page = 1, limit = 50): Promise<Message[]> {
    const response = await fetch(
      `${API_URL}/chats/${chatId}/messages?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('chat_auth_token')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return response.json();
  },

  async sendMessage(chatId: string, content: string): Promise<Message> {
    const response = await fetch(`${API_URL}/chats/${chatId}/messages`, {
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

    return response.json();
  },

  async markMessagesAsRead(chatId: string): Promise<void> {
    const response = await fetch(`${API_URL}/chats/${chatId}/read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('chat_auth_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark messages as read');
    }
  },
}; 