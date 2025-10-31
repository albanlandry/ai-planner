const express = require('express');
const Calendar = require('../models/Calendar');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, calendarCreateSchema, calendarUpdateSchema } = require('../middleware/validation');

const router = express.Router();

// Get all calendars for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const calendars = await Calendar.findByUserId(req.user.id);
    res.json({
      calendars: calendars.map(cal => cal.toJSON())
    });
  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific calendar by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = await Calendar.findByIdAndUserId(id, req.user.id);

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    res.json({
      calendar: calendar.toJSON()
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new calendar
router.post('/', authenticateToken, validateRequest(calendarCreateSchema), async (req, res) => {
  try {
    const { name, color, is_primary = false } = req.body;

    const calendar = await Calendar.create({
      user_id: req.user.id,
      name: name.trim(),
      color: color || '#3B82F6',
      is_primary: Boolean(is_primary)
    });

    res.status(201).json({
      message: 'Calendar created successfully',
      calendar: calendar.toJSON()
    });
  } catch (error) {
    console.error('Create calendar error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create calendar. Please try again.' 
    });
  }
});

// Update calendar
router.put('/:id', authenticateToken, validateRequest(calendarUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = await Calendar.findByIdAndUserId(id, req.user.id);

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    const updatedCalendar = await calendar.update(req.body);

    res.json({
      message: 'Calendar updated successfully',
      calendar: updatedCalendar.toJSON()
    });
  } catch (error) {
    console.error('Update calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete calendar
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const calendar = await Calendar.findByIdAndUserId(id, req.user.id);

    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    await calendar.delete();

    res.json({
      message: 'Calendar deleted successfully'
    });
  } catch (error) {
    console.error('Delete calendar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;