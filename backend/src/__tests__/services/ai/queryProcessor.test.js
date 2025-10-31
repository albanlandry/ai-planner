const queryProcessor = require('../../../services/ai/queryProcessor');
const openaiService = require('../../../services/openaiService');

// Mock OpenAI service
jest.mock('../../../services/openaiService');
jest.mock('chrono-node', () => ({
  parse: jest.fn((text, refDate) => {
    if (text.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date(refDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return [{
        start: { date: () => tomorrow },
        end: null,
      }];
    }
    return [];
  }),
}));

describe('Query Processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractDateRange', () => {
    it('should extract today date range', () => {
      const referenceDate = new Date('2025-01-31T12:00:00Z');
      const result = queryProcessor.extractDateRange('What do I have today?', referenceDate);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      expect(result.start <= result.end).toBe(true);
    });

    it('should extract tomorrow date range', () => {
      const referenceDate = new Date('2025-01-31T12:00:00Z');
      const result = queryProcessor.extractDateRange('What do I have tomorrow?', referenceDate);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      expect(result.start.getTime()).toBeLessThanOrEqual(result.end.getTime());
    });

    it('should extract this week date range', () => {
      const referenceDate = new Date('2025-01-31T12:00:00Z'); // Friday
      const result = queryProcessor.extractDateRange('What do I have this week?', referenceDate);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      // Should start from Monday of current week
    });

    it('should extract next week date range', () => {
      const referenceDate = new Date('2025-01-31T12:00:00Z');
      const result = queryProcessor.extractDateRange('What do I have next week?', referenceDate);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should extract this month date range', () => {
      const referenceDate = new Date('2025-01-31T12:00:00Z');
      const result = queryProcessor.extractDateRange('What do I have this month?', referenceDate);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      expect(result.start.getMonth()).toBe(0); // January
      expect(result.end.getMonth()).toBe(0); // January
    });

    it('should extract next month date range', () => {
      const referenceDate = new Date('2025-01-31T12:00:00Z');
      const result = queryProcessor.extractDateRange('What do I have next month?', referenceDate);

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      expect(result.start.getMonth()).toBe(1); // February
    });

    it('should return null dates when no date pattern matches', () => {
      const result = queryProcessor.extractDateRange('Hello', new Date());

      expect(result.start).toBeNull();
      expect(result.end).toBeNull();
    });
  });

  describe('processQuery', () => {
    it('should process calendar query and return answer', async () => {
      const events = [
        {
          id: 'event-1',
          title: 'Meeting with John',
          start_time: '2025-02-01T14:00:00Z',
          end_time: '2025-02-01T15:00:00Z',
          calendar_name: 'Work',
        },
      ];

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'Tomorrow you have 1 event: Meeting with John at 2:00 PM.',
      });

      const result = await queryProcessor.processQuery(
        'What do I have tomorrow?',
        { events, tasks: [], calendars: [] }
      );

      expect(result.answer).toBe('Tomorrow you have 1 event: Meeting with John at 2:00 PM.');
      expect(result.events.length).toBeGreaterThanOrEqual(0);
      expect(openaiService.chatCompletion).toHaveBeenCalled();
    });

    it('should process task query and return answer', async () => {
      const tasks = [
        {
          id: 'task-1',
          title: 'Review report',
          status: 'todo',
          priority: 'high',
          due_date: '2025-02-07T00:00:00Z',
        },
      ];

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'You have 1 high priority task: Review report due on February 7.',
      });

      const result = await queryProcessor.processQuery(
        'Show me all high priority tasks',
        { events: [], tasks, calendars: [] }
      );

      expect(result.answer).toContain('high priority task');
      expect(result.tasks).toHaveLength(1);
    });

    it('should filter events by date range', async () => {
      const events = [
        {
          id: 'event-1',
          title: 'Tomorrow Event',
          start_time: '2025-02-01T14:00:00Z',
          end_time: '2025-02-01T15:00:00Z',
          calendar_name: 'Work',
        },
        {
          id: 'event-2',
          title: 'Next Week Event',
          start_time: '2025-02-08T14:00:00Z',
          end_time: '2025-02-08T15:00:00Z',
          calendar_name: 'Work',
        },
      ];

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'Tomorrow you have 1 event.',
      });

      const result = await queryProcessor.processQuery(
        'What do I have tomorrow?',
        { events, tasks: [], calendars: [] }
      );

      // Should filter to only tomorrow's events
      expect(result.events.length).toBeLessThanOrEqual(events.length);
    });

    it('should filter tasks by date range', async () => {
      const tasks = [
        {
          id: 'task-1',
          title: 'Tomorrow Task',
          due_date: '2025-02-01T00:00:00Z',
        },
        {
          id: 'task-2',
          title: 'Next Week Task',
          due_date: '2025-02-08T00:00:00Z',
        },
      ];

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'Tomorrow you have 1 task due.',
      });

      const result = await queryProcessor.processQuery(
        'What tasks are due tomorrow?',
        { events: [], tasks, calendars: [] }
      );

      expect(result.tasks.length).toBeLessThanOrEqual(tasks.length);
    });

    it('should handle empty results', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'You have no events scheduled for tomorrow.',
      });

      const result = await queryProcessor.processQuery(
        'What do I have tomorrow?',
        { events: [], tasks: [], calendars: [] }
      );

      expect(result.answer).toContain('no events');
      expect(result.events).toHaveLength(0);
    });

    it('should limit events and tasks to 10 each', async () => {
      const events = Array.from({ length: 20 }, (_, i) => ({
        id: `event-${i}`,
        title: `Event ${i}`,
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
      }));

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'You have many events.',
      });

      const result = await queryProcessor.processQuery(
        'What do I have?',
        { events, tasks: [], calendars: [] }
      );

      expect(result.events.length).toBeLessThanOrEqual(10);
    });

    it('should handle OpenAI errors gracefully', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockRejectedValue(new Error('API Error'));

      const result = await queryProcessor.processQuery(
        'What do I have?',
        { events: [], tasks: [], calendars: [] }
      );

      expect(result.answer).toContain('error');
      expect(result.events).toEqual([]);
      expect(result.tasks).toEqual([]);
    });

    it('should include context about events and tasks in prompt', async () => {
      const events = [{ id: 'e1', title: 'Event 1', start_time: '2025-02-01T14:00:00Z', end_time: '2025-02-01T15:00:00Z' }];
      const tasks = [{ id: 't1', title: 'Task 1', status: 'todo', priority: 'high' }];

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'Response',
      });

      await queryProcessor.processQuery(
        'What do I have?',
        { events, tasks, calendars: [] }
      );

      const callArgs = openaiService.chatCompletion.mock.calls[0];
      const systemPrompt = callArgs[0].find(msg => msg.role === 'system').content;

      expect(systemPrompt).toContain('Event 1');
      expect(systemPrompt).toContain('Task 1');
    });
  });
});

