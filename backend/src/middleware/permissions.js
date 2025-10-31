const OrganizationUser = require('../models/OrganizationUser');

async function requireOrgAdmin(req, res, next) {
  try {
    const organizationId = req.params.organizationId || req.body.organization_id;
    if (!organizationId) {
      return res.status(400).json({ error: 'organization_id is required' });
    }
    const isAdmin = await OrganizationUser.isAdmin(organizationId, req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    next();
  } catch (err) {
    console.error('requireOrgAdmin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { requireOrgAdmin };

