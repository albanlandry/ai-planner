const { pool } = require('../config/database');

class OrganizationUser {
  constructor(data) {
    this.organization_id = data.organization_id;
    this.user_id = data.user_id;
    this.role = data.role;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async addUser({ organization_id, user_id, role = 'member' }) {
    const result = await pool.query(
      `INSERT INTO organization_users (organization_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (organization_id, user_id)
       DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
       RETURNING organization_id, user_id, role, created_at, updated_at`,
      [organization_id, user_id, role]
    );
    return new OrganizationUser(result.rows[0]);
  }

  static async isAdmin(organization_id, user_id) {
    const result = await pool.query(
      `SELECT 1 FROM organization_users
       WHERE organization_id = $1 AND user_id = $2 AND role = 'admin'`,
      [organization_id, user_id]
    );
    return result.rowCount > 0;
  }
}

module.exports = OrganizationUser;

