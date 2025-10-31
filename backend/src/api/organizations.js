const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireOrgAdmin } = require('../middleware/permissions');
const { validateRequest, organizationCreateSchema, organizationUpdateSchema, teamCreateSchema, invitationCreateSchema } = require('../middleware/validation');
const Organization = require('../models/Organization');
const Team = require('../models/Team');
const OrganizationUser = require('../models/OrganizationUser');
const Invitation = require('../models/Invitation');
const crypto = require('crypto');

const router = express.Router();

// Create organization (user becomes admin)
router.post('/', authenticateToken, validateRequest(organizationCreateSchema), async (req, res) => {
  try {
    const { name, description } = req.body;
    const org = await Organization.create({ name, description });
    await OrganizationUser.addUser({ organization_id: org.id, user_id: req.user.id, role: 'admin' });
    res.status(201).json({ organization: org.toJSON() });
  } catch (err) {
    console.error('Create organization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get organizations for current user
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const orgs = await Organization.findByUserId(req.user.id);
    res.json({ organizations: orgs.map(o => o.toJSON()) });
  } catch (err) {
    console.error('List my organizations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update organization (admin only)
router.put('/:organizationId', authenticateToken, requireOrgAdmin, validateRequest(organizationUpdateSchema), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const org = await Organization.findById(organizationId);
    if (!org) return res.status(404).json({ error: 'Organization not found' });
    const updated = await org.update(req.body);
    res.json({ organization: updated.toJSON() });
  } catch (err) {
    console.error('Update organization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create team (admin only)
router.post('/:organizationId/teams', authenticateToken, requireOrgAdmin, validateRequest(teamCreateSchema), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { name, description } = req.body;
    const team = await Team.create({ organization_id: organizationId, name, description });
    res.status(201).json({ team: team.toJSON() });
  } catch (err) {
    console.error('Create team error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite user to organization (admin only) - stub sending email; stores invitation and returns token
router.post('/:organizationId/invitations', authenticateToken, requireOrgAdmin, validateRequest(invitationCreateSchema), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { email, expires_in_hours = 72 } = req.body;
    const token = crypto.randomBytes(24).toString('hex');
    const expires_at = new Date(Date.now() + expires_in_hours * 3600 * 1000).toISOString();
    const invitation = await Invitation.create({ organization_id: organizationId, email, token, invited_by: req.user.id, expires_at });
    // In production, send email with token link here
    res.status(201).json({ invitation: { ...invitation, token } });
  } catch (err) {
    console.error('Create invitation error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

