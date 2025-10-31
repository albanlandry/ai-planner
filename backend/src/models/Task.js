const { pool } = require('../config/database');

class Task {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.title = data.title;
    this.description = data.description;
    this.status = data.status;
    this.priority = data.priority;
    this.due_date = data.due_date;
    this.completed_at = data.completed_at;
    this.calendar_id = data.calendar_id;
    this.organization_id = data.organization_id;
    this.team_id = data.team_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({
    user_id,
    title,
    description,
    status = 'todo',
    priority = 'medium',
    due_date,
    calendar_id,
    organization_id,
    team_id
  }) {
    const query = `
      INSERT INTO tasks (user_id, title, description, status, priority, due_date, calendar_id, organization_id, team_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, user_id, title, description, status, priority, due_date, completed_at, calendar_id, organization_id, team_id, created_at, updated_at
    `;
    const values = [user_id, title, description, status, priority, due_date || null, calendar_id || null, organization_id || null, team_id || null];
    
    const result = await pool.query(query, values);
    return new Task(result.rows[0]);
  }

  static async findById(id) {
    const query = `
      SELECT id, user_id, title, description, status, priority, due_date, completed_at, calendar_id, organization_id, team_id, created_at, updated_at
      FROM tasks WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new Task(result.rows[0]) : null;
  }

  static async findByUserId(user_id, filters = {}) {
    let query = `
      SELECT id, user_id, title, description, status, priority, due_date, completed_at, calendar_id, organization_id, team_id, created_at, updated_at
      FROM tasks WHERE user_id = $1
    `;
    const values = [user_id];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      query += ` AND priority = $${paramIndex}`;
      values.push(filters.priority);
      paramIndex++;
    }

    if (filters.calendar_id) {
      query += ` AND calendar_id = $${paramIndex}`;
      values.push(filters.calendar_id);
      paramIndex++;
    }

    // Order by: due_date (nulls last), priority (high first), created_at (newest first)
    query += ` ORDER BY 
      CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
      due_date ASC,
      CASE priority 
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows.map(row => new Task(row));
  }

  static async findByIdAndUserId(id, user_id) {
    const query = `
      SELECT id, user_id, title, description, status, priority, due_date, completed_at, calendar_id, organization_id, team_id, created_at, updated_at
      FROM tasks WHERE id = $1 AND user_id = $2
    `;
    const result = await pool.query(query, [id, user_id]);
    return result.rows[0] ? new Task(result.rows[0]) : null;
  }

  async update({
    title,
    description,
    status,
    priority,
    due_date,
    calendar_id,
    organization_id,
    team_id
  }) {
    // If status is being changed to 'done', set completed_at
    // If status is being changed from 'done' to something else, clear completed_at
    let completedAtUpdate = '';
    if (status === 'done' && this.status !== 'done') {
      completedAtUpdate = ', completed_at = NOW()';
    } else if (status !== 'done' && this.status === 'done') {
      completedAtUpdate = ', completed_at = NULL';
    }

    const query = `
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          status = COALESCE($3, status),
          priority = COALESCE($4, priority),
          due_date = COALESCE($5, due_date),
          calendar_id = COALESCE($6, calendar_id),
          organization_id = COALESCE($7, organization_id),
          team_id = COALESCE($8, team_id),
          updated_at = NOW()
          ${completedAtUpdate}
      WHERE id = $9
      RETURNING id, user_id, title, description, status, priority, due_date, completed_at, calendar_id, organization_id, team_id, created_at, updated_at
    `;
    const values = [
      title,
      description,
      status,
      priority,
      due_date || null,
      calendar_id || null,
      organization_id || null,
      team_id || null,
      this.id
    ];
    const result = await pool.query(query, values);
    return new Task(result.rows[0]);
  }

  async delete() {
    const query = 'DELETE FROM tasks WHERE id = $1';
    await pool.query(query, [this.id]);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      title: this.title,
      description: this.description,
      status: this.status,
      priority: this.priority,
      due_date: this.due_date,
      completed_at: this.completed_at,
      calendar_id: this.calendar_id,
      organization_id: this.organization_id,
      team_id: this.team_id,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Task;

