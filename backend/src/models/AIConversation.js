const { pool } = require('../config/database');

class AIConversation {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.title = data.title;
    this.context = data.context || {};
    this.message_count = data.message_count || 0;
    this.last_message_at = data.last_message_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ user_id, title = null, context = {} }) {
    const query = `
      INSERT INTO ai_conversations (user_id, title, context)
      VALUES ($1, $2, $3)
      RETURNING id, user_id, title, context, message_count, last_message_at, created_at, updated_at
    `;
    const values = [user_id, title, JSON.stringify(context)];
    const result = await pool.query(query, values);
    const row = result.rows[0];
    return new AIConversation({
      ...row,
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
    });
  }

  static async findById(id) {
    const query = `
      SELECT id, user_id, title, context, message_count, last_message_at, created_at, updated_at
      FROM ai_conversations WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return new AIConversation({
      ...row,
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
    });
  }

  static async findByUserId(user_id, limit = 50) {
    const query = `
      SELECT id, user_id, title, context, message_count, last_message_at, created_at, updated_at
      FROM ai_conversations 
      WHERE user_id = $1
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [user_id, limit]);
    return result.rows.map(row => new AIConversation({
      ...row,
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
    }));
  }

  static async findActiveByUserId(user_id) {
    // Find the most recent active conversation (has messages in last 24 hours)
    const query = `
      SELECT id, user_id, title, context, message_count, last_message_at, created_at, updated_at
      FROM ai_conversations 
      WHERE user_id = $1 
        AND last_message_at > NOW() - INTERVAL '24 hours'
      ORDER BY last_message_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [user_id]);
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return new AIConversation({
      ...row,
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
    });
  }

  async update({ title, context }) {
    const query = `
      UPDATE ai_conversations 
      SET title = COALESCE($1, title),
          context = COALESCE($2::jsonb, context),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, user_id, title, context, message_count, last_message_at, created_at, updated_at
    `;
    const values = [title, context ? JSON.stringify(context) : null, this.id];
    const result = await pool.query(query, values);
    const row = result.rows[0];
    return new AIConversation({
      ...row,
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
    });
  }

  async incrementMessageCount() {
    const query = `
      UPDATE ai_conversations 
      SET message_count = message_count + 1,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING message_count, last_message_at
    `;
    const result = await pool.query(query, [this.id]);
    this.message_count = result.rows[0].message_count;
    this.last_message_at = result.rows[0].last_message_at;
    return this;
  }

  async delete() {
    const query = 'DELETE FROM ai_conversations WHERE id = $1';
    await pool.query(query, [this.id]);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      title: this.title,
      context: this.context,
      message_count: this.message_count,
      last_message_at: this.last_message_at,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = AIConversation;

