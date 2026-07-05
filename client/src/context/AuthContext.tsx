import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Stats {
  totalTests: number;
  avgOverall: number;
  avgGrammar: number;
  avgVocabulary: number;
  avgFluency: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  stats: Stats | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('speakiq_token'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setUser(response.data.user);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem('speakiq_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      await fetchProfile(); // fetch complete stats
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('speakiq_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
      await fetchProfile();
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('speakiq_token');
    setToken(null);
    setUser(null);
    setStats(null);
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchProfile();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        stats,
        loading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
