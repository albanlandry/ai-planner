const nlpTaskService = require('../../../services/ai/nlpTaskService');
const openaiService = require('../../../services/openaiService');
const Task = require('../../../models/Task');
const Calendar = require('../../../models/Calendar');

// Mock dependencies
jest.mock('../../../services/openaiService');
jest.mock('../../../models/Task');
jest.mock('../../../models/Calendar');
jest.mock('chrono-node', () => ({
  parseDate: jest.fn((dateStr) => {
    if (dateStr && dateStr.includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek;
    }
    if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return new Date(dateStr);
    }
    return null;
  }),
}));

describe('NLP Task Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('inferPriority', () => {
    it('should infer urgent priority', () => {
      expect(nlpTaskService.inferPriority('This is urgent')).toBe('urgent');
      expect(nlpTaskService.inferPriority('Do this ASAP')).toBe('urgent');
      expect(nlpTaskService.inferPriority('Critical task')).toBe('urgent');
    });

    it('should infer high priority', () => {
      expect(nlpTaskService.inferPriority('Important task')).toBe('high');
      expect(nlpTaskService.inferPriority('High priority item')).toBe('high');
    });

    it('should infer low priority', () => {
      expect(nlpTaskService.inferPriority('This is a low priority task')).toBe('low');
      expect(nlpTaskService.inferPriority('Do this later')).toBe('low');
    });

    it('should default to medium priority', () => {
      expect(nlpTaskService.inferPriority('Regular task')).toBe('medium');
      expect(nlpTaskService.inferPriority('')).toBe('medium');
      expect(nlpTaskService.inferPriority(null)).toBe('medium');
    });
  });

  describe('extractTaskDetails', () => {
    it('should extract task details from natural language', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Review quarterly report',
          description: 'Review and approve quarterly report',
          priority: 'high',
          due_date: 'next week',
          status: 'todo',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.extractTaskDetails(
        'Add a high priority task to review quarterly report due next week',
        { calendars: [] }
      );

      expect(result.title).toBe('Review quarterly report');
      expect(result.priority).toBe('high');
      expect(result.due_date).toBeDefined();
      expect(openaiService.chatCompletion).toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: null,
          confidence: 0.3,
          missing_fields: ['title'],
        }),
      });

      const result = await nlpTaskService.extractTaskDetails(
        'Add a task',
        { calendars: [] }
      );

      expect(result.title).toBeNull();
      expect(result.confidence).toBe(0.3);
    });

    it('should validate and correct invalid priority', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Task',
          priority: 'invalid_priority',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.extractTaskDetails(
        'Add urgent task',
        { calendars: [] }
      );

      // Should infer from message text if AI returns invalid
      expect(['low', 'medium', 'high', 'urgent']).toContain(result.priority);
    });

    it('should validate and correct invalid status', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Task',
          status: 'invalid_status',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.extractTaskDetails(
        'Add new task',
        { calendars: [] }
      );

      expect(result.status).toBe('todo');
    });

    it('should parse ISO date strings', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Task',
          due_date: '2025-02-07T00:00:00Z',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.extractTaskDetails(
        'Task due next week',
        { calendars: [] }
      );

      expect(new Date(result.due_date).toISOString()).toBe('2025-02-07T00:00:00.000Z');
    });
  });

  describe('createTaskFromNL', () => {
    it('should create task successfully', async () => {
      Task.create.mockResolvedValue({
        id: 'task-123',
        user_id: 'user-123',
        title: 'Review report',
        priority: 'high',
        status: 'todo',
        toJSON: () => ({
          id: 'task-123',
          title: 'Review report',
          priority: 'high',
        }),
      });

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Review report',
          priority: 'high',
          due_date: 'next week',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.createTaskFromNL(
        'user-123',
        'Add high priority task to review report due next week',
        { calendars: [] }
      );

      expect(result.success).toBe(true);
      expect(result.task).toBeDefined();
      expect(result.message).toContain('created the task');
      expect(Task.create).toHaveBeenCalled();
    });

    it('should return error when required fields are missing', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: null,
          confidence: 0.4,
          missing_fields: ['title'],
        }),
      });

      const result = await nlpTaskService.createTaskFromNL(
        'user-123',
        'Add a task',
        { calendars: [] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('need more information');
      expect(Task.create).not.toHaveBeenCalled();
    });

    it('should use inferred priority when not provided', async () => {
      Task.create.mockResolvedValue({
        id: 'task-123',
        title: 'Test Task',
        priority: 'urgent',
        toJSON: () => ({ id: 'task-123', title: 'Test Task' }),
      });

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Task',
          priority: null,
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.createTaskFromNL(
        'user-123',
        'Add urgent task: fix bug',
        { calendars: [] }
      );

      expect(result.success).toBe(true);
      expect(Task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
        })
      );
    });

    it('should validate calendar_id if provided', async () => {
      const mockCalendar = {
        id: 'cal-123',
        user_id: 'user-123',
      };

      Calendar.findById.mockResolvedValue(mockCalendar);
      Task.create.mockResolvedValue({
        id: 'task-123',
        title: 'Test Task',
        calendar_id: 'cal-123',
        toJSON: () => ({ id: 'task-123', title: 'Test Task' }),
      });

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Task',
          calendar_id: 'cal-123',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.createTaskFromNL(
        'user-123',
        'Add task to work calendar',
        { calendars: [{ id: 'cal-123', name: 'Work' }] }
      );

      expect(result.success).toBe(true);
      expect(Task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: 'cal-123',
        })
      );
    });

    it('should ignore invalid calendar_id', async () => {
      Calendar.findById.mockResolvedValue(null); // Calendar not found

      Task.create.mockResolvedValue({
        id: 'task-123',
        title: 'Test Task',
        calendar_id: null,
        toJSON: () => ({ id: 'task-123', title: 'Test Task' }),
      });

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Task',
          calendar_id: 'invalid-cal',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.createTaskFromNL(
        'user-123',
        'Add test task',
        { calendars: [] }
      );

      expect(result.success).toBe(true);
      expect(Task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: null, // Should be null because invalid
        })
      );
    });

    it('should handle errors during task creation', async () => {
      Task.create.mockRejectedValue(new Error('Database error'));

      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          title: 'Test Task',
          confidence: 0.9,
          missing_fields: [],
        }),
      });

      const result = await nlpTaskService.createTaskFromNL(
        'user-123',
        'Add test task',
        { calendars: [] }
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('error');
    });
  });
});

