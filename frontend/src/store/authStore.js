import { create } from 'zustand';
import api from '../services/api';
import socketService from '../services/socket';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/auth/me');
        const { user } = res.data;
        set({ user, token, isAuthenticated: true, isInitialized: true });
        socketService.connect(token);
      } catch (err) {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, isInitialized: true });
      }
    } else {
      set({ isInitialized: true });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/login', credentials);
      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ user, token, isAuthenticated: true, isLoading: false });
      socketService.connect(token);
      
      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  loginWithOTP: async (phone, otp) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/verify-otp', { phone, otp });
      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ user, token, isAuthenticated: true, isLoading: false });
      socketService.connect(token);
      
      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || 'OTP verification failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/register', userData);
      const { token, user } = res.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ user, token, isAuthenticated: true, isLoading: false });
      socketService.connect(token);
      
      return { success: true, user };
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    socketService.disconnect();
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  updateUser: (updates) => {
    set(state => ({ user: { ...state.user, ...updates } }));
  },

  clearError: () => set({ error: null })
}));
