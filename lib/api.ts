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

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
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
      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, data.error || 'An error occurred');
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
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
    return response;
  }

  async logout() {
    await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async getCurrentUser() {
    return this.request<{ user: User }>('/auth/me');
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

// Create singleton instance
export const apiService = new ApiService(API_BASE_URL);
export { ApiError };