const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.avatar_url = data.avatar_url;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ email, name, password }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (email, name, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, name, avatar_url, created_at, updated_at
    `;
    const values = [email, name, hashedPassword];
    
    const result = await pool.query(query, values);
    return new User(result.rows[0]);
  }

  static async findByEmail(email) {
    const query = `
      SELECT id, email, name, password_hash, avatar_url, created_at, updated_at
      FROM users WHERE email = $1
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async findById(id) {
    const query = `
      SELECT id, email, name, avatar_url, created_at, updated_at
      FROM users WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  async validatePassword(password) {
    const query = 'SELECT password_hash FROM users WHERE id = $1';
    const result = await pool.query(query, [this.id]);
    return await bcrypt.compare(password, result.rows[0].password_hash);
  }

  async update({ name, avatar_url }) {
    const query = `
      UPDATE users 
      SET name = COALESCE($1, name), 
          avatar_url = COALESCE($2, avatar_url),
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, email, name, avatar_url, created_at, updated_at
    `;
    const values = [name, avatar_url, this.id];
    const result = await pool.query(query, values);
    return new User(result.rows[0]);
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar_url: this.avatar_url,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;