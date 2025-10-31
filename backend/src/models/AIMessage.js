const { pool } = require('../config/database');

class AIMessage {
  constructor(data) {
    this.id = data.id;
    this.conversation_id = data.conversation_id;
    this.role = data.role;
    this.content = data.content;
    this.metadata = data.metadata || {};
    this.token_count = data.token_count;
    this.created_at = data.created_at;
  }

  static async create({ conversation_id, role, content, metadata = {}, token_count = null }) {
    const query = `
      INSERT INTO ai_messages (conversation_id, role, content, metadata, token_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, conversation_id, role, content, metadata, token_count, created_at
    `;
    const values = [
      conversation_id,
      role,
      content,
      JSON.stringify(metadata),
      token_count,
    ];
    const result = await pool.query(query, values);
    const row = result.rows[0];
    return new AIMessage({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    });
  }

  static async findByConversationId(conversation_id, limit = 100) {
    const query = `
      SELECT id, conversation_id, role, content, metadata, token_count, created_at
      FROM ai_messages 
      WHERE conversation_id = $1
      ORDER BY created_at ASC
      LIMIT $2
    `;
    const result = await pool.query(query, [conversation_id, limit]);
    return result.rows.map(row => new AIMessage({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    }));
  }

  static async getRecentMessages(conversation_id, count = 10) {
    const query = `
      SELECT id, conversation_id, role, content, metadata, token_count, created_at
      FROM ai_messages 
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [conversation_id, count]);
    return result.rows.reverse().map(row => new AIMessage({
      ...row,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    }));
  }

  toJSON() {
    return {
      id: this.id,
      conversation_id: this.conversation_id,
      role: this.role,
      content: this.content,
      metadata: this.metadata,
      token_count: this.token_count,
      created_at: this.created_at,
    };
  }

  // Convert to OpenAI message format
  toOpenAIMessage() {
    return {
      role: this.role,
      content: this.content,
    };
  }
}

module.exports = AIMessage;

