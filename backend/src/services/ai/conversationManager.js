const AIConversation = require('../../models/AIConversation');
const AIMessage = require('../../models/AIMessage');
const openaiService = require('../openaiService');
const { getSystemPrompt, buildContextualPrompt } = require('../../prompts/systemPrompts');

class ConversationManager {
  /**
   * Get or create active conversation for user
   * @param {String} user_id - User ID
   * @param {String} conversation_id - Optional existing conversation ID
   * @returns {Promise<AIConversation>} - Conversation object
   */
  async getOrCreateConversation(user_id, conversation_id = null) {
    if (conversation_id) {
      const conversation = await AIConversation.findById(conversation_id);
      if (conversation && conversation.user_id === user_id) {
        return conversation;
      }
    }

    // Try to find active conversation (last 24 hours)
    let conversation = await AIConversation.findActiveByUserId(user_id);
    
    if (!conversation) {
      // Create new conversation
      conversation = await AIConversation.create({
        user_id,
        title: null,
        context: {},
      });
    }

    return conversation;
  }

  /**
   * Get conversation history as OpenAI messages format
   * @param {String} conversation_id - Conversation ID
   * @param {Number} maxMessages - Maximum messages to retrieve
   * @returns {Promise<Array>} - Array of messages in OpenAI format
   */
  async getMessageHistory(conversation_id, maxMessages = 50) {
    const messages = await AIMessage.findByConversationId(conversation_id, maxMessages);
    return messages.map(msg => msg.toOpenAIMessage());
  }

  /**
   * Add message to conversation
   * @param {String} conversation_id - Conversation ID
   * @param {String} role - Message role (system, user, assistant)
   * @param {String} content - Message content
   * @param {Object} metadata - Optional metadata
   * @param {Number} token_count - Optional token count
   * @returns {Promise<AIMessage>} - Created message
   */
  async addMessage(conversation_id, role, content, metadata = {}, token_count = null) {
    const message = await AIMessage.create({
      conversation_id,
      role,
      content,
      metadata,
      token_count,
    });

    // Update conversation message count and last message time
    const conversation = await AIConversation.findById(conversation_id);
    if (conversation) {
      await conversation.incrementMessageCount();
    }

    return message;
  }

  /**
   * Process user message and get AI response
   * @param {String} user_id - User ID
   * @param {String} message - User message
   * @param {String} conversation_id - Optional conversation ID
   * @param {Object} context - Optional context (calendars, events, tasks)
   * @param {Object} options - OpenAI API options
   * @returns {Promise<Object>} - Response with message and conversation info
   */
  async processMessage(user_id, message, conversation_id = null, context = {}, options = {}) {
    // Get or create conversation
    const conversation = await this.getOrCreateConversation(user_id, conversation_id);

    // Build messages array for OpenAI
    const messages = [];

    // Add system prompt with context
    const systemPrompt = buildContextualPrompt(context, options.promptType || 'ASSISTANT');
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // Get conversation history (excluding system messages)
    const history = await this.getMessageHistory(conversation.id, 20);
    const userHistory = history.filter(msg => msg.role !== 'system');
    
    // Add recent history (truncate if too long)
    const maxTokens = options.maxTokens || 2000;
    const truncatedHistory = openaiService.truncateMessages(userHistory, maxTokens - 500);
    messages.push(...truncatedHistory);

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Save user message
    const userMessageTokenCount = openaiService.estimateTokens(message);
    await this.addMessage(
      conversation.id,
      'user',
      message,
      { intent: options.intent || null },
      userMessageTokenCount
    );

    // Get AI response
    let aiResponse;
    let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    try {
      const response = await openaiService.chatCompletion(messages, {
        model: options.model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        ...options,
      });

      aiResponse = response.content;
      tokenUsage = response.usage;

      // Save assistant message
      await this.addMessage(
        conversation.id,
        'assistant',
        aiResponse,
        {
          model: response.model,
          finishReason: response.finishReason,
          functionCall: response.functionCall,
        },
        tokenUsage.completionTokens
      );
    } catch (error) {
      // Save error message
      await this.addMessage(
        conversation.id,
        'assistant',
        `I apologize, but I encountered an error: ${error.message}. Please try again.`,
        { error: error.message },
        null
      );
      throw error;
    }

    return {
      message: aiResponse,
      conversation_id: conversation.id,
      tokenUsage,
    };
  }

  /**
   * Get user's conversation history
   * @param {String} user_id - User ID
   * @param {Number} limit - Maximum conversations to return
   * @returns {Promise<Array>} - Array of conversations
   */
  async getUserConversations(user_id, limit = 50) {
    return await AIConversation.findByUserId(user_id, limit);
  }

  /**
   * Delete conversation
   * @param {String} conversation_id - Conversation ID
   * @param {String} user_id - User ID (for authorization)
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteConversation(conversation_id, user_id) {
    const conversation = await AIConversation.findById(conversation_id);
    if (!conversation || conversation.user_id !== user_id) {
      return false;
    }
    return await conversation.delete();
  }
}

module.exports = new ConversationManager();

