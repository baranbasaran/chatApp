import { createContext, useContext, useReducer, useCallback, ReactNode, useEffect } from 'react';
import { AuthState, User, LoginCredentials, RegisterCredentials, AuthResponse } from '../types/auth';
import { getStoredToken, getStoredUser, setAuthData, clearAuthData } from '../utils/auth';

// Initial state
const initialState: AuthState = {
  user: getStoredUser(),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        error: null,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<{
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
} | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Add initialization effect
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getStoredToken();
      const user = getStoredUser();

      if (!token || !user) {
        dispatch({ type: 'AUTH_FAILURE', payload: 'No valid session found' });
        clearAuthData();
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Token validation failed');
        }

        const { user: freshUser } = await response.json();
        setAuthData({ token, user: freshUser });
        dispatch({ type: 'AUTH_SUCCESS', payload: { token, user: freshUser } });
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthData();
        dispatch({ type: 'AUTH_FAILURE', payload: 'Session expired' });
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data: AuthResponse = await response.json();
      setAuthData({ token: data.token, user: data.user });
      dispatch({ type: 'AUTH_SUCCESS', payload: { token: data.token, user: data.user } });
    } catch (error) {
      clearAuthData();
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : 'Login failed' });
      throw error;
    }
  }, []);

  const register = useCallback(async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Registration failed');
      }

      const data: AuthResponse = await response.json();
      setAuthData({ token: data.token, user: data.user });
      dispatch({ type: 'AUTH_SUCCESS', payload: { token: data.token, user: data.user } });
    } catch (error) {
      clearAuthData();
      dispatch({ type: 'AUTH_FAILURE', payload: error instanceof Error ? error.message : 'Registration failed' });
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthData();
    dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 