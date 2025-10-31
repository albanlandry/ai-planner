const { pool } = require('../config/database');

class Organization {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ name, description }) {
    const result = await pool.query(
      `INSERT INTO organizations (name, description)
       VALUES ($1, $2)
       RETURNING id, name, description, created_at, updated_at`,
      [name, description]
    );
    return new Organization(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, name, description, created_at, updated_at
       FROM organizations WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? new Organization(result.rows[0]) : null;
  }

  static async findByUserId(user_id) {
    const result = await pool.query(
      `SELECT o.id, o.name, o.description, o.created_at, o.updated_at
       FROM organizations o
       JOIN organization_users ou ON ou.organization_id = o.id
       WHERE ou.user_id = $1
       ORDER BY o.created_at DESC`,
      [user_id]
    );
    return result.rows.map(r => new Organization(r));
  }

  async update({ name, description }) {
    const result = await pool.query(
      `UPDATE organizations
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, description, created_at, updated_at`,
      [name, description, this.id]
    );
    return new Organization(result.rows[0]);
  }

  async delete() {
    await pool.query('DELETE FROM organizations WHERE id = $1', [this.id]);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Organization;

