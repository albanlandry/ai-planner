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
        if (!originalEvent) {
            throw new Error('Event not found');
        }

        // Optimistic update
        get().optimisticUpdateEvent(id, updates as Partial<Event>);
        
        try {
            const response = await apiService.updateEvent(id, updates);
            set((state) => ({
                events: state.events.map(e => e.id === id ? response.event : e),
                loading: false
            }));
            return response.event;
        } catch (error: any) {
            // Rollback on error
            get().rollbackEventUpdate(id, originalEvent);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
            set({ error: errorMessage, loading: false });
            throw error; // Re-throw so caller can handle it
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
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
            set({ error: errorMessage, loading: false });
            throw error; // Re-throw so caller can handle it
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
            
            // Refresh calendars to get updated primary calendar status
            const calendarsResponse = await apiService.getCalendars();
            set({
                calendars: calendarsResponse.calendars,
                loading: false
            });
            
            return response.calendar;
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create calendar';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Update calendar
    updateCalendar: async (id: string, updates: UpdateCalendarData) => {
        set({ loading: true, error: null });
        try {
            const response = await apiService.updateCalendar(id, updates);
            
            // Refresh calendars to get updated primary calendar status
            const calendarsResponse = await apiService.getCalendars();
            set({
                calendars: calendarsResponse.calendars,
                loading: false
            });
            
            return response.calendar;
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update calendar';
            set({ error: errorMessage, loading: false });
            throw error;
        }
    },

    // Delete calendar
    deleteCalendar: async (id: string) => {
        set({ loading: true, error: null });
        try {
            await apiService.deleteCalendar(id);
            // Remove calendar and associated events from state
            set((state) => ({
                calendars: state.calendars.filter(c => c.id !== id),
                events: state.events.filter(e => e.calendar_id !== id),
                loading: false
            }));
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete calendar';
            set({ error: errorMessage, loading: false });
            throw error;
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