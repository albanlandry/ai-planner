/**
 * NLP Event Service - Extracts event details from natural language and creates events
 */

const openaiService = require('../openaiService');
const Event = require('../../models/Event');
const Calendar = require('../../models/Calendar');
const chrono = require('chrono-node');

/**
 * Extract event details from natural language using OpenAI
 * @param {String} message - User message about event
 * @param {Object} context - User context (calendars, existing events)
 * @returns {Promise<Object>} - Extracted event data
 */
async function extractEventDetails(message, context = {}) {
  const calendars = context.calendars || [];
  const calendarOptions = calendars.map(c => `- ${c.name} (ID: ${c.id})`).join('\n');

  const systemPrompt = `You are an event extraction system. Extract structured event information from natural language.

Available calendars:
${calendarOptions || '- Default calendar'}

Extract the following information:
- title: Event title (required)
- description: Optional event description
- start_time: Start date and time in ISO 8601 format (YYYY-MM-DDTHH:mm:ss) or relative date/time
- end_time: End date and time in ISO 8601 format, or duration (e.g., "1 hour", "30 minutes")
- location: Event location if mentioned
- attendees: Array of attendee names/emails if mentioned
- calendar_id: ID of the calendar to use (from available calendars list, or null for default)
- is_all_day: true if event is all-day, false otherwise

Relative dates: "tomorrow", "next Friday", "in 2 days", "next week"
Relative times: "2pm", "3:30 PM", "morning", "afternoon", "evening"

Respond with ONLY a JSON object in this format:
{
  "title": "extracted title",
  "description": "extracted description or null",
  "start_time": "ISO date string or relative date description",
  "end_time": "ISO date string, duration, or null",
  "location": "location string or null",
  "attendees": ["attendee1", "attendee2"] or null,
  "calendar_id": "calendar id or null",
  "is_all_day": false,
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

    // Parse dates using chrono-node
    const parsedDates = parseEventDates(extracted.start_time, extracted.end_time);

    return {
      ...extracted,
      ...parsedDates,
    };
  } catch (error) {
    console.error('Event extraction error:', error);
    throw new Error(`Failed to extract event details: ${error.message}`);
  }
}

/**
 * Parse event dates using chrono-node
 * @param {String} startTime - Start time string (ISO or natural language)
 * @param {String} endTime - End time string (ISO, duration, or natural language)
 * @returns {Object} - Parsed start_time and end_time in ISO format
 */
function parseEventDates(startTime, endTime) {
  const now = new Date();

  // Parse start time
  let startDate;
  if (startTime && startTime.match(/^\d{4}-\d{2}-\d{2}T/)) {
    // Already ISO format
    startDate = new Date(startTime);
  } else if (startTime) {
    // Parse natural language
    const parsed = chrono.parseDate(startTime, now);
    startDate = parsed || now;
  } else {
    startDate = now;
  }

  // Parse end time
  let endDate;
  if (endTime && endTime.match(/^\d{4}-\d{2}-\d{2}T/)) {
    // Already ISO format
    endDate = new Date(endTime);
  } else if (endTime && /(hour|minute|min|hr|h)/i.test(endTime)) {
    // Duration (e.g., "1 hour", "30 minutes")
    const durationMatch = endTime.match(/(\d+)\s*(hour|hr|h|minute|min|m)/i);
    if (durationMatch) {
      const value = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (unit.includes('hour') || unit === 'h' || unit === 'hr') {
        endDate = new Date(startDate.getTime() + value * 60 * 60 * 1000);
      } else {
        endDate = new Date(startDate.getTime() + value * 60 * 1000);
      }
    } else {
      endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour
    }
  } else if (endTime) {
    // Parse natural language
    const parsed = chrono.parseDate(endTime, startDate);
    endDate = parsed || new Date(startDate.getTime() + 60 * 60 * 1000);
  } else {
    // Default: 1 hour after start
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  // Ensure end is after start
  if (endDate <= startDate) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  return {
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
  };
}

/**
 * Create event from natural language
 * @param {String} user_id - User ID
 * @param {String} message - Natural language event description
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Created event and AI response
 */
async function createEventFromNL(user_id, message, context = {}) {
  try {
    // Extract event details
    const extracted = await extractEventDetails(message, context);

    // Check for missing required fields
    if (!extracted.title || extracted.confidence < 0.6) {
      return {
        success: false,
        message: `I need more information to create the event. Missing: ${extracted.missing_fields?.join(', ') || 'title and time'}. Could you provide: ${extracted.missing_fields?.join(', ')}?`,
        extracted,
      };
    }

    // Get default calendar if calendar_id not specified
    let calendar_id = extracted.calendar_id;
    if (!calendar_id) {
      const calendars = await Calendar.findByUserId(user_id);
      const primaryCalendar = calendars.find(c => c.is_primary) || calendars[0];
      if (primaryCalendar) {
        calendar_id = primaryCalendar.id;
      } else {
        return {
          success: false,
          message: 'No calendar available. Please create a calendar first.',
          extracted,
        };
      }
    }

    // Validate calendar belongs to user
    const calendar = await Calendar.findById(calendar_id);
    if (!calendar || calendar.user_id !== user_id) {
      return {
        success: false,
        message: 'Invalid calendar selected.',
        extracted,
      };
    }

    // Create event
    const event = await Event.create({
      calendar_id,
      title: extracted.title,
      description: extracted.description || null,
      start_time: extracted.start_time,
      end_time: extracted.end_time,
      is_all_day: extracted.is_all_day || false,
      location: extracted.location || null,
      attendees: extracted.attendees || null,
      recurrence_rule: null,
    });

    return {
      success: true,
      event: event.toJSON(),
      message: `I've created the event "${event.title}" on ${new Date(event.start_time).toLocaleString()}.`,
      extracted,
    };
  } catch (error) {
    console.error('Create event from NL error:', error);
    return {
      success: false,
      message: `I encountered an error creating the event: ${error.message}. Please try again or provide more details.`,
      error: error.message,
    };
  }
}

module.exports = {
  extractEventDetails,
  parseEventDates,
  createEventFromNL,
};

