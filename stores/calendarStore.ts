// stores/calendarStore.ts
import { create } from 'zustand';
import { apiService, Event, Calendar, CreateEventData, UpdateEventData, CreateCalendarData, UpdateCalendarData } from '../lib/api';

interface CalendarState {
    // State
    events: Event[];
    calendars: Calendar[];
    currentUser: any | null;
    loading: boolean;
    error: string | null;
    
    // Actions
    fetchEvents: (startDate: Date, endDate: Date, calendarId?: string) => Promise<void>;
    fetchCalendars: () => Promise<void>;
    createEvent: (eventData: CreateEventData) => Promise<void>;
    updateEvent: (id: string, updates: UpdateEventData) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    duplicateEvent: (id: string) => Promise<void>;
    createCalendar: (calendarData: CreateCalendarData) => Promise<void>;
    updateCalendar: (id: string, updates: UpdateCalendarData) => Promise<void>;
    deleteCalendar: (id: string) => Promise<void>;
    
    // Optimistic updates
    optimisticUpdateEvent: (id: string, updates: Partial<Event>) => void;
    rollbackEventUpdate: (id: string, originalEvent: Event) => void;
    
    // Utility
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
    // Initial state
    events: [],
    calendars: [],
    currentUser: null,
    loading: false,
    error: null,

    // Fetch events
    fetchEvents: async (startDate: Date, endDate: Date, calendarId?: string) => {
        set({ loading: true, error: null });
        try {
            const params = {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                ...(calendarId && { calendar_id: calendarId })
            };
            const response = await apiService.getEvents(params);
            set({ events: response.events, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Fetch calendars
    fetchCalendars: async () => {
        set({ loading: true, error: null });
        try {
            const response = await apiService.getCalendars();
            set({ calendars: response.calendars, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Create event
    createEvent: async (eventData: CreateEventData) => {
        set({ loading: true, error: null });
        try {
            const response = await apiService.createEvent(eventData);
            set((state) => ({
                events: [...state.events, response.event],
                loading: false
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Update event
    updateEvent: async (id: string, updates: UpdateEventData) => {
        const originalEvent = get().events.find(e => e.id === id);
        if (!originalEvent) return;

        // Optimistic update
        get().optimisticUpdateEvent(id, updates as Partial<Event>);
        
        try {
            const response = await apiService.updateEvent(id, updates);
            set((state) => ({
                events: state.events.map(e => e.id === id ? response.event : e),
                loading: false
            }));
        } catch (error: any) {
            // Rollback on error
            get().rollbackEventUpdate(id, originalEvent);
            set({ error: error.message, loading: false });
        }
    },

    // Delete event
    deleteEvent: async (id: string) => {
        set({ loading: true, error: null });
        try {
            await apiService.deleteEvent(id);
            set((state) => ({
                events: state.events.filter(e => e.id !== id),
                loading: false
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Duplicate event
    duplicateEvent: async (id: string) => {
        set({ loading: true, error: null });
        try {
            const response = await apiService.duplicateEvent(id);
            set((state) => ({
                events: [...state.events, response.event],
                loading: false
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Create calendar
    createCalendar: async (calendarData: CreateCalendarData) => {
        set({ loading: true, error: null });
        try {
            const response = await apiService.createCalendar(calendarData);
            set((state) => ({
                calendars: [...state.calendars, response.calendar],
                loading: false
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Update calendar
    updateCalendar: async (id: string, updates: UpdateCalendarData) => {
        set({ loading: true, error: null });
        try {
            const response = await apiService.updateCalendar(id, updates);
            set((state) => ({
                calendars: state.calendars.map(c => c.id === id ? response.calendar : c),
                loading: false
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Delete calendar
    deleteCalendar: async (id: string) => {
        set({ loading: true, error: null });
        try {
            await apiService.deleteCalendar(id);
            set((state) => ({
                calendars: state.calendars.filter(c => c.id !== id),
                events: state.events.filter(e => e.calendar_id !== id),
                loading: false
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    // Optimistic update event
    optimisticUpdateEvent: (id: string, updates: Partial<Event>) => {
        set((state) => ({
            events: state.events.map(e => e.id === id ? { ...e, ...updates } : e)
        }));
    },

    // Rollback event update
    rollbackEventUpdate: (id: string, originalEvent: Event) => {
        set((state) => ({
            events: state.events.map(e => e.id === id ? originalEvent : e)
        }));
    },

    // Utility functions
    setLoading: (loading: boolean) => set({ loading }),
    setError: (error: string | null) => set({ error }),
    clearError: () => set({ error: null }),
}));