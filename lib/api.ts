// API service for communicating with the backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;
  private refreshTokenValue: string | null = null;
  private isRefreshing: boolean = false;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
      this.refreshTokenValue = localStorage.getItem('refreshToken');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  setRefreshToken(token: string | null) {
    this.refreshTokenValue = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('refreshToken', token);
      } else {
        localStorage.removeItem('refreshToken');
      }
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (!this.refreshTokenValue || this.isRefreshing) {
      return null;
    }

    try {
      this.isRefreshing = true;
      const response = await this.request<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
      });

      this.setToken(response.accessToken);
      this.setRefreshToken(response.refreshToken);
      return response.accessToken;
    } catch (error) {
      this.setToken(null);
      this.setRefreshToken(null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        // Try to parse error response
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status} ${response.statusText}` };
        }
        
        // If 401 and we have a refresh token, try to refresh
        if (response.status === 401 && retry && this.refreshTokenValue && endpoint !== '/auth/refresh') {
          const newToken = await this.refreshAccessToken();
          if (newToken) {
            // Retry the request with the new token
            return this.request<T>(endpoint, options, false);
          }
        }
        throw new ApiError(response.status, errorData.error || 'An error occurred');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Handle CORS and network errors more specifically
      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
          throw new ApiError(0, 'CORS error: Unable to connect to server. Please check that the backend is running and CORS is configured correctly.');
        }
        throw new ApiError(0, `Network error: ${error.message}`);
      }
      
      throw new ApiError(0, 'Network error');
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(response.accessToken);
    this.setRefreshToken(response.refreshToken);
    return response;
  }

  async register(email: string, name: string, password: string) {
    const response = await this.request<{
      user: User;
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    });
    
    this.setToken(response.accessToken);
    this.setRefreshToken(response.refreshToken);
    return response;
  }

  async logout() {
    try {
    await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Continue with logout even if request fails
    }
    this.setToken(null);
    this.setRefreshToken(null);
  }

  async getCurrentUser() {
    return this.request<{ user: User }>('/auth/me');
  }

  async updateProfile(data: { name?: string; avatar_url?: string }) {
    return this.request<{ message: string; user: User }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async refreshToken() {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshTokenValue }),
    });
  }

  // Calendar endpoints
  async getCalendars() {
    return this.request<{ calendars: Calendar[] }>('/calendars');
  }

  async getCalendar(id: string) {
    return this.request<{ calendar: Calendar }>(`/calendars/${id}`);
  }

  async createCalendar(data: CreateCalendarData) {
    return this.request<{ calendar: Calendar }>('/calendars', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCalendar(id: string, data: UpdateCalendarData) {
    return this.request<{ calendar: Calendar }>(`/calendars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCalendar(id: string) {
    return this.request(`/calendars/${id}`, { method: 'DELETE' });
  }

  // Event endpoints
  async getEvents(params: {
    start_date: string;
    end_date: string;
    calendar_id?: string;
  }) {
    const searchParams = new URLSearchParams(params);
    return this.request<{ events: Event[] }>(`/events?${searchParams}`);
  }

  async getEvent(id: string) {
    return this.request<{ event: Event }>(`/events/${id}`);
  }

  async createEvent(data: CreateEventData) {
    return this.request<{ event: Event }>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: UpdateEventData) {
    return this.request<{ event: Event }>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request(`/events/${id}`, { method: 'DELETE' });
  }

  async duplicateEvent(id: string) {
    return this.request<{ event: Event }>(`/events/${id}/duplicate`, {
      method: 'POST',
    });
  }

  // Task endpoints
  async getTasks(params?: { status?: string; priority?: string; calendar_id?: string }) {
    const searchParams = params ? new URLSearchParams(params).toString() : '';
    return this.request<{ tasks: Task[] }>(`/tasks${searchParams ? `?${searchParams}` : ''}`);
  }

  async getTask(id: string) {
    return this.request<{ task: Task }>(`/tasks/${id}`);
  }

  async createTask(data: CreateTaskData) {
    return this.request<{ task: Task }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: UpdateTaskData) {
    return this.request<{ task: Task }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  // AI endpoints
  async aiHealth() {
    return this.request<{ enabled: boolean; model: string; max_tokens: number; message: string }>(`/ai/health`);
  }

  async aiChat(body: { message: string; conversation_id?: string; model?: string; temperature?: number; max_tokens?: number }) {
    return this.request<{ message: string; conversation_id: string; intent?: string; action?: any; token_usage?: any; execution_time_ms?: number }>(
      `/ai/chat`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );
  }
}

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  color: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  calendar_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  location?: string;
  attendees?: Attendee[];
  recurrence_rule?: RecurrenceRule;
  calendar_name?: string;
  calendar_color?: string;
  created_at: string;
  updated_at: string;
}

export interface Attendee {
  email: string;
  name: string;
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: string;
  count?: number;
}

export interface CreateCalendarData {
  name: string;
  color?: string;
  is_primary?: boolean;
}

export interface UpdateCalendarData {
  name?: string;
  color?: string;
  is_primary?: boolean;
}

export interface CreateEventData {
  calendar_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  location?: string;
  attendees?: Attendee[];
  recurrence_rule?: RecurrenceRule;
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  location?: string;
  attendees?: Attendee[];
  recurrence_rule?: RecurrenceRule;
  calendar_id?: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  completed_at?: string;
  calendar_id?: string;
  organization_id?: string;
  team_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  calendar_id?: string;
  organization_id?: string;
  team_id?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  calendar_id?: string;
  organization_id?: string;
  team_id?: string;
}

// Create singleton instance
export const apiService = new ApiService(API_BASE_URL);
export { ApiError };