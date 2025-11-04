/**
 * MCP Server - Model Context Protocol Server
 * Exposes capabilities to AI models for interacting with the application
 */

const Event = require('../models/Event');
const Task = require('../models/Task');
const Calendar = require('../models/Calendar');
const User = require('../models/User');
const schedulingService = require('../services/ai/schedulingService');
const queryProcessor = require('../services/ai/queryProcessor');

/**
 * Standard MCP response format
 */
function createResponse(success, data, error = null, executionTimeMs = 0) {
  return {
    success,
    data,
    error,
    execution_time_ms: executionTimeMs,
  };
}

/**
 * Validate user access to calendar
 */
async function validateCalendarAccess(userId, calendarId) {
  const calendar = await Calendar.findByIdAndUserId(calendarId, userId);
  return calendar !== null;
}

/**
 * MCP Capabilities Registry
 */
const capabilities = {
  /**
   * HIGH PRIORITY: Create Event
   */
  async create_event(userId, params) {
    const startTime = Date.now();
    try {
      const { calendar_id, title, start_time, end_time, description, is_all_day, location, attendees, recurrence_rule } = params;

      // Validate required fields
      if (!title || !start_time || !end_time) {
        return createResponse(false, null, 'Missing required fields: title, start_time, end_time', Date.now() - startTime);
      }

      // Validate calendar access
      if (calendar_id) {
        const hasAccess = await validateCalendarAccess(userId, calendar_id);
        if (!hasAccess) {
          return createResponse(false, null, 'Calendar not found or access denied', Date.now() - startTime);
        }
      } else {
        // Get default calendar
        const calendars = await Calendar.findByUserId(userId);
        const primaryCalendar = calendars.find(c => c.is_primary) || calendars[0];
        if (!primaryCalendar) {
          return createResponse(false, null, 'No calendar available', Date.now() - startTime);
        }
        params.calendar_id = primaryCalendar.id;
      }

      // Create event
      const event = await Event.create({
        calendar_id: params.calendar_id,
        title,
        description: description || null,
        start_time,
        end_time,
        is_all_day: is_all_day || false,
        location: location || null,
        attendees: attendees || null,
        recurrence_rule: recurrence_rule || null,
      });

      return createResponse(true, event.toJSON(), null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP create_event error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Get Events
   */
  async get_events(userId, params) {
    const startTime = Date.now();
    try {
      const { start_date, end_date, calendar_id, limit = 100 } = params;

      if (!start_date || !end_date) {
        return createResponse(false, null, 'Missing required fields: start_date, end_date', Date.now() - startTime);
      }

      let events;
      if (calendar_id) {
        // Validate calendar access
        const hasAccess = await validateCalendarAccess(userId, calendar_id);
        if (!hasAccess) {
          return createResponse(false, null, 'Calendar not found or access denied', Date.now() - startTime);
        }
        events = await Event.findByCalendarId(calendar_id, start_date, end_date);
      } else {
        events = await Event.findByUserId(userId, start_date, end_date);
      }

      // Limit results
      const limitedEvents = events.slice(0, parseInt(limit)).map(e => e.toJSON());

      return createResponse(true, limitedEvents, null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP get_events error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Get Calendars
   */
  async get_calendars(userId, params) {
    const startTime = Date.now();
    try {
      const calendars = await Calendar.findByUserId(userId);
      const calendarsJson = calendars.map(c => c.toJSON());

      return createResponse(true, calendarsJson, null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP get_calendars error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Create Task
   */
  async create_task(userId, params) {
    const startTime = Date.now();
    try {
      const { title, description, status, priority, due_date, calendar_id, organization_id, team_id } = params;

      // Validate required fields
      if (!title) {
        return createResponse(false, null, 'Missing required field: title', Date.now() - startTime);
      }

      // Validate calendar_id if provided
      if (calendar_id) {
        const hasAccess = await validateCalendarAccess(userId, calendar_id);
        if (!hasAccess) {
          return createResponse(false, null, 'Calendar not found or access denied', Date.now() - startTime);
        }
      }

      // Create task
      const task = await Task.create({
        user_id: userId,
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        due_date: due_date || null,
        calendar_id: calendar_id || null,
        organization_id: organization_id || null,
        team_id: team_id || null,
      });

      return createResponse(true, task.toJSON(), null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP create_task error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Get Tasks
   */
  async get_tasks(userId, params) {
    const startTime = Date.now();
    try {
      const { status, priority, calendar_id, organization_id, team_id, due_date_from, due_date_to, limit = 100 } = params;

      // Build filters
      const filters = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (calendar_id) filters.calendar_id = calendar_id;

      // Get tasks
      let tasks = await Task.findByUserId(userId, filters);

      // Filter by organization_id if provided
      if (organization_id) {
        tasks = tasks.filter(t => t.organization_id === organization_id);
      }

      // Filter by team_id if provided
      if (team_id) {
        tasks = tasks.filter(t => t.team_id === team_id);
      }

      // Filter by due date range if provided
      if (due_date_from || due_date_to) {
        tasks = tasks.filter(t => {
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date);
          if (due_date_from && dueDate < new Date(due_date_from)) return false;
          if (due_date_to && dueDate > new Date(due_date_to)) return false;
          return true;
        });
      }

      // Limit results
      const limitedTasks = tasks.slice(0, parseInt(limit)).map(t => t.toJSON());

      return createResponse(true, limitedTasks, null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP get_tasks error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Detect Conflicts
   */
  async detect_conflicts(userId, params) {
    const startTime = Date.now();
    try {
      const { start_time, end_time, exclude_event_id } = params;

      if (!start_time || !end_time) {
        return createResponse(false, null, 'Missing required fields: start_time, end_time', Date.now() - startTime);
      }

      const conflictResult = await schedulingService.detectConflicts(
        userId,
        start_time,
        end_time,
        exclude_event_id || null
      );

      return createResponse(true, conflictResult, null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP detect_conflicts error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Query Calendar
   */
  async query_calendar(userId, params) {
    const startTime = Date.now();
    try {
      const { query, date_range } = params;

      if (!query) {
        return createResponse(false, null, 'Missing required field: query', Date.now() - startTime);
      }

      // Get user context
      const calendars = await Calendar.findByUserId(userId);
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const startDate = date_range?.start || now.toISOString();
      const endDate = date_range?.end || nextWeek.toISOString();
      
      const events = await Event.findByUserId(userId, startDate, endDate);

      // Process query
      const queryResult = await queryProcessor.processQuery(query, {
        events: events.map(e => ({
          id: e.id,
          title: e.title,
          start_time: e.start_time,
          end_time: e.end_time,
          calendar_name: e.calendar_name,
          location: e.location,
        })),
        tasks: [],
        calendars: calendars.map(c => ({ id: c.id, name: c.name, color: c.color })),
      });

      return createResponse(true, {
        answer: queryResult.answer,
        events: queryResult.events,
        date_range: queryResult.dateRange,
      }, null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP query_calendar error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Query Tasks
   */
  async query_tasks(userId, params) {
    const startTime = Date.now();
    try {
      const { query, filters } = params;

      if (!query) {
        return createResponse(false, null, 'Missing required field: query', Date.now() - startTime);
      }

      // Get tasks with filters
      const taskFilters = {};
      if (filters?.status) taskFilters.status = filters.status;
      if (filters?.priority) taskFilters.priority = filters.priority;

      let tasks = await Task.findByUserId(userId, taskFilters);

      // Filter by due date range if provided
      if (filters?.due_date_from || filters?.due_date_to) {
        tasks = tasks.filter(t => {
          if (!t.due_date) return false;
          const dueDate = new Date(t.due_date);
          if (filters.due_date_from && dueDate < new Date(filters.due_date_from)) return false;
          if (filters.due_date_to && dueDate > new Date(filters.due_date_to)) return false;
          return true;
        });
      }

      // Process query
      const queryResult = await queryProcessor.processQuery(query, {
        events: [],
        tasks: tasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
        })),
        calendars: [],
      });

      return createResponse(true, {
        answer: queryResult.answer,
        tasks: queryResult.tasks,
      }, null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP query_tasks error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },

  /**
   * HIGH PRIORITY: Get User Context
   */
  async get_user_context(userId, params) {
    const startTime = Date.now();
    try {
      const {
        include_events = true,
        include_tasks = true,
        include_calendars = true,
        events_days_ahead = 7,
        tasks_limit = 10,
      } = params;

      const context = {};

      // Get user info
      const user = await User.findById(userId);
      if (!user) {
        return createResponse(false, null, 'User not found', Date.now() - startTime);
      }

      context.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Get calendars
      if (include_calendars) {
        const calendars = await Calendar.findByUserId(userId);
        context.calendars = calendars.map(c => c.toJSON());
      }

      // Get events
      if (include_events) {
        const now = new Date();
        const endDate = new Date(now.getTime() + events_days_ahead * 24 * 60 * 60 * 1000);
        const events = await Event.findByUserId(userId, now.toISOString(), endDate.toISOString());
        context.events = events.map(e => e.toJSON());
      }

      // Get tasks
      if (include_tasks) {
        const tasks = await Task.findByUserId(userId, { status: 'todo' });
        const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');
        context.tasks = pendingTasks.slice(0, parseInt(tasks_limit)).map(t => t.toJSON());
      }

      return createResponse(true, context, null, Date.now() - startTime);
    } catch (error) {
      console.error('MCP get_user_context error:', error);
      return createResponse(false, null, error.message, Date.now() - startTime);
    }
  },
};

/**
 * Execute an MCP capability
 * @param {String} capabilityName - Name of the capability to execute
 * @param {String} userId - User ID for authorization
 * @param {Object} params - Parameters for the capability
 * @returns {Promise<Object>} - Standard MCP response
 */
async function executeCapability(capabilityName, userId, params = {}) {
  if (!capabilities[capabilityName]) {
    return createResponse(false, null, `Unknown capability: ${capabilityName}`, 0);
  }

  try {
    return await capabilities[capabilityName](userId, params);
  } catch (error) {
    console.error(`MCP capability execution error (${capabilityName}):`, error);
    return createResponse(false, null, error.message, 0);
  }
}

/**
 * Get list of available capabilities
 */
function getAvailableCapabilities() {
  return Object.keys(capabilities).map(name => ({
    name,
    description: `MCP capability: ${name}`,
  }));
}

module.exports = {
  executeCapability,
  getAvailableCapabilities,
  capabilities,
};

