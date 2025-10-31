const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const conversationManager = require('../services/ai/conversationManager');
const AIConversation = require('../models/AIConversation');
const AIMessage = require('../models/AIMessage');
const Calendar = require('../models/Calendar');
const Task = require('../models/Task');
const Event = require('../models/Event');
const openaiService = require('../services/openaiService');

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
      const events = await Event.findByUserIdAndDateRange(
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

    // Process message
    const startTime = Date.now();
    let response;
    let error = null;

    try {
      response = await conversationManager.processMessage(
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

      const executionTime = Date.now() - startTime;

      // Log interaction (async, don't wait)
      // TODO: Implement interaction logging

      res.json({
        message: response.message,
        conversation_id: response.conversation_id,
        token_usage: response.tokenUsage,
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

module.exports = router;

