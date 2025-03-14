import { User, UserSearchParams, UserSearchResponse } from '../types/user';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const userService = {
  async searchUsers(params: UserSearchParams): Promise<UserSearchResponse> {
    const token = localStorage.getItem('chat_auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Token from localStorage:', token); // Debug log

    const queryParams = new URLSearchParams({
      q: params.query,
      ...(params.page && { page: params.page.toString() }),
      ...(params.limit && { limit: params.limit.toString() }),
    });

    try {
      const response = await fetch(`${API_URL}/users/search?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to search users');
      }

      return response.json();
    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  },

  async getUserProfile(userId: string): Promise<User> {
    const token = localStorage.getItem('chat_auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch user profile');
    }

    return response.json();
  },

  async updateUserStatus(status: User['status']): Promise<User> {
    const token = localStorage.getItem('chat_auth_token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/users/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update user status');
    }

    return response.json();
  },
}; 