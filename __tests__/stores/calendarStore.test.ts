import { renderHook, act } from '@testing-library/react';
import { useCalendarStore } from '../../stores/calendarStore';
import { apiService } from '../../lib/api';

// Mock the API service
jest.mock('../../lib/api', () => ({
  apiService: {
    getEvents: jest.fn(),
    getCalendars: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    duplicateEvent: jest.fn(),
    createCalendar: jest.fn(),
    updateCalendar: jest.fn(),
    deleteCalendar: jest.fn(),
  },
}));

describe('Calendar Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useCalendarStore.setState({
      events: [],
      calendars: [],
      currentUser: null,
      loading: false,
      error: null,
    });
  });

  describe('fetchEvents', () => {
    it('should fetch events successfully', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          calendar_id: '1',
        },
      ];

      (apiService.getEvents as jest.Mock).mockResolvedValue({
        events: mockEvents,
      });

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.fetchEvents(
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );
      });

      expect(result.current.events).toEqual(mockEvents);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch events error', async () => {
      (apiService.getEvents as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.fetchEvents(
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('fetchCalendars', () => {
    it('should fetch calendars successfully', async () => {
      const mockCalendars = [
        {
          id: '1',
          name: 'Test Calendar',
          color: '#FF0000',
          is_primary: true,
        },
      ];

      (apiService.getCalendars as jest.Mock).mockResolvedValue({
        calendars: mockCalendars,
      });

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.fetchCalendars();
      });

      expect(result.current.calendars).toEqual(mockCalendars);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('createEvent', () => {
    it('should create event successfully', async () => {
      const eventData = {
        calendar_id: '1',
        title: 'New Event',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
      };

      const mockEvent = {
        id: '2',
        ...eventData,
      };

      (apiService.createEvent as jest.Mock).mockResolvedValue({
        event: mockEvent,
      });

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.createEvent(eventData);
      });

      expect(result.current.events).toContain(mockEvent);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('updateEvent', () => {
    it('should update event with optimistic updates', async () => {
      const existingEvent = {
        id: '1',
        title: 'Original Title',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        calendar_id: '1',
      };

      const updateData = {
        title: 'Updated Title',
      };

      const updatedEvent = {
        ...existingEvent,
        ...updateData,
      };

      // Set initial state
      useCalendarStore.setState({
        events: [existingEvent],
      });

      (apiService.updateEvent as jest.Mock).mockResolvedValue({
        event: updatedEvent,
      });

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.updateEvent('1', updateData);
      });

      expect(result.current.events[0].title).toBe('Updated Title');
      expect(result.current.loading).toBe(false);
    });

    it('should rollback on update error', async () => {
      const existingEvent = {
        id: '1',
        title: 'Original Title',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        calendar_id: '1',
      };

      const updateData = {
        title: 'Updated Title',
      };

      // Set initial state
      useCalendarStore.setState({
        events: [existingEvent],
      });

      (apiService.updateEvent as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.updateEvent('1', updateData);
      });

      // Should rollback to original event
      expect(result.current.events[0].title).toBe('Original Title');
      expect(result.current.error).toBe('Update failed');
    });
  });

  describe('deleteEvent', () => {
    it('should delete event successfully', async () => {
      const existingEvent = {
        id: '1',
        title: 'Event to Delete',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        calendar_id: '1',
      };

      // Set initial state
      useCalendarStore.setState({
        events: [existingEvent],
      });

      (apiService.deleteEvent as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.deleteEvent('1');
      });

      expect(result.current.events).toHaveLength(0);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('duplicateEvent', () => {
    it('should duplicate event successfully', async () => {
      const existingEvent = {
        id: '1',
        title: 'Original Event',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        calendar_id: '1',
      };

      const duplicatedEvent = {
        id: '2',
        title: 'Original Event (Copy)',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        calendar_id: '1',
      };

      // Set initial state
      useCalendarStore.setState({
        events: [existingEvent],
      });

      (apiService.duplicateEvent as jest.Mock).mockResolvedValue({
        event: duplicatedEvent,
      });

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.duplicateEvent('1');
      });

      expect(result.current.events).toHaveLength(2);
      expect(result.current.events[1].title).toBe('Original Event (Copy)');
    });
  });

  describe('createCalendar', () => {
    it('should create calendar successfully', async () => {
      const calendarData = {
        name: 'New Calendar',
        color: '#00FF00',
        is_primary: false,
      };

      const mockCalendar = {
        id: '2',
        ...calendarData,
        user_id: '1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (apiService.createCalendar as jest.Mock).mockResolvedValue({
        calendar: mockCalendar,
      });

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.createCalendar(calendarData);
      });

      expect(result.current.calendars).toContain(mockCalendar);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('updateCalendar', () => {
    it('should update calendar successfully', async () => {
      const existingCalendar = {
        id: '1',
        name: 'Original Calendar',
        color: '#FF0000',
        is_primary: true,
        user_id: '1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const updateData = {
        name: 'Updated Calendar',
        color: '#00FF00',
      };

      const updatedCalendar = {
        ...existingCalendar,
        ...updateData,
      };

      // Set initial state
      useCalendarStore.setState({
        calendars: [existingCalendar],
      });

      (apiService.updateCalendar as jest.Mock).mockResolvedValue({
        calendar: updatedCalendar,
      });

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.updateCalendar('1', updateData);
      });

      expect(result.current.calendars[0].name).toBe('Updated Calendar');
      expect(result.current.calendars[0].color).toBe('#00FF00');
    });
  });

  describe('deleteCalendar', () => {
    it('should delete calendar and related events', async () => {
      const existingCalendar = {
        id: '1',
        name: 'Calendar to Delete',
        color: '#FF0000',
        is_primary: true,
        user_id: '1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const relatedEvent = {
        id: '1',
        title: 'Event in Calendar',
        calendar_id: '1',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
      };

      // Set initial state
      useCalendarStore.setState({
        calendars: [existingCalendar],
        events: [relatedEvent],
      });

      (apiService.deleteCalendar as jest.Mock).mockResolvedValue({});

      const { result } = renderHook(() => useCalendarStore());

      await act(async () => {
        await result.current.deleteCalendar('1');
      });

      expect(result.current.calendars).toHaveLength(0);
      expect(result.current.events).toHaveLength(0);
    });
  });

  describe('utility functions', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useCalendarStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set and clear error', () => {
      const { result } = renderHook(() => useCalendarStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
