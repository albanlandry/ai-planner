const nlpEventService = require('../../../services/ai/nlpEventService');
const openaiService = require('../../../services/openaiService');
const Event = require('../../../models/Event');
const Calendar = require('../../../models/Calendar');

// Mock dependencies
jest.mock('../../../services/openaiService');
jest.mock('../../../models/Event');
jest.mock('../../../models/Calendar');
jest.mock('chrono-node', () => ({
  parseDate: jest.fn((dateStr, refDate) => {
    if (dateStr.includes('tomorrow')) {
      const tomorrow = new Date(refDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    if (dateStr.includes('2025-02-01')) {
      return new Date('2025-02-01T14:00:00Z');
    }
    return new Date(dateStr);
  }),
}));

describe('NLP Event Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractEventDetails', () => {
    it('should extract event details from natural language', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Meeting with John',
          description: 'Project discussion',
          start_time: 'tomorrow at 2pm',
          end_time: '1 hour',
          location: 'Conference Room A',
          attendees: ['john@example.com'],
          calendar_id: 'cal-123',
          is_all_day: false,
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpEventService.extractEventDetails(
        'Schedule a meeting with John tomorrow at 2pm',
        {
          calendars: [
            { id: 'cal-123', name: 'Work', color: '#3B82F6' },
          ],
        }
      );

      expect(result.title).toBe('Meeting with John');
      expect(result.start_time).toBeDefined();
      expect(result.end_time).toBeDefined();
      expect(result.location).toBe('Conference Room A');
      expect(openaiService.chatCompletion).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: null,
          confidence: 0.4,
          missing_fields: ['title', 'start_time'],
        }),
      });

      const result = await nlpEventService.extractEventDetails(
        'Schedule something',
        { calendars: [] }
      );

      expect(result.title).toBeNull();
      expect(result.confidence).toBe(0.4);
      expect(result.missing_fields).toContain('title');
    });

    it('should parse ISO date strings', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Event',
          start_time: '2025-02-01T14:00:00Z',
          end_time: '2025-02-01T15:00:00Z',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpEventService.extractEventDetails(
        'Test event',
        { calendars: [] }
      );

      expect(result.start_time).toBe('2025-02-01T14:00:00Z');
      expect(result.end_time).toBe('2025-02-01T15:00:00Z');
    });
  });

  describe('parseEventDates', () => {
    it('should parse relative dates and times', () => {
      const now = new Date('2025-01-31T12:00:00Z');
      const result = nlpEventService.parseEventDates('tomorrow at 2pm', '1 hour');

      expect(result.start_time).toBeDefined();
      expect(result.end_time).toBeDefined();
      expect(new Date(result.end_time).getTime()).toBeGreaterThan(
        new Date(result.start_time).getTime()
      );
    });

    it('should default to 1 hour duration if end_time not provided', () => {
      const result = nlpEventService.parseEventDates('2025-02-01T14:00:00Z', null);

      expect(result.start_time).toBe('2025-02-01T14:00:00Z');
      expect(result.end_time).toBeDefined();
      const duration = new Date(result.end_time).getTime() - new Date(result.start_time).getTime();
      expect(duration).toBe(60 * 60 * 1000); // 1 hour
    });

    it('should ensure end_time is after start_time', () => {
      const result = nlpEventService.parseEventDates(
        '2025-02-01T14:00:00Z',
        '2025-02-01T13:00:00Z' // End before start (invalid)
      );

      const end = new Date(result.end_time);
      const start = new Date(result.start_time);
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });
  });

  describe('createEventFromNL', () => {
    it('should create event successfully', async () => {
      const mockCalendar = {
        id: 'cal-123',
        user_id: 'user-123',
        name: 'Work',
        color: '#3B82F6',
        is_primary: true,
      };

      Calendar.findByUserId.mockResolvedValue([mockCalendar]);
      Calendar.findById.mockResolvedValue(mockCalendar);
      Event.create.mockResolvedValue({
        id: 'event-123',
        calendar_id: 'cal-123',
        title: 'Meeting with John',
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
        toJSON: () => ({
          id: 'event-123',
          title: 'Meeting with John',
        }),
      });

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Meeting with John',
          start_time: 'tomorrow at 2pm',
          end_time: '1 hour',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpEventService.createEventFromNL(
        'user-123',
        'Schedule a meeting with John tomorrow at 2pm',
        { calendars: [{ id: 'cal-123', name: 'Work', color: '#3B82F6' }] }
      );

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.message).toContain('created the event');
      expect(Event.create).toHaveBeenCalled();
    });

    it('should return error when required fields are missing', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: null,
          confidence: 0.4,
          missing_fields: ['title', 'start_time'],
        }),
      });

      const result = await nlpEventService.createEventFromNL(
        'user-123',
        'Schedule something',
        { calendars: [] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('need more information');
      expect(Event.create).not.toHaveBeenCalled();
    });

    it('should use primary calendar when calendar_id not specified', async () => {
      const mockCalendar = {
        id: 'cal-primary',
        user_id: 'user-123',
        name: 'Primary',
        is_primary: true,
      };

      Calendar.findByUserId.mockResolvedValue([mockCalendar]);
      Calendar.findById.mockResolvedValue(mockCalendar);
      Event.create.mockResolvedValue({
        id: 'event-123',
        calendar_id: 'cal-primary',
        title: 'Test Event',
        toJSON: () => ({ id: 'event-123', title: 'Test Event' }),
      });

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Event',
          start_time: 'tomorrow at 2pm',
          end_time: '1 hour',
          calendar_id: null, // Not specified
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpEventService.createEventFromNL(
        'user-123',
        'Create test event',
        { calendars: [{ id: 'cal-primary', name: 'Primary' }] }
      );

      expect(result.success).toBe(true);
      expect(Event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'cal-primary',
        })
      );
    });

    it('should return error when no calendar available', async () => {
      Calendar.findByUserId.mockResolvedValue([]);

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Event',
          start_time: 'tomorrow at 2pm',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpEventService.createEventFromNL(
        'user-123',
        'Create test event',
        { calendars: [] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No calendar available');
    });

    it('should return error when invalid calendar_id provided', async () => {
      Calendar.findById.mockResolvedValue(null); // Calendar not found

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Event',
          start_time: 'tomorrow at 2pm',
          calendar_id: 'invalid-cal',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpEventService.createEventFromNL(
        'user-123',
        'Create test event',
        { calendars: [{ id: 'cal-123', name: 'Work' }] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid calendar');
    });

    it('should handle errors during event creation', async () => {
      const mockCalendar = {
        id: 'cal-123',
        user_id: 'user-123',
        is_primary: true,
      };

      Calendar.findByUserId.mockResolvedValue([mockCalendar]);
      Calendar.findById.mockResolvedValue(mockCalendar);
      Event.create.mockRejectedValue(new Error('Database error'));

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Event',
          start_time: 'tomorrow at 2pm',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpEventService.createEventFromNL(
        'user-123',
        'Create test event',
        { calendars: [{ id: 'cal-123', name: 'Work' }] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });
  });
});

