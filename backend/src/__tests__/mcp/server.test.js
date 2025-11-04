const mcpServer = require('../../mcp/server');
const Event = require('../../models/Event');
const Task = require('../../models/Task');
const Calendar = require('../../models/Calendar');
const User = require('../../models/User');
const schedulingService = require('../../services/ai/schedulingService');
const queryProcessor = require('../../services/ai/queryProcessor');

// Mock all dependencies
jest.mock('../../models/Event');
jest.mock('../../models/Task');
jest.mock('../../models/Calendar');
jest.mock('../../models/User');
jest.mock('../../services/ai/schedulingService');
jest.mock('../../services/ai/queryProcessor');

describe('MCP Server', () => {
  const mockUserId = 'user-123';
  const mockCalendarId = 'calendar-123';
  const mockEventId = 'event-123';
  const mockTaskId = 'task-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create_event', () => {
    it('should create an event successfully', async () => {
      const mockCalendar = {
        id: mockCalendarId,
        user_id: mockUserId,
        name: 'Work',
        toJSON: () => ({ id: mockCalendarId, name: 'Work' }),
      };

      const mockEvent = {
        id: mockEventId,
        calendar_id: mockCalendarId,
        title: 'Team Meeting',
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
        toJSON: () => ({
          id: mockEventId,
          calendar_id: mockCalendarId,
          title: 'Team Meeting',
          start_time: '2025-02-01T14:00:00Z',
          end_time: '2025-02-01T15:00:00Z',
        }),
      };

      Calendar.findByIdAndUserId.mockResolvedValue(mockCalendar);
      Event.create.mockResolvedValue(mockEvent);

      const result = await mcpServer.executeCapability('create_event', mockUserId, {
        calendar_id: mockCalendarId,
        title: 'Team Meeting',
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Team Meeting');
      expect(result.error).toBeNull();
      expect(Event.create).toHaveBeenCalledWith({
        calendar_id: mockCalendarId,
        title: 'Team Meeting',
        description: null,
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
        is_all_day: false,
        location: null,
        attendees: null,
        recurrence_rule: null,
      });
    });

    it('should use default calendar when calendar_id is not provided', async () => {
      const mockPrimaryCalendar = {
        id: mockCalendarId,
        user_id: mockUserId,
        name: 'Personal',
        is_primary: true,
        toJSON: () => ({ id: mockCalendarId, name: 'Personal' }),
      };

      const mockEvent = {
        id: mockEventId,
        toJSON: () => ({ id: mockEventId }),
      };

      Calendar.findByUserId.mockResolvedValue([mockPrimaryCalendar]);
      Event.create.mockResolvedValue(mockEvent);

      const result = await mcpServer.executeCapability('create_event', mockUserId, {
        title: 'Meeting',
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(Event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_id: mockCalendarId,
          title: 'Meeting',
        })
      );
    });

    it('should return error when required fields are missing', async () => {
      const result = await mcpServer.executeCapability('create_event', mockUserId, {
        title: 'Meeting',
        // Missing start_time and end_time
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
      expect(Event.create).not.toHaveBeenCalled();
    });

    it('should return error when calendar access is denied', async () => {
      Calendar.findByIdAndUserId.mockResolvedValue(null);

      const result = await mcpServer.executeCapability('create_event', mockUserId, {
        calendar_id: mockCalendarId,
        title: 'Meeting',
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Calendar not found or access denied');
      expect(Event.create).not.toHaveBeenCalled();
    });
  });

  describe('get_events', () => {
    it('should retrieve events successfully', async () => {
      const mockEvents = [
        {
          id: mockEventId,
          title: 'Event 1',
          start_time: '2025-02-01T14:00:00Z',
          end_time: '2025-02-01T15:00:00Z',
          toJSON: () => ({
            id: mockEventId,
            title: 'Event 1',
            start_time: '2025-02-01T14:00:00Z',
            end_time: '2025-02-01T15:00:00Z',
          }),
        },
      ];

      Event.findByUserId.mockResolvedValue(mockEvents);

      const result = await mcpServer.executeCapability('get_events', mockUserId, {
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-01T23:59:59Z',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Event 1');
      expect(Event.findByUserId).toHaveBeenCalledWith(
        mockUserId,
        '2025-02-01T00:00:00Z',
        '2025-02-01T23:59:59Z'
      );
    });

    it('should filter by calendar_id when provided', async () => {
      const mockEvents = [
        {
          id: mockEventId,
          toJSON: () => ({ id: mockEventId }),
        },
      ];

      Calendar.findByIdAndUserId.mockResolvedValue({ id: mockCalendarId });
      Event.findByCalendarId.mockResolvedValue(mockEvents);

      const result = await mcpServer.executeCapability('get_events', mockUserId, {
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-01T23:59:59Z',
        calendar_id: mockCalendarId,
      });

      expect(result.success).toBe(true);
      expect(Event.findByCalendarId).toHaveBeenCalledWith(
        mockCalendarId,
        '2025-02-01T00:00:00Z',
        '2025-02-01T23:59:59Z'
      );
    });

    it('should respect limit parameter', async () => {
      const mockEvents = Array.from({ length: 150 }, (_, i) => ({
        id: `event-${i}`,
        toJSON: () => ({ id: `event-${i}` }),
      }));

      Event.findByUserId.mockResolvedValue(mockEvents);

      const result = await mcpServer.executeCapability('get_events', mockUserId, {
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-01T23:59:59Z',
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(50);
    });

    it('should return error when required fields are missing', async () => {
      const result = await mcpServer.executeCapability('get_events', mockUserId, {
        start_date: '2025-02-01T00:00:00Z',
        // Missing end_date
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });
  });

  describe('get_calendars', () => {
    it('should retrieve all user calendars', async () => {
      const mockCalendars = [
        {
          id: mockCalendarId,
          name: 'Work',
          color: '#3B82F6',
          toJSON: () => ({ id: mockCalendarId, name: 'Work', color: '#3B82F6' }),
        },
        {
          id: 'calendar-456',
          name: 'Personal',
          color: '#EF4444',
          toJSON: () => ({ id: 'calendar-456', name: 'Personal', color: '#EF4444' }),
        },
      ];

      Calendar.findByUserId.mockResolvedValue(mockCalendars);

      const result = await mcpServer.executeCapability('get_calendars', mockUserId, {});

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Work');
      expect(Calendar.findByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array when user has no calendars', async () => {
      Calendar.findByUserId.mockResolvedValue([]);

      const result = await mcpServer.executeCapability('get_calendars', mockUserId, {});

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('create_task', () => {
    it('should create a task successfully', async () => {
      const mockTask = {
        id: mockTaskId,
        user_id: mockUserId,
        title: 'Review document',
        status: 'todo',
        priority: 'high',
        toJSON: () => ({
          id: mockTaskId,
          user_id: mockUserId,
          title: 'Review document',
          status: 'todo',
          priority: 'high',
        }),
      };

      Task.create.mockResolvedValue(mockTask);

      const result = await mcpServer.executeCapability('create_task', mockUserId, {
        title: 'Review document',
        priority: 'high',
        due_date: '2025-02-05T00:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Review document');
      expect(result.data.priority).toBe('high');
      expect(Task.create).toHaveBeenCalledWith({
        user_id: mockUserId,
        title: 'Review document',
        description: null,
        status: 'todo',
        priority: 'high',
        due_date: '2025-02-05T00:00:00Z',
        calendar_id: null,
        organization_id: null,
        team_id: null,
      });
    });

    it('should use default values when not provided', async () => {
      const mockTask = {
        id: mockTaskId,
        toJSON: () => ({ id: mockTaskId }),
      };

      Task.create.mockResolvedValue(mockTask);

      const result = await mcpServer.executeCapability('create_task', mockUserId, {
        title: 'Task',
      });

      expect(result.success).toBe(true);
      expect(Task.create).toHaveBeenCalledWith({
        user_id: mockUserId,
        title: 'Task',
        description: null,
        status: 'todo',
        priority: 'medium',
        due_date: null,
        calendar_id: null,
        organization_id: null,
        team_id: null,
      });
    });

    it('should return error when title is missing', async () => {
      const result = await mcpServer.executeCapability('create_task', mockUserId, {
        description: 'Task description',
        // Missing title
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required field: title');
      expect(Task.create).not.toHaveBeenCalled();
    });

    it('should validate calendar_id if provided', async () => {
      Calendar.findByIdAndUserId.mockResolvedValue(null);

      const result = await mcpServer.executeCapability('create_task', mockUserId, {
        title: 'Task',
        calendar_id: 'invalid-calendar-id',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Calendar not found or access denied');
      expect(Task.create).not.toHaveBeenCalled();
    });
  });

  describe('get_tasks', () => {
    it('should retrieve tasks with filters', async () => {
      const mockTasks = [
        {
          id: mockTaskId,
          title: 'Task 1',
          status: 'todo',
          priority: 'high',
          toJSON: () => ({
            id: mockTaskId,
            title: 'Task 1',
            status: 'todo',
            priority: 'high',
          }),
        },
      ];

      Task.findByUserId.mockResolvedValue(mockTasks);

      const result = await mcpServer.executeCapability('get_tasks', mockUserId, {
        status: 'todo',
        priority: 'high',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(Task.findByUserId).toHaveBeenCalledWith(mockUserId, {
        status: 'todo',
        priority: 'high',
        calendar_id: undefined,
      });
    });

    it('should filter by organization_id', async () => {
      const mockTasks = [
        {
          id: mockTaskId,
          organization_id: 'org-123',
          toJSON: () => ({ id: mockTaskId }),
        },
        {
          id: 'task-456',
          organization_id: 'org-456',
          toJSON: () => ({ id: 'task-456' }),
        },
      ];

      Task.findByUserId.mockResolvedValue(mockTasks);

      const result = await mcpServer.executeCapability('get_tasks', mockUserId, {
        organization_id: 'org-123',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockTaskId);
    });

    it('should filter by due date range', async () => {
      const mockTasks = [
        {
          id: mockTaskId,
          due_date: '2025-02-05T00:00:00Z',
          toJSON: () => ({ id: mockTaskId, due_date: '2025-02-05T00:00:00Z' }),
        },
        {
          id: 'task-456',
          due_date: '2025-02-10T00:00:00Z',
          toJSON: () => ({ id: 'task-456', due_date: '2025-02-10T00:00:00Z' }),
        },
      ];

      Task.findByUserId.mockResolvedValue(mockTasks);

      const result = await mcpServer.executeCapability('get_tasks', mockUserId, {
        due_date_from: '2025-02-01T00:00:00Z',
        due_date_to: '2025-02-07T00:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe(mockTaskId);
    });

    it('should respect limit parameter', async () => {
      const mockTasks = Array.from({ length: 150 }, (_, i) => ({
        id: `task-${i}`,
        toJSON: () => ({ id: `task-${i}` }),
      }));

      Task.findByUserId.mockResolvedValue(mockTasks);

      const result = await mcpServer.executeCapability('get_tasks', mockUserId, {
        limit: 50,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(50);
    });
  });

  describe('detect_conflicts', () => {
    it('should detect conflicts successfully', async () => {
      const conflictResult = {
        hasConflict: true,
        conflicts: [
          {
            id: mockEventId,
            title: 'Existing Event',
            start_time: '2025-02-01T14:00:00Z',
            end_time: '2025-02-01T15:00:00Z',
          },
        ],
        conflictCount: 1,
      };

      schedulingService.detectConflicts.mockResolvedValue(conflictResult);

      const result = await mcpServer.executeCapability('detect_conflicts', mockUserId, {
        start_time: '2025-02-01T14:30:00Z',
        end_time: '2025-02-01T15:30:00Z',
      });

      expect(result.success).toBe(true);
      expect(result.data.hasConflict).toBe(true);
      expect(result.data.conflicts).toHaveLength(1);
      expect(schedulingService.detectConflicts).toHaveBeenCalledWith(
        mockUserId,
        '2025-02-01T14:30:00Z',
        '2025-02-01T15:30:00Z',
        null
      );
    });

    it('should exclude event_id when provided', async () => {
      schedulingService.detectConflicts.mockResolvedValue({
        hasConflict: false,
        conflicts: [],
        conflictCount: 0,
      });

      const result = await mcpServer.executeCapability('detect_conflicts', mockUserId, {
        start_time: '2025-02-01T14:00:00Z',
        end_time: '2025-02-01T15:00:00Z',
        exclude_event_id: mockEventId,
      });

      expect(result.success).toBe(true);
      expect(schedulingService.detectConflicts).toHaveBeenCalledWith(
        mockUserId,
        '2025-02-01T14:00:00Z',
        '2025-02-01T15:00:00Z',
        mockEventId
      );
    });

    it('should return error when required fields are missing', async () => {
      const result = await mcpServer.executeCapability('detect_conflicts', mockUserId, {
        start_time: '2025-02-01T14:00:00Z',
        // Missing end_time
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
      expect(schedulingService.detectConflicts).not.toHaveBeenCalled();
    });
  });

  describe('query_calendar', () => {
    it('should process calendar query successfully', async () => {
      const mockCalendars = [
        {
          id: mockCalendarId,
          name: 'Work',
          color: '#3B82F6',
          toJSON: () => ({ id: mockCalendarId, name: 'Work', color: '#3B82F6' }),
        },
      ];

      const mockEvents = [
        {
          id: mockEventId,
          title: 'Meeting',
          start_time: '2025-02-01T14:00:00Z',
          end_time: '2025-02-01T15:00:00Z',
          calendar_name: 'Work',
          location: 'Conference Room',
        },
      ];

      Calendar.findByUserId.mockResolvedValue(mockCalendars);
      Event.findByUserId.mockResolvedValue(mockEvents);
      queryProcessor.processQuery.mockResolvedValue({
        answer: 'You have 1 meeting on February 1st.',
        events: [
          {
            id: mockEventId,
            title: 'Meeting',
            start_time: '2025-02-01T14:00:00Z',
            end_time: '2025-02-01T15:00:00Z',
          },
        ],
        dateRange: {
          start: new Date('2025-02-01T00:00:00Z'),
          end: new Date('2025-02-01T23:59:59Z'),
        },
      });

      const result = await mcpServer.executeCapability('query_calendar', mockUserId, {
        query: 'What do I have tomorrow?',
      });

      expect(result.success).toBe(true);
      expect(result.data.answer).toContain('meeting');
      expect(result.data.events).toHaveLength(1);
      expect(queryProcessor.processQuery).toHaveBeenCalled();
    });

    it('should use custom date range when provided', async () => {
      Calendar.findByUserId.mockResolvedValue([]);
      Event.findByUserId.mockResolvedValue([]);
      queryProcessor.processQuery.mockResolvedValue({
        answer: 'No events found',
        events: [],
        dateRange: { start: null, end: null },
      });

      const result = await mcpServer.executeCapability('query_calendar', mockUserId, {
        query: 'What events do I have?',
        date_range: {
          start: '2025-02-01T00:00:00Z',
          end: '2025-02-07T23:59:59Z',
        },
      });

      expect(result.success).toBe(true);
      expect(Event.findByUserId).toHaveBeenCalledWith(
        mockUserId,
        '2025-02-01T00:00:00Z',
        '2025-02-07T23:59:59Z'
      );
    });

    it('should return error when query is missing', async () => {
      const result = await mcpServer.executeCapability('query_calendar', mockUserId, {
        date_range: { start: '2025-02-01T00:00:00Z' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required field: query');
      expect(queryProcessor.processQuery).not.toHaveBeenCalled();
    });
  });

  describe('query_tasks', () => {
    it('should process task query successfully', async () => {
      const mockTasks = [
        {
          id: mockTaskId,
          title: 'Review document',
          status: 'todo',
          priority: 'high',
          due_date: '2025-02-05T00:00:00Z',
        },
      ];

      Task.findByUserId.mockResolvedValue(mockTasks);
      queryProcessor.processQuery.mockResolvedValue({
        answer: 'You have 1 high-priority task due on February 5th.',
        tasks: [
          {
            id: mockTaskId,
            title: 'Review document',
            status: 'todo',
            priority: 'high',
            due_date: '2025-02-05T00:00:00Z',
          },
        ],
      });

      const result = await mcpServer.executeCapability('query_tasks', mockUserId, {
        query: 'What high-priority tasks do I have?',
        filters: {
          priority: 'high',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.answer).toContain('task');
      expect(result.data.tasks).toHaveLength(1);
      expect(Task.findByUserId).toHaveBeenCalledWith(mockUserId, {
        status: undefined,
        priority: 'high',
        calendar_id: undefined,
      });
    });

    it('should filter by due date range', async () => {
      const mockTasks = [
        {
          id: mockTaskId,
          title: 'Task 1',
          due_date: '2025-02-05T00:00:00Z',
        },
        {
          id: 'task-456',
          title: 'Task 2',
          due_date: '2025-02-10T00:00:00Z',
        },
      ];

      Task.findByUserId.mockResolvedValue(mockTasks);
      queryProcessor.processQuery.mockResolvedValue({
        answer: 'You have 1 task',
        tasks: [{ id: mockTaskId }],
      });

      const result = await mcpServer.executeCapability('query_tasks', mockUserId, {
        query: 'What tasks are due this week?',
        filters: {
          due_date_from: '2025-02-01T00:00:00Z',
          due_date_to: '2025-02-07T00:00:00Z',
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.tasks).toHaveLength(1);
      expect(result.data.tasks[0].id).toBe(mockTaskId);
    });

    it('should return error when query is missing', async () => {
      const result = await mcpServer.executeCapability('query_tasks', mockUserId, {
        filters: { status: 'todo' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required field: query');
    });
  });

  describe('get_user_context', () => {
    it('should retrieve comprehensive user context', async () => {
      const mockUser = {
        id: mockUserId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      const mockCalendars = [
        {
          id: mockCalendarId,
          name: 'Work',
          toJSON: () => ({ id: mockCalendarId, name: 'Work' }),
        },
      ];

      const mockEvents = [
        {
          id: mockEventId,
          title: 'Meeting',
          toJSON: () => ({ id: mockEventId, title: 'Meeting' }),
        },
      ];

      const mockTasks = [
        {
          id: mockTaskId,
          title: 'Task',
          status: 'todo',
          toJSON: () => ({ id: mockTaskId, title: 'Task', status: 'todo' }),
        },
      ];

      User.findById.mockResolvedValue(mockUser);
      Calendar.findByUserId.mockResolvedValue(mockCalendars);
      Event.findByUserId.mockResolvedValue(mockEvents);
      Task.findByUserId.mockResolvedValue(mockTasks);

      const result = await mcpServer.executeCapability('get_user_context', mockUserId, {});

      expect(result.success).toBe(true);
      expect(result.data.user.id).toBe(mockUserId);
      expect(result.data.user.name).toBe('John Doe');
      expect(result.data.calendars).toHaveLength(1);
      expect(result.data.events).toHaveLength(1);
      expect(result.data.tasks).toHaveLength(1);
    });

    it('should respect include flags', async () => {
      const mockUser = {
        id: mockUserId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      User.findById.mockResolvedValue(mockUser);
      Calendar.findByUserId.mockResolvedValue([]);
      Event.findByUserId.mockResolvedValue([]);
      Task.findByUserId.mockResolvedValue([]);

      const result = await mcpServer.executeCapability('get_user_context', mockUserId, {
        include_events: false,
        include_tasks: false,
        include_calendars: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.user).toBeDefined();
      expect(result.data.calendars).toBeUndefined();
      expect(result.data.events).toBeUndefined();
      expect(result.data.tasks).toBeUndefined();
      expect(Calendar.findByUserId).not.toHaveBeenCalled();
      expect(Event.findByUserId).not.toHaveBeenCalled();
      expect(Task.findByUserId).not.toHaveBeenCalled();
    });

    it('should respect events_days_ahead parameter', async () => {
      const mockUser = {
        id: mockUserId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      User.findById.mockResolvedValue(mockUser);
      Calendar.findByUserId.mockResolvedValue([]);
      Event.findByUserId.mockResolvedValue([]);
      Task.findByUserId.mockResolvedValue([]);

      const result = await mcpServer.executeCapability('get_user_context', mockUserId, {
        events_days_ahead: 14,
      });

      expect(result.success).toBe(true);
      // Verify Event.findByUserId was called with correct date range
      expect(Event.findByUserId).toHaveBeenCalled();
      const callArgs = Event.findByUserId.mock.calls[0];
      const startDate = new Date(callArgs[1]);
      const endDate = new Date(callArgs[2]);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(14);
    });

    it('should respect tasks_limit parameter', async () => {
      const mockUser = {
        id: mockUserId,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'user',
      };

      const mockTasks = Array.from({ length: 20 }, (_, i) => ({
        id: `task-${i}`,
        status: 'todo',
        toJSON: () => ({ id: `task-${i}`, status: 'todo' }),
      }));

      User.findById.mockResolvedValue(mockUser);
      Calendar.findByUserId.mockResolvedValue([]);
      Event.findByUserId.mockResolvedValue([]);
      Task.findByUserId.mockResolvedValue(mockTasks);

      const result = await mcpServer.executeCapability('get_user_context', mockUserId, {
        tasks_limit: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data.tasks).toHaveLength(5);
    });

    it('should return error when user is not found', async () => {
      User.findById.mockResolvedValue(null);

      const result = await mcpServer.executeCapability('get_user_context', mockUserId, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('User not found');
    });
  });

  describe('executeCapability', () => {
    it('should return error for unknown capability', async () => {
      const result = await mcpServer.executeCapability('unknown_capability', mockUserId, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown capability');
    });

    it('should handle errors gracefully', async () => {
      Event.findByUserId.mockRejectedValue(new Error('Database error'));

      const result = await mcpServer.executeCapability('get_events', mockUserId, {
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-01T23:59:59Z',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getAvailableCapabilities', () => {
    it('should return list of all available capabilities', () => {
      const capabilities = mcpServer.getAvailableCapabilities();

      expect(capabilities).toBeInstanceOf(Array);
      expect(capabilities.length).toBeGreaterThan(0);
      
      const capabilityNames = capabilities.map(c => c.name);
      expect(capabilityNames).toContain('create_event');
      expect(capabilityNames).toContain('get_events');
      expect(capabilityNames).toContain('get_calendars');
      expect(capabilityNames).toContain('create_task');
      expect(capabilityNames).toContain('get_tasks');
      expect(capabilityNames).toContain('detect_conflicts');
      expect(capabilityNames).toContain('query_calendar');
      expect(capabilityNames).toContain('query_tasks');
      expect(capabilityNames).toContain('get_user_context');
    });

    it('should include description for each capability', () => {
      const capabilities = mcpServer.getAvailableCapabilities();

      capabilities.forEach(capability => {
        expect(capability).toHaveProperty('name');
        expect(capability).toHaveProperty('description');
        expect(typeof capability.name).toBe('string');
        expect(typeof capability.description).toBe('string');
      });
    });
  });
});

