// stores/authStore.ts
import { create } from 'zustand';
import { apiService, User, ApiError } from '../lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isFetchingUser: boolean; // Track if we're currently fetching user
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar_url?: string }) => Promise<void>;
  
  // Utility
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  isFetchingUser: false,

  // Login
  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.login(email, password);
      set({ 
        user: response.user, 
        isAuthenticated: true, 
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error instanceof ApiError ? error.message : 'Login failed', 
        loading: false,
        isAuthenticated: false 
      });
      throw error;
    }
  },

  // Register
  register: async (email: string, name: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.register(email, name, password);
      set({ 
        user: response.user, 
        isAuthenticated: true, 
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error instanceof ApiError ? error.message : 'Registration failed', 
        loading: false,
        isAuthenticated: false 
      });
      throw error;
    }
  },

  // Logout
  logout: async () => {
    set({ loading: true, error: null });
    try {
      await apiService.logout();
    } catch (error) {
      // Continue with logout even if request fails
    } finally {
      set({ 
        user: null, 
        isAuthenticated: false, 
        loading: false 
      });
    }
  },

  // Fetch current user
  fetchCurrentUser: async () => {
    const state = get();
    
    // Prevent concurrent calls
    if (state.isFetchingUser) {
      return;
    }
    
    // If already authenticated with user data, skip
    if (state.isAuthenticated && state.user) {
      return;
    }
    
    set({ loading: true, error: null, isFetchingUser: true });
    try {
      const response = await apiService.getCurrentUser();
      set({ 
        user: response.user, 
        isAuthenticated: true, 
        loading: false,
        isFetchingUser: false
      });
    } catch (error: any) {
      // If error is 401, user is not authenticated
      if (error instanceof ApiError && error.status === 401) {
        set({ 
          user: null, 
          isAuthenticated: false, 
          loading: false,
          isFetchingUser: false
        });
      } else {
        set({ 
          error: error instanceof ApiError ? error.message : 'Failed to fetch user', 
          loading: false,
          isFetchingUser: false
        });
      }
    }
  },

  // Update profile
  updateProfile: async (data: { name?: string; avatar_url?: string }) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.updateProfile(data);
      set({ 
        user: response.user, 
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error instanceof ApiError ? error.message : 'Profile update failed', 
        loading: false 
      });
      throw error;
    }
  },

  // Utility functions
  setUser: (user: User | null) => set({ user, isAuthenticated: !!user }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));

