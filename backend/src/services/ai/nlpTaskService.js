/**
 * NLP Task Service - Extracts task details from natural language and creates tasks
 */

const openaiService = require('../openaiService');
const Task = require('../../models/Task');
const Calendar = require('../../models/Calendar');
const chrono = require('chrono-node');

const PRIORITY_KEYWORDS = {
  urgent: ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'now'],
  high: ['important', 'high', 'soon', 'quickly'],
  medium: ['normal', 'medium', 'moderate'],
  low: ['low', 'later', 'whenever', 'optional', 'nice to have'],
};

/**
 * Infer priority from text
 * @param {String} text - Text to analyze
 * @returns {String} - Priority level
 */
function inferPriority(text) {
  if (!text) return 'medium';
  
  const lowerText = text.toLowerCase();
  
  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return priority;
    }
  }
  
  return 'medium';
}

/**
 * Extract task details from natural language using OpenAI
 * @param {String} message - User message about task
 * @param {Object} context - User context (calendars, existing tasks)
 * @returns {Promise<Object>} - Extracted task data
 */
async function extractTaskDetails(message, context = {}) {
  const calendars = context.calendars || [];
  const calendarOptions = calendars.map(c => `- ${c.name} (ID: ${c.id})`).join('\n');

  const systemPrompt = `You are a task extraction system. Extract structured task information from natural language.

Available calendars:
${calendarOptions || "- None (task won't be linked to a calendar)"}

Extract the following information:
- title: Task title (required)
- description: Optional task description
- priority: One of: low, medium, high, urgent (default: medium)
- due_date: Due date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss) or relative date description
- calendar_id: ID of calendar to link task to (from available calendars, or null)
- status: One of: todo, in_progress, done, cancelled (default: todo)

Priority inference:
- urgent: "urgent", "asap", "immediately", "critical", "emergency"
- high: "important", "high priority", "soon"
- medium: default
- low: "low priority", "later", "whenever"

Relative dates: "tomorrow", "next week", "in 3 days", "Friday", "end of month"

Respond with ONLY a JSON object in this format:
{
  "title": "extracted title",
  "description": "extracted description or null",
  "priority": "low|medium|high|urgent",
  "due_date": "ISO date string or relative date description or null",
  "calendar_id": "calendar id or null",
  "status": "todo|in_progress|done|cancelled",
  "confidence": 0.0-1.0,
  "missing_fields": ["list of required fields that are missing"]
}

If information is ambiguous or missing, set confidence to a lower value and list missing fields.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ];

  try {
    const response = await openaiService.chatCompletion(messages, {
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      max_tokens: 500,
    });

    // Parse JSON response
    const content = response.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Parse due date using chrono-node
    let dueDate = null;
    if (extracted.due_date && extracted.due_date !== 'null') {
      if (extracted.due_date.match(/^\d{4}-\d{2}-\d{2}T/)) {
        // Already ISO format
        dueDate = new Date(extracted.due_date).toISOString();
      } else {
        // Parse natural language
        const parsed = chrono.parseDate(extracted.due_date);
        if (parsed) {
          dueDate = parsed.toISOString();
        }
      }
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(extracted.priority)) {
      extracted.priority = inferPriority(message);
    }

    // Validate status
    const validStatuses = ['todo', 'in_progress', 'done', 'cancelled'];
    if (!validStatuses.includes(extracted.status)) {
      extracted.status = 'todo';
    }

    return {
      ...extracted,
      due_date: dueDate,
    };
  } catch (error) {
    console.error('Task extraction error:', error);
    throw new Error(`Failed to extract task details: ${error.message}`);
  }
}

/**
 * Create task from natural language
 * @param {String} user_id - User ID
 * @param {String} message - Natural language task description
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Created task and AI response
 */
async function createTaskFromNL(user_id, message, context = {}) {
  try {
    // Extract task details
    const extracted = await extractTaskDetails(message, context);

    // Check for missing required fields
    if (!extracted.title || extracted.confidence < 0.6) {
      return {
        success: false,
        message: `I need more information to create the task. Missing: ${extracted.missing_fields?.join(', ') || 'title'}. Could you provide: ${extracted.missing_fields?.join(', ')}?`,
        extracted,
      };
    }

    // Validate calendar_id if provided
    let calendar_id = extracted.calendar_id || null;
    if (calendar_id) {
      const calendar = await Calendar.findById(calendar_id);
      if (!calendar || calendar.user_id !== user_id) {
        calendar_id = null; // Ignore invalid calendar_id
      }
    }

    // Create task
    const task = await Task.create({
      user_id,
      title: extracted.title,
      description: extracted.description || null,
      status: extracted.status || 'todo',
      priority: extracted.priority || inferPriority(message),
      due_date: extracted.due_date || null,
      calendar_id,
      organization_id: null,
      team_id: null,
    });

    let responseMessage = `I've created the task "${task.title}"`;
    if (task.due_date) {
      responseMessage += ` due on ${new Date(task.due_date).toLocaleDateString()}`;
    }
    if (task.priority !== 'medium') {
      responseMessage += ` with ${task.priority} priority`;
    }
    responseMessage += '.';

    return {
      success: true,
      task: task.toJSON(),
      message: responseMessage,
      extracted,
    };
  } catch (error) {
    console.error('Create task from NL error:', error);
    return {
      success: false,
      message: `I encountered an error creating the task: ${error.message}. Please try again or provide more details.`,
      error: error.message,
    };
  }
}

module.exports = {
  extractTaskDetails,
  inferPriority,
  createTaskFromNL,
};

