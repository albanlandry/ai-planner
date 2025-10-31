const OpenAI = require('openai');
require('dotenv').config();

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('Warning: OPENAI_API_KEY not found in environment variables');
      this.client = null;
      this.enabled = false;
    } else {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      this.enabled = true;
      this.defaultModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 1000;
    }
  }

  /**
   * Check if OpenAI service is enabled
   */
  isEnabled() {
    return this.enabled && this.client !== null;
  }

  /**
   * Generate a chat completion
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Optional parameters (model, temperature, max_tokens, etc.)
   * @returns {Promise<Object>} - Response object with content and metadata
   */
  async chatCompletion(messages, options = {}) {
    if (!this.isEnabled()) {
      throw new Error('OpenAI service is not enabled. Please configure OPENAI_API_KEY.');
    }

    const {
      model = this.defaultModel,
      temperature = 0.7,
      max_tokens = this.maxTokens,
      stream = false,
      functions = null,
      function_call = null,
    } = options;

    try {
      const params = {
        model,
        messages,
        temperature,
        max_tokens,
      };

      if (functions) {
        params.functions = functions;
        params.function_call = function_call || 'auto';
      }

      if (stream) {
        // Return stream for streaming responses
        return await this.client.chat.completions.create({
          ...params,
          stream: true,
        });
      }

      const response = await this.client.chat.completions.create(params);
      
      return {
        content: response.choices[0].message.content,
        role: response.choices[0].message.role,
        finishReason: response.choices[0].finish_reason,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        functionCall: response.choices[0].message.function_call || null,
      };
    } catch (error) {
      // Handle OpenAI API errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 401) {
          throw new Error('Invalid OpenAI API key');
        } else if (status === 429) {
          throw new Error('OpenAI API rate limit exceeded. Please try again later.');
        } else if (status === 500) {
          throw new Error('OpenAI API server error. Please try again later.');
        } else if (status === 503) {
          throw new Error('OpenAI API service unavailable. Please try again later.');
        } else {
          throw new Error(`OpenAI API error: ${errorData.error?.message || error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Estimate token count for text (rough estimate)
   * @param {String} text - Text to estimate
   * @returns {Number} - Estimated token count
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate messages to fit within token limit
   * @param {Array} messages - Array of message objects
   * @param {Number} maxTokens - Maximum tokens allowed
   * @returns {Array} - Truncated messages array
   */
  truncateMessages(messages, maxTokens) {
    const truncated = [];
    let totalTokens = 0;

    // Process messages in reverse order (keep most recent)
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = this.estimateTokens(
        (message.content || '') + (message.name || '')
      );

      if (totalTokens + messageTokens <= maxTokens) {
        truncated.unshift(message);
        totalTokens += messageTokens;
      } else {
        break;
      }
    }

    return truncated;
  }

  /**
   * Generate embeddings (if needed for semantic search)
   * @param {String} text - Text to embed
   * @param {String} model - Embedding model (default: text-embedding-ada-002)
   * @returns {Promise<Array>} - Embedding vector
   */
  async generateEmbedding(text, model = 'text-embedding-ada-002') {
    if (!this.isEnabled()) {
      throw new Error('OpenAI service is not enabled.');
    }

    try {
      const response = await this.client.embeddings.create({
        model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      if (error.response) {
        throw new Error(`OpenAI embedding error: ${error.response.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new OpenAIService();

