const { pool } = require('../config/database');

class Team {
  constructor(data) {
    this.id = data.id;
    this.organization_id = data.organization_id;
    this.name = data.name;
    this.description = data.description;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ organization_id, name, description }) {
    const result = await pool.query(
      `INSERT INTO teams (organization_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, organization_id, name, description, created_at, updated_at`,
      [organization_id, name, description]
    );
    return new Team(result.rows[0]);
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT id, organization_id, name, description, created_at, updated_at
       FROM teams WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? new Team(result.rows[0]) : null;
  }

  static async findByOrganizationId(organization_id) {
    const result = await pool.query(
      `SELECT id, organization_id, name, description, created_at, updated_at
       FROM teams WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organization_id]
    );
    return result.rows.map(r => new Team(r));
  }

  async update({ name, description }) {
    const result = await pool.query(
      `UPDATE teams
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, organization_id, name, description, created_at, updated_at`,
      [name, description, this.id]
    );
    return new Team(result.rows[0]);
  }

  async delete() {
    await pool.query('DELETE FROM teams WHERE id = $1', [this.id]);
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      organization_id: this.organization_id,
      name: this.name,
      description: this.description,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Team;

