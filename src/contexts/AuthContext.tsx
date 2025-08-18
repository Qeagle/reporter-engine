import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction = 
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SESSION_EXPIRED' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      localStorage.setItem('token', action.payload.token);
      // Broadcast login to other tabs
      window.localStorage.setItem('auth_event', JSON.stringify({
        type: 'LOGIN',
        timestamp: Date.now(),
        user: action.payload.user,
        token: action.payload.token
      }));
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return { ...state, loading: false, error: action.payload };
    case 'LOGOUT':
    case 'SESSION_EXPIRED':
      localStorage.removeItem('token');
      // Broadcast logout to other tabs
      window.localStorage.setItem('auth_event', JSON.stringify({
        type: 'LOGOUT',
        timestamp: Date.now()
      }));
      return { user: null, token: null, loading: false, error: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('token'),
    loading: true, // Start with loading true to prevent flash
    error: null
  });

  // Listen for storage events (cross-tab communication)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_event' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          if (event.type === 'LOGOUT') {
            // Force logout in this tab
            dispatch({ type: 'SESSION_EXPIRED' });
          } else if (event.type === 'LOGIN') {
            // Sync login state across tabs
            dispatch({ 
              type: 'LOGIN_SUCCESS', 
              payload: { user: event.user, token: event.token } 
            });
          }
        } catch (error) {
          console.warn('Failed to parse auth event:', error);
        }
      }
      
      // Also listen for direct token removal
      if (e.key === 'token' && !e.newValue && state.user) {
        // Token was removed directly, force logout
        dispatch({ type: 'SESSION_EXPIRED' });
      }
    };

    // Handle immediate session expiration in current tab
    const handleSessionExpiration = () => {
      dispatch({ type: 'SESSION_EXPIRED' });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:session-expired', handleSessionExpiration);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:session-expired', handleSessionExpiration);
    };
  }, [state.user]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          dispatch({ type: 'SET_LOADING', payload: true });
          const user = await authService.getProfile();
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        } catch (error) {
          // Clear invalid token from localStorage
          console.warn('Token validation failed, clearing authentication:', error);
          localStorage.removeItem('token');
          dispatch({ type: 'LOGOUT' });
        } finally {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        // No token found, ensure loading is false
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(email, password);
      dispatch({ type: 'LOGIN_SUCCESS', payload: response });
    } catch (error: any) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
      throw error;
    }
  };

  const register = async (email: string, password: string) => {
    dispatch({ type: 'REGISTER_START' });
    try {
      // Use email as username for simplicity in development
      const response = await authService.register(email, email, password);
      dispatch({ type: 'REGISTER_SUCCESS', payload: response });
    } catch (error: any) {
      dispatch({ type: 'REGISTER_FAILURE', payload: error.message });
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const hasRole = (role: string): boolean => {
    return state.user?.role === role;
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    register,
    isAuthenticated: !!state.user,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};