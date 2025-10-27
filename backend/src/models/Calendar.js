const { pool } = require('../config/database');

class Calendar {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.color = data.color;
    this.is_primary = data.is_primary;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ user_id, name, color = '#3B82F6', is_primary = false }) {
    const query = `
      INSERT INTO calendars (user_id, name, color, is_primary)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, name, color, is_primary, created_at, updated_at
    `;
    const values = [user_id, name, color, is_primary];
    
    const result = await pool.query(query, values);
    return new Calendar(result.rows[0]);
  }

  static async findByUserId(user_id) {
    const query = `
      SELECT id, user_id, name, color, is_primary, created_at, updated_at
      FROM calendars WHERE user_id = $1
      ORDER BY is_primary DESC, created_at ASC
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows.map(row => new Calendar(row));
  }

  static async findById(id) {
    const query = `
      SELECT id, user_id, name, color, is_primary, created_at, updated_at
      FROM calendars WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new Calendar(result.rows[0]) : null;
  }

  static async findByIdAndUserId(id, user_id) {
    const query = `
      SELECT c.id, c.user_id, c.name, c.color, c.is_primary, c.created_at, c.updated_at
      FROM calendars c
      LEFT JOIN calendar_permissions cp ON c.id = cp.calendar_id
      WHERE c.id = $1 AND (c.user_id = $2 OR cp.user_id = $2)
    `;
    const result = await pool.query(query, [id, user_id]);
    return result.rows[0] ? new Calendar(result.rows[0]) : null;
  }

  async update({ name, color, is_primary }) {
    const query = `
      UPDATE calendars 
      SET name = COALESCE($1, name),
          color = COALESCE($2, color),
          is_primary = COALESCE($3, is_primary),
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, user_id, name, color, is_primary, created_at, updated_at
    `;
    const values = [name, color, is_primary, this.id];
    const result = await pool.query(query, values);
    return new Calendar(result.rows[0]);
  }

  async delete() {
    const query = 'DELETE FROM calendars WHERE id = $1';
    await pool.query(query, [this.id]);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      name: this.name,
      color: this.color,
      is_primary: this.is_primary,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Calendar;