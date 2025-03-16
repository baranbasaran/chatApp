import { User } from '../types/user';

const TOKEN_KEY = 'chat_auth_token';
const USER_KEY = 'chat_user';

interface AuthData {
  token: string;
  user: User;
}

// Validate user data to ensure all required fields are present
const isValidUser = (user: any): user is User => {
  return (
    user &&
    typeof user === 'object' &&
    typeof user._id === 'string' &&
    typeof user.username === 'string' &&
    typeof user.email === 'string'
  );
};

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    return isValidUser(user) ? user : null;
  } catch (error) {
    console.error('Error parsing stored user:', error);
    clearAuthData(); // Clear invalid data
    return null;
  }
};

export const setAuthData = (data: AuthData): void => {
  if (!data.token || !isValidUser(data.user)) {
    console.error('Invalid auth data provided');
    return;
  }

  try {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  } catch (error) {
    console.error('Error storing auth data:', error);
    clearAuthData(); // Clear potentially partial data
  }
};

export const clearAuthData = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = (): boolean => {
  const token = getStoredToken();
  const user = getStoredUser();
  return !!(token && user); // Only consider authenticated if both token and valid user exist
};

// Get current user with validation
export const getCurrentUser = (): User | null => {
  if (!isAuthenticated()) {
    return null;
  }
  return getStoredUser();
}; 