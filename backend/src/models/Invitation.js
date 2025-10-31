const { pool } = require('../config/database');

class Invitation {
  constructor(data) {
    this.id = data.id;
    this.organization_id = data.organization_id;
    this.email = data.email;
    this.token = data.token;
    this.status = data.status;
    this.invited_by = data.invited_by;
    this.expires_at = data.expires_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ organization_id, email, token, invited_by, expires_at }) {
    const result = await pool.query(
      `INSERT INTO organization_invitations (organization_id, email, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, organization_id, email, token, status, invited_by, expires_at, created_at, updated_at`,
      [organization_id, email, token, invited_by, expires_at]
    );
    return new Invitation(result.rows[0]);
  }

  static async findByToken(token) {
    const result = await pool.query(
      `SELECT id, organization_id, email, token, status, invited_by, expires_at, created_at, updated_at
       FROM organization_invitations WHERE token = $1`,
      [token]
    );
    return result.rows[0] ? new Invitation(result.rows[0]) : null;
  }

  async markAccepted() {
    const result = await pool.query(
      `UPDATE organization_invitations
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1
       RETURNING id, organization_id, email, token, status, invited_by, expires_at, created_at, updated_at`,
      [this.id]
    );
    return new Invitation(result.rows[0]);
  }
}

module.exports = Invitation;

