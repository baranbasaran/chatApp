import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '../types/user';
import { api } from '../utils/api';
import { getStoredToken, getStoredUser, setAuthData, clearAuthData } from '../utils/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password }, { requiresAuth: false });
      const { user: userData, token } = response;
      
      setAuthData(token, userData);
      setUser(userData);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Clear auth data
      clearAuthData();
      setUser(null);

      // Redirect to login
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.user);
      return response.user;
    } catch (error) {
      console.error('Error refreshing user:', error);
      if ((error as any).status === 401) {
        await logout();
      }
      throw error;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getStoredToken();
        if (token) {
          await refreshUser();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 