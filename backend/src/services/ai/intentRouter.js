/**
 * Intent Router - Classifies user messages and routes to appropriate handlers
 * Uses OpenAI to classify user intent
 */

const openaiService = require('../openaiService');

const INTENTS = {
  CREATE_EVENT: 'create_event',
  CREATE_TASK: 'create_task',
  QUERY_CALENDAR: 'query_calendar',
  QUERY_TASK: 'query_task',
  SCHEDULING: 'scheduling',
  GENERAL_CHAT: 'general_chat',
  UPDATE_EVENT: 'update_event',
  UPDATE_TASK: 'update_task',
  DELETE_EVENT: 'delete_event',
  DELETE_TASK: 'delete_task',
};

const INTENT_DESCRIPTIONS = {
  [INTENTS.CREATE_EVENT]: 'User wants to create a new calendar event or meeting',
  [INTENTS.CREATE_TASK]: 'User wants to create a new task or todo item',
  [INTENTS.QUERY_CALENDAR]: 'User wants to know about their calendar, events, or schedule',
  [INTENTS.QUERY_TASK]: 'User wants to know about their tasks',
  [INTENTS.SCHEDULING]: 'User wants scheduling suggestions, conflict detection, or meeting coordination',
  [INTENTS.UPDATE_EVENT]: 'User wants to modify an existing event',
  [INTENTS.UPDATE_TASK]: 'User wants to modify an existing task',
  [INTENTS.DELETE_EVENT]: 'User wants to delete or cancel an event',
  [INTENTS.DELETE_TASK]: 'User wants to delete a task',
  [INTENTS.GENERAL_CHAT]: 'General conversation, questions, or non-actionable requests',
};

/**
 * Classify user intent from message
 * @param {String} message - User message
 * @param {Object} context - Optional context (conversation history)
 * @returns {Promise<Object>} - Intent classification with confidence and extracted data
 */
async function classifyIntent(message, context = {}) {
  if (!openaiService.isEnabled()) {
    // Fallback: simple keyword-based classification
    return fallbackIntentClassification(message);
  }

  const systemPrompt = `You are an intent classification system for a calendar and task management app.

Analyze the user's message and classify it into one of these intents:
- ${INTENTS.CREATE_EVENT}: ${INTENT_DESCRIPTIONS[INTENTS.CREATE_EVENT]}
- ${INTENTS.CREATE_TASK}: ${INTENT_DESCRIPTIONS[INTENTS.CREATE_TASK]}
- ${INTENTS.QUERY_CALENDAR}: ${INTENT_DESCRIPTIONS[INTENTS.QUERY_CALENDAR]}
- ${INTENTS.QUERY_TASK}: ${INTENT_DESCRIPTIONS[INTENTS.QUERY_TASK]}
- ${INTENTS.SCHEDULING}: ${INTENT_DESCRIPTIONS[INTENTS.SCHEDULING]}
- ${INTENTS.UPDATE_EVENT}: ${INTENT_DESCRIPTIONS[INTENTS.UPDATE_EVENT]}
- ${INTENTS.UPDATE_TASK}: ${INTENT_DESCRIPTIONS[INTENTS.UPDATE_TASK]}
- ${INTENTS.DELETE_EVENT}: ${INTENT_DESCRIPTIONS[INTENTS.DELETE_EVENT]}
- ${INTENTS.DELETE_TASK}: ${INTENT_DESCRIPTIONS[INTENTS.DELETE_TASK]}
- ${INTENTS.GENERAL_CHAT}: ${INTENT_DESCRIPTIONS[INTENTS.GENERAL_CHAT]}

Respond with ONLY a JSON object in this exact format:
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {
    "event_title": "extracted title if creating/updating event",
    "task_title": "extracted title if creating/updating task",
    "date_mention": "any date mentioned (e.g., 'tomorrow', 'next week', 'Friday')",
    "time_mention": "any time mentioned (e.g., '2pm', '3:30')",
    "priority_mention": "priority mentioned (low, medium, high, urgent)",
    "action_type": "create, update, delete, query"
  }
}

Be strict and only classify as CREATE_EVENT or CREATE_TASK if the user clearly wants to create something.
For questions about existing events/tasks, use QUERY_CALENDAR or QUERY_TASK.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ];

  try {
    const response = await openaiService.chatCompletion(messages, {
      model: 'gpt-3.5-turbo',
      temperature: 0.3, // Lower temperature for more consistent classification
      max_tokens: 200,
    });

    // Parse JSON response
    const content = response.content.trim();
    let result;
    
    // Try to extract JSON from response (might have markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback if JSON parsing fails
      return fallbackIntentClassification(message);
    }

    // Validate intent
    if (!Object.values(INTENTS).includes(result.intent)) {
      result.intent = INTENTS.GENERAL_CHAT;
    }

    return {
      intent: result.intent,
      confidence: result.confidence || 0.8,
      entities: result.entities || {},
      rawResponse: content,
    };
  } catch (error) {
    console.error('Intent classification error:', error);
    // Fallback to keyword-based classification
    return fallbackIntentClassification(message);
  }
}

/**
 * Fallback keyword-based intent classification
 * @param {String} message - User message
 * @returns {Object} - Intent classification
 */
function fallbackIntentClassification(message) {
  const lowerMessage = message.toLowerCase();

  // Event creation keywords
  if (
    /(schedule|create|add|set|book|plan).*(meeting|event|appointment|call|conference)/i.test(message) ||
    /(meeting|event|appointment|call).*(tomorrow|today|next|at|on|in)/i.test(message)
  ) {
    return {
      intent: INTENTS.CREATE_EVENT,
      confidence: 0.7,
      entities: {},
    };
  }

  // Task creation keywords
  if (
    /(create|add|new|make).*(task|todo|reminder|action)/i.test(message) ||
    /(task|todo).*(to|for|about)/i.test(message)
  ) {
    return {
      intent: INTENTS.CREATE_TASK,
      confidence: 0.7,
      entities: {},
    };
  }

  // Query keywords
  if (
    /(what|when|where|show|list|find|get).*(event|meeting|schedule|calendar|appointment)/i.test(message) ||
    /(tomorrow|today|this week|next week).*(event|meeting|schedule)/i.test(message)
  ) {
    return {
      intent: INTENTS.QUERY_CALENDAR,
      confidence: 0.7,
      entities: {},
    };
  }

  if (
    /(what|show|list|find|get).*(task|todo|action)/i.test(message) ||
    /(pending|upcoming|due).*(task|todo)/i.test(message)
  ) {
    return {
      intent: INTENTS.QUERY_TASK,
      confidence: 0.7,
      entities: {},
    };
  }

  // Default to general chat
  return {
    intent: INTENTS.GENERAL_CHAT,
    confidence: 0.5,
    entities: {},
  };
}

module.exports = {
  classifyIntent,
  INTENTS,
  INTENT_DESCRIPTIONS,
};

