/**
 * Query Processor - Answers questions about calendar and tasks using AI
 */

const openaiService = require('../openaiService');
const Event = require('../../models/Event');
const Task = require('../../models/Task');
const chrono = require('chrono-node');

/**
 * Process calendar/task query and generate natural language response
 * @param {String} message - User query
 * @param {Object} context - User data (events, tasks, calendars)
 * @returns {Promise<Object>} - Response with answer and relevant data
 */
async function processQuery(message, context = {}) {
  const { events = [], tasks = [], calendars = [] } = context;
  const now = new Date();

  // Try to extract date range from query
  const dateRange = extractDateRange(message, now);

  // Filter events/tasks based on query
  let relevantEvents = events;
  let relevantTasks = tasks;

  // Filter by date if mentioned in query
  if (dateRange.start || dateRange.end) {
    relevantEvents = events.filter(e => {
      const eventStart = new Date(e.start_time);
      const eventEnd = new Date(e.end_time);
      
      if (dateRange.start && eventEnd < dateRange.start) return false;
      if (dateRange.end && eventStart > dateRange.end) return false;
      return true;
    });

    relevantTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const dueDate = new Date(t.due_date);
      
      if (dateRange.start && dueDate < dateRange.start) return false;
      if (dateRange.end && dueDate > dateRange.end) return false;
      return true;
    });
  }

  // Build context summary for AI
  const eventSummary = relevantEvents.slice(0, 20).map(e => ({
    title: e.title,
    start: e.start_time,
    end: e.end_time,
    calendar: e.calendar_name || 'Unknown',
    location: e.location || null,
  }));

  const taskSummary = relevantTasks.slice(0, 20).map(t => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date || null,
  }));

  const systemPrompt = `You are a helpful assistant answering questions about the user's calendar and tasks.

User's Events (${eventSummary.length} events):
${eventSummary.length > 0 ? JSON.stringify(eventSummary, null, 2) : 'No events found'}

User's Tasks (${taskSummary.length} tasks):
${taskSummary.length > 0 ? JSON.stringify(taskSummary, null, 2) : 'No tasks found'}

Answer the user's question about their calendar or tasks. Be concise, helpful, and specific.
- If asking about events, mention title, time, and calendar
- If asking about tasks, mention title, status, priority, and due date
- If no results found, let them know politely
- Use natural, conversational language
- Format dates and times in a readable way

Current date/time: ${now.toISOString()}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ];

  try {
    const response = await openaiService.chatCompletion(messages, {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      max_tokens: 500,
    });

    return {
      answer: response.content,
      events: relevantEvents.slice(0, 10), // Limit returned events
      tasks: relevantTasks.slice(0, 10), // Limit returned tasks
      dateRange,
    };
  } catch (error) {
    console.error('Query processing error:', error);
    return {
      answer: `I encountered an error processing your query: ${error.message}. Please try rephrasing your question.`,
      events: [],
      tasks: [],
      dateRange,
    };
  }
}

/**
 * Extract date range from query text
 * @param {String} query - User query
 * @param {Date} referenceDate - Reference date (usually now)
 * @returns {Object} - Start and end dates
 */
function extractDateRange(query, referenceDate = new Date()) {
  let start = null;
  let end = null;

  // Common date patterns
  const lowerQuery = query.toLowerCase();

  // Today
  if (lowerQuery.includes('today')) {
    start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(referenceDate);
    end.setHours(23, 59, 59, 999);
  }
  // Tomorrow
  else if (lowerQuery.includes('tomorrow')) {
    start = new Date(referenceDate);
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setHours(23, 59, 59, 999);
  }
  // This week
  else if (lowerQuery.includes('this week')) {
    start = new Date(referenceDate);
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }
  // Next week
  else if (lowerQuery.includes('next week')) {
    start = new Date(referenceDate);
    const dayOfWeek = start.getDay();
    const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) + 7; // Next Monday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
  }
  // This month
  else if (lowerQuery.includes('this month')) {
    start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  // Next month
  else if (lowerQuery.includes('next month')) {
    start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
    end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 2, 0, 23, 59, 59, 999);
  }
  // Try parsing with chrono-node
  else {
    const parsed = chrono.parse(query, referenceDate);
    if (parsed && parsed.length > 0) {
      const first = parsed[0];
      start = first.start.date();
      if (first.end) {
        end = first.end.date();
      } else {
        // If only start date, assume single day
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
      }
    }
  }

  return { start, end };
}

module.exports = {
  processQuery,
  extractDateRange,
};

