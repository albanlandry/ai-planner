const express = require('express');
const Event = require('../models/Event');
const Calendar = require('../models/Calendar');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, eventCreateSchema, eventUpdateSchema } = require('../middleware/validation');

const router = express.Router();

// Get events for a specific date range
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, calendar_id } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'start_date and end_date query parameters are required' 
      });
    }

    let events;
    if (calendar_id) {
      // Verify user has access to this calendar
      const calendar = await Calendar.findByIdAndUserId(calendar_id, req.user.id);
      if (!calendar) {
        return res.status(404).json({ error: 'Calendar not found' });
      }
      events = await Event.findByCalendarId(calendar_id, start_date, end_date);
    } else {
      // Get events from all user's calendars
      events = await Event.findByUserId(req.user.id, start_date, end_date);
    }

    res.json({
      events: events.map(event => event.toJSON())
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific event by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndUserId(id, req.user.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({
      event: event.toJSON()
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new event
router.post('/', authenticateToken, validateRequest(eventCreateSchema), async (req, res) => {
  try {
    const { calendar_id, ...eventData } = req.body;

    // Verify user has access to this calendar
    const calendar = await Calendar.findByIdAndUserId(calendar_id, req.user.id);
    if (!calendar) {
      return res.status(404).json({ error: 'Calendar not found' });
    }

    const event = await Event.create({
      calendar_id,
      ...eventData
    });

    res.status(201).json({
      message: 'Event created successfully',
      event: event.toJSON()
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update event
router.put('/:id', authenticateToken, validateRequest(eventUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndUserId(id, req.user.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // If updating calendar_id, verify access to new calendar
    if (req.body.calendar_id && req.body.calendar_id !== event.calendar_id) {
      const calendar = await Calendar.findByIdAndUserId(req.body.calendar_id, req.user.id);
      if (!calendar) {
        return res.status(404).json({ error: 'Target calendar not found' });
      }
    }

    const updatedEvent = await event.update(req.body);

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent.toJSON()
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndUserId(id, req.user.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await event.delete();

    res.json({
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate event
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const originalEvent = await Event.findByIdAndUserId(id, req.user.id);

    if (!originalEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Create a copy of the event
    const duplicatedEvent = await Event.create({
      calendar_id: originalEvent.calendar_id,
      title: `${originalEvent.title} (Copy)`,
      description: originalEvent.description,
      start_time: originalEvent.start_time,
      end_time: originalEvent.end_time,
      is_all_day: originalEvent.is_all_day,
      location: originalEvent.location,
      attendees: originalEvent.attendees,
      recurrence_rule: originalEvent.recurrence_rule
    });

    res.status(201).json({
      message: 'Event duplicated successfully',
      event: duplicatedEvent.toJSON()
    });
  } catch (error) {
    console.error('Duplicate event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;