const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const conversationManager = require('../services/ai/conversationManager');
const intentRouter = require('../services/ai/intentRouter');
const nlpEventService = require('../services/ai/nlpEventService');
const nlpTaskService = require('../services/ai/nlpTaskService');
const queryProcessor = require('../services/ai/queryProcessor');
const schedulingService = require('../services/ai/schedulingService');
const AIConversation = require('../models/AIConversation');
const AIMessage = require('../models/AIMessage');
const Calendar = require('../models/Calendar');
const Task = require('../models/Task');
const Event = require('../models/Event');
const openaiService = require('../services/openaiService');
const mcpServer = require('../mcp/server');

const router = express.Router();

/**
 * Main chat endpoint - Process user message and get AI response
 * POST /api/ai/chat
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message, conversation_id, context = {} } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required and must be a non-empty string' });
    }

    // Check if OpenAI is enabled
    if (!openaiService.isEnabled()) {
      return res.status(503).json({
        error: 'AI Assistant is not available. OpenAI API key is not configured.',
      });
    }

    // Build context from user's data if not provided
    let userContext = context;
    if (!context.calendars || !context.events || !context.tasks) {
      // Fetch user's calendars
      const calendars = await Calendar.findByUserId(req.user.id);
      
      // Fetch recent/pending tasks
      const tasks = await Task.findByUserId(req.user.id, { status: 'todo' });
      const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');
      
      // Optionally fetch upcoming events (next 7 days)
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const events = await Event.findByUserId(
        req.user.id,
        now.toISOString(),
        nextWeek.toISOString()
      );

      userContext = {
        calendars: calendars.map(c => ({ id: c.id, name: c.name, color: c.color })),
        tasks: pendingTasks.slice(0, 10).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
        })),
        events: events.slice(0, 10).map(e => ({
          id: e.id,
          title: e.title,
          start_time: e.start_time,
          end_time: e.end_time,
          calendar_name: e.calendar_name,
        })),
        ...context,
      };
    }

    // Classify intent and process accordingly
    const startTime = Date.now();
    let response;
    let error = null;

    try {
      // Guard advanced models
      const requestedModel = req.body.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      if (requestedModel.toLowerCase().includes('gpt-4') && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access to requested model is restricted' });
      }
      // Classify user intent
      const intentResult = await intentRouter.classifyIntent(message.trim(), {
        conversation_id,
        ...userContext,
      });

      let aiResponse;
      let actionResult = null;
      let promptType = 'ASSISTANT';

      // Route to appropriate handler based on intent
      switch (intentResult.intent) {
        case intentRouter.INTENTS.CREATE_EVENT:
          promptType = 'EVENT_CREATION';
          actionResult = await nlpEventService.createEventFromNL(
            req.user.id,
            message.trim(),
            userContext
          );
          
          if (actionResult.success) {
            aiResponse = actionResult.message;
          } else {
            // Need more information, ask user
            aiResponse = actionResult.message;
          }
          break;

        case intentRouter.INTENTS.CREATE_TASK:
          promptType = 'TASK_CREATION';
          actionResult = await nlpTaskService.createTaskFromNL(
            req.user.id,
            message.trim(),
            userContext
          );
          
          if (actionResult.success) {
            aiResponse = actionResult.message;
          } else {
            aiResponse = actionResult.message;
          }
          break;

        case intentRouter.INTENTS.QUERY_CALENDAR:
        case intentRouter.INTENTS.QUERY_TASK:
          promptType = 'QUERY_ASSISTANT';
          const queryResult = await queryProcessor.processQuery(
            message.trim(),
            {
              events: userContext.events || [],
              tasks: userContext.tasks || [],
              calendars: userContext.calendars || [],
            }
          );
          aiResponse = queryResult.answer;
          if (queryResult.events.length > 0 || queryResult.tasks.length > 0) {
            actionResult = {
              events: queryResult.events,
              tasks: queryResult.tasks,
            };
          }
          break;

        case intentRouter.INTENTS.SCHEDULING:
          promptType = 'SCHEDULING_ASSISTANT';
          // For scheduling, we'll use general chat but with scheduling context
          // Extract scheduling details from message if needed
          // This could be enhanced to parse specific scheduling requests
          const schedulingResponse = await conversationManager.processMessage(
            req.user.id,
            message.trim(),
            conversation_id,
            userContext,
            {
              promptType: 'SCHEDULING_ASSISTANT',
              model: req.body.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
              temperature: req.body.temperature || 0.7,
              maxTokens: req.body.max_tokens || 1000,
            }
          );
          aiResponse = schedulingResponse.message;
          break;

        default:
          // General chat - use conversation manager
          const chatResponse = await conversationManager.processMessage(
            req.user.id,
            message.trim(),
            conversation_id,
            userContext,
            {
              model: req.body.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
              temperature: req.body.temperature || 0.7,
              maxTokens: req.body.max_tokens || 1000,
            }
          );
          aiResponse = chatResponse.message;
          response = {
            message: chatResponse.message,
            conversation_id: chatResponse.conversation_id,
            tokenUsage: chatResponse.tokenUsage,
          };
      }

      // If we haven't set response yet (from default case), set it now
      if (!response) {
        // For action-based intents, we need to create a conversation entry manually
        // Get or create conversation
        const conversation = await conversationManager.getOrCreateConversation(
          req.user.id,
          conversation_id
        );

        // Save user message
        await conversationManager.addMessage(
          conversation.id,
          'user',
          message.trim(),
          { intent: intentResult.intent }
        );

        // Save assistant response
        await conversationManager.addMessage(
          conversation.id,
          'assistant',
          aiResponse,
          { intent: intentResult.intent, action: actionResult }
        );

        response = {
          message: aiResponse,
          conversation_id: conversation.id,
          intent: intentResult.intent,
          action: actionResult,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, // Will be tracked in future
        };
      }

      const executionTime = Date.now() - startTime;

      // Log interaction (async, don't wait)
      // TODO: Implement interaction logging

      res.json({
        message: response.message,
        conversation_id: response.conversation_id,
        intent: intentResult.intent,
        action: response.action || actionResult,
        token_usage: response.tokenUsage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        execution_time_ms: executionTime,
      });
    } catch (err) {
      error = err;
      const executionTime = Date.now() - startTime;

      // Log error (async)
      // TODO: Implement error logging

      if (err.message.includes('rate limit')) {
        return res.status(429).json({
          error: 'AI service is currently busy. Please try again in a moment.',
          execution_time_ms: executionTime,
        });
      }

      return res.status(500).json({
        error: 'Failed to process AI request. Please try again.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        execution_time_ms: executionTime,
      });
    }
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's conversations
 * GET /api/ai/conversations
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const conversations = await conversationManager.getUserConversations(req.user.id, limit);
    
    res.json({
      conversations: conversations.map(c => c.toJSON()),
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get specific conversation with messages
 * GET /api/ai/conversations/:id
 */
