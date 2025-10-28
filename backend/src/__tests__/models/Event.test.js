const Event = require('../../models/Event');
const { pool } = require('../../config/database');

// Mock the database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Event Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new event', async () => {
      const eventData = {
        calendar_id: '456',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        is_all_day: false,
        location: 'Test Location',
        attendees: [{ email: 'test@example.com', name: 'Test User' }],
        recurrence_rule: { frequency: 'weekly', interval: 1 }
      };

      const mockResult = {
        rows: [{
          id: '789',
          calendar_id: '456',
          title: 'Test Event',
          description: 'Test Description',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          is_all_day: false,
          location: 'Test Location',
          attendees: JSON.stringify(eventData.attendees),
          recurrence_rule: JSON.stringify(eventData.recurrence_rule),
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const event = await Event.create(eventData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO events'),
        expect.arrayContaining([
          '456',
          'Test Event',
          'Test Description',
          '2024-01-01T10:00:00Z',
          '2024-01-01T11:00:00Z',
          false,
          'Test Location',
          JSON.stringify(eventData.attendees),
          JSON.stringify(eventData.recurrence_rule)
        ])
      );
      expect(event).toBeInstanceOf(Event);
      expect(event.title).toBe('Test Event');
    });

    it('should create event with default values', async () => {
      const eventData = {
        calendar_id: '456',
        title: 'Test Event',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z'
      };

      const mockResult = {
        rows: [{
          id: '789',
          calendar_id: '456',
          title: 'Test Event',
          description: null,
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          is_all_day: false,
          location: null,
          attendees: null,
          recurrence_rule: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const event = await Event.create(eventData);

      expect(event.is_all_day).toBe(false);
      expect(event.description).toBeNull();
    });
  });

  describe('findByCalendarId', () => {
    it('should find events by calendar id within date range', async () => {
      const mockResult = {
        rows: [
          {
            id: '789',
            calendar_id: '456',
            title: 'Event 1',
            description: 'Description 1',
            start_time: '2024-01-01T10:00:00Z',
            end_time: '2024-01-01T11:00:00Z',
            is_all_day: false,
            location: null,
            attendees: null,
            recurrence_rule: null,
            calendar_name: 'Test Calendar',
            calendar_color: '#FF0000',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      pool.query.mockResolvedValue(mockResult);

      const events = await Event.findByCalendarId(
        '456',
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['456', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z']
      );
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(Event);
      expect(events[0].title).toBe('Event 1');
    });
  });

  describe('findByUserId', () => {
    it('should find events by user id within date range', async () => {
      const mockResult = {
        rows: [
          {
            id: '789',
            calendar_id: '456',
            title: 'Event 1',
            description: 'Description 1',
            start_time: '2024-01-01T10:00:00Z',
            end_time: '2024-01-01T11:00:00Z',
            is_all_day: false,
            location: null,
            attendees: null,
            recurrence_rule: null,
            calendar_name: 'Test Calendar',
            calendar_color: '#FF0000',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      pool.query.mockResolvedValue(mockResult);

      const events = await Event.findByUserId(
        '123',
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z']
      );
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(Event);
    });
  });

  describe('findById', () => {
    it('should find event by id', async () => {
      const mockResult = {
        rows: [{
          id: '789',
          calendar_id: '456',
          title: 'Test Event',
          description: 'Test Description',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          is_all_day: false,
          location: null,
          attendees: null,
          recurrence_rule: null,
          calendar_name: 'Test Calendar',
          calendar_color: '#FF0000',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const event = await Event.findById('789');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['789']
      );
      expect(event).toBeInstanceOf(Event);
      expect(event.id).toBe('789');
    });

    it('should return null if event not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const event = await Event.findById('nonexistent');

      expect(event).toBeNull();
    });
  });

  describe('update', () => {
    it('should update event', async () => {
      const event = new Event({
        id: '789',
        calendar_id: '456',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        is_all_day: false
      });

      const updateData = {
        title: 'Updated Event',
        description: 'Updated Description',
        start_time: '2024-01-01T14:00:00Z',
        end_time: '2024-01-01T15:00:00Z'
      };

      const mockResult = {
        rows: [{
          id: '789',
          calendar_id: '456',
          title: 'Updated Event',
          description: 'Updated Description',
          start_time: '2024-01-01T14:00:00Z',
          end_time: '2024-01-01T15:00:00Z',
          is_all_day: false,
          location: null,
          attendees: null,
          recurrence_rule: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const updatedEvent = await event.update(updateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE events'),
        expect.arrayContaining([
          'Updated Event',
          'Updated Description',
          '2024-01-01T14:00:00Z',
          '2024-01-01T15:00:00Z',
          '789'
        ])
      );
      expect(updatedEvent).toBeInstanceOf(Event);
      expect(updatedEvent.title).toBe('Updated Event');
    });
  });

  describe('delete', () => {
    it('should delete event', async () => {
      const event = new Event({
        id: '789',
        calendar_id: '456',
        title: 'Test Event'
      });

      pool.query.mockResolvedValue({});

      const result = await event.delete();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM events'),
        ['789']
      );
      expect(result).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return event data as JSON', () => {
      const event = new Event({
        id: '789',
        calendar_id: '456',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        is_all_day: false,
        location: 'Test Location',
        attendees: [{ email: 'test@example.com', name: 'Test User' }],
        recurrence_rule: { frequency: 'weekly', interval: 1 },
        calendar_name: 'Test Calendar',
        calendar_color: '#FF0000',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      const json = event.toJSON();

      expect(json).toEqual({
        id: '789',
        calendar_id: '456',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        is_all_day: false,
        location: 'Test Location',
        attendees: [{ email: 'test@example.com', name: 'Test User' }],
        recurrence_rule: { frequency: 'weekly', interval: 1 },
        calendar_name: 'Test Calendar',
        calendar_color: '#FF0000',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
    });

    it('should return event data as JSON without calendar info', () => {
      const event = new Event({
        id: '789',
        calendar_id: '456',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        is_all_day: false,
        location: 'Test Location',
        attendees: [{ email: 'test@example.com', name: 'Test User' }],
        recurrence_rule: { frequency: 'weekly', interval: 1 },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      const json = event.toJSON();

      expect(json).toEqual({
        id: '789',
        calendar_id: '456',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        is_all_day: false,
        location: 'Test Location',
        attendees: [{ email: 'test@example.com', name: 'Test User' }],
        recurrence_rule: { frequency: 'weekly', interval: 1 },
        calendar_name: undefined,
        calendar_color: undefined,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
    });
  });
});
