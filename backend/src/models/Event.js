const { pool } = require('../config/database');

class Event {
  constructor(data) {
    this.id = data.id;
    this.calendar_id = data.calendar_id;
    this.title = data.title;
    this.description = data.description;
    this.start_time = data.start_time;
    this.end_time = data.end_time;
    this.is_all_day = data.is_all_day;
    this.location = data.location;
    this.attendees = data.attendees;
    this.recurrence_rule = data.recurrence_rule;
    this.calendar_name = data.calendar_name;
    this.calendar_color = data.calendar_color;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({
    calendar_id,
    title,
    description,
    start_time,
    end_time,
    is_all_day = false,
    location,
    attendees,
    recurrence_rule
  }) {
    const query = `
      INSERT INTO events (calendar_id, title, description, start_time, end_time, is_all_day, location, attendees, recurrence_rule)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, calendar_id, title, description, start_time, end_time, is_all_day, location, attendees, recurrence_rule, created_at, updated_at
    `;
    const values = [
      calendar_id,
      title,
      description,
      start_time,
      end_time,
      is_all_day,
      location,
      attendees ? JSON.stringify(attendees) : null,
      recurrence_rule ? JSON.stringify(recurrence_rule) : null
    ];
    
    const result = await pool.query(query, values);
    return new Event(result.rows[0]);
  }

  static async findByCalendarId(calendar_id, start_date, end_date) {
    const query = `
      SELECT e.id, e.calendar_id, e.title, e.description, e.start_time, e.end_time, 
             e.is_all_day, e.location, e.attendees, e.recurrence_rule, e.created_at, e.updated_at,
             c.name as calendar_name, c.color as calendar_color
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      WHERE e.calendar_id = $1 
        AND e.start_time >= $2 
        AND e.end_time <= $3
      ORDER BY e.start_time ASC
    `;
    const result = await pool.query(query, [calendar_id, start_date, end_date]);
    return result.rows.map(row => new Event(row));
  }

  static async findByUserId(user_id, start_date, end_date) {
    const query = `
      SELECT e.id, e.calendar_id, e.title, e.description, e.start_time, e.end_time, 
             e.is_all_day, e.location, e.attendees, e.recurrence_rule, e.created_at, e.updated_at,
             c.name as calendar_name, c.color as calendar_color
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      LEFT JOIN calendar_permissions cp ON c.id = cp.calendar_id
      WHERE (c.user_id = $1 OR cp.user_id = $1)
        AND e.start_time >= $2 
        AND e.end_time <= $3
      ORDER BY e.start_time ASC
    `;
    const result = await pool.query(query, [user_id, start_date, end_date]);
    return result.rows.map(row => new Event(row));
  }

  static async findById(id) {
    const query = `
      SELECT e.id, e.calendar_id, e.title, e.description, e.start_time, e.end_time, 
             e.is_all_day, e.location, e.attendees, e.recurrence_rule, e.created_at, e.updated_at,
             c.name as calendar_name, c.color as calendar_color
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      WHERE e.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new Event(result.rows[0]) : null;
  }

  static async findByIdAndUserId(id, user_id) {
    const query = `
      SELECT e.id, e.calendar_id, e.title, e.description, e.start_time, e.end_time, 
             e.is_all_day, e.location, e.attendees, e.recurrence_rule, e.created_at, e.updated_at,
             c.name as calendar_name, c.color as calendar_color
      FROM events e
      JOIN calendars c ON e.calendar_id = c.id
      LEFT JOIN calendar_permissions cp ON c.id = cp.calendar_id
      WHERE e.id = $1 AND (c.user_id = $2 OR cp.user_id = $2)
    `;
    const result = await pool.query(query, [id, user_id]);
    return result.rows[0] ? new Event(result.rows[0]) : null;
  }

  async update({
    title,
    description,
    start_time,
    end_time,
    is_all_day,
    location,
    attendees,
    recurrence_rule
  }) {
    const query = `
      UPDATE events 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          start_time = COALESCE($3, start_time),
          end_time = COALESCE($4, end_time),
          is_all_day = COALESCE($5, is_all_day),
          location = COALESCE($6, location),
          attendees = COALESCE($7, attendees),
          recurrence_rule = COALESCE($8, recurrence_rule),
          updated_at = NOW()
      WHERE id = $9
      RETURNING id, calendar_id, title, description, start_time, end_time, is_all_day, location, attendees, recurrence_rule, created_at, updated_at
    `;
    const values = [
      title,
      description,
      start_time,
      end_time,
      is_all_day,
      location,
      attendees ? JSON.stringify(attendees) : attendees,
      recurrence_rule ? JSON.stringify(recurrence_rule) : recurrence_rule,
      this.id
    ];
    const result = await pool.query(query, values);
    return new Event(result.rows[0]);
  }

  async delete() {
    const query = 'DELETE FROM events WHERE id = $1';
    await pool.query(query, [this.id]);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      calendar_id: this.calendar_id,
      title: this.title,
      description: this.description,
      start_time: this.start_time,
      end_time: this.end_time,
      is_all_day: this.is_all_day,
      location: this.location,
      attendees: this.attendees,
      recurrence_rule: this.recurrence_rule,
      calendar_name: this.calendar_name,
      calendar_color: this.calendar_color,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Event;