router.get('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const conversation = await AIConversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await AIMessage.findByConversationId(id);
    
    res.json({
      conversation: conversation.toJSON(),
      messages: messages.map(m => m.toJSON()),
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete conversation
 * DELETE /api/ai/conversations/:id
 */
router.delete('/conversations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await conversationManager.deleteConversation(id, req.user.id);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Check for scheduling conflicts
 * POST /api/ai/scheduling/conflicts
 */
router.post('/scheduling/conflicts', authenticateToken, async (req, res) => {
  try {
    const { start_time, end_time, exclude_event_id } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({
        error: 'start_time and end_time are required (ISO 8601 format)',
      });
    }

    const conflictResult = await schedulingService.detectConflicts(
      req.user.id,
      start_time,
      end_time,
      exclude_event_id
    );

    res.json({
      has_conflict: conflictResult.hasConflict,
      conflicts: conflictResult.conflicts,
      conflict_count: conflictResult.conflictCount,
    });
  } catch (error) {
    console.error('Conflict detection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Find available time slots
 * POST /api/ai/scheduling/available-slots
 */
router.post('/scheduling/available-slots', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, duration_minutes = 60, preferred_hours } = req.body;

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'start_date and end_date are required (ISO 8601 format)',
      });
    }

    const slots = await schedulingService.findAvailableSlots(
      req.user.id,
      start_date,
      end_date,
      duration_minutes,
      preferred_hours || [9, 10, 11, 14, 15, 16, 17]
    );

    res.json({
      slots,
      count: slots.length,
      date_range: {
        start: start_date,
        end: end_date,
      },
    });
  } catch (error) {
    console.error('Available slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Suggest meeting times
 * POST /api/ai/scheduling/suggest-times
 */
router.post('/scheduling/suggest-times', authenticateToken, async (req, res) => {
  try {
    const { duration_minutes = 60, preferred_date, preferred_times = [] } = req.body;

    const result = await schedulingService.suggestMeetingTime(
      req.user.id,
      duration_minutes,
      preferred_date,
      preferred_times
    );

    res.json({
      suggestions: result.suggestions,
      count: result.count,
      date_range: result.dateRange,
    });
  } catch (error) {
    console.error('Meeting time suggestion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check for AI service
 * GET /api/ai/health
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const enabled = openaiService.isEnabled();
    
    res.json({
      enabled,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      message: enabled
        ? 'AI Assistant is ready'
        : 'AI Assistant is not configured. Please set OPENAI_API_KEY environment variable.',
    });
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * MCP Server Endpoints
 */

/**
 * Get available MCP capabilities
 * GET /api/ai/mcp/capabilities
 */
router.get('/mcp/capabilities', authenticateToken, async (req, res) => {
  try {
    const capabilities = mcpServer.getAvailableCapabilities();
    res.json({
      capabilities,
      count: capabilities.length,
    });
  } catch (error) {
    console.error('MCP capabilities error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Execute an MCP capability
 * POST /api/ai/mcp/execute
 */
router.post('/mcp/execute', authenticateToken, async (req, res) => {
  try {
    const { capability, params = {} } = req.body;

    if (!capability) {
      return res.status(400).json({ error: 'Capability name is required' });
    }

    const result = await mcpServer.executeCapability(capability, req.user.id, params);
    
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('MCP execute error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message,
      execution_time_ms: 0,
    });
  }
});

module.exports = router;

