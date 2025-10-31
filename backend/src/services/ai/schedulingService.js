/**
 * Scheduling Service - Smart scheduling, conflict detection, and availability analysis
 */

const Event = require('../../models/Event');
const chrono = require('chrono-node');

/**
 * Detect conflicts for a proposed event time
 * @param {String} user_id - User ID
 * @param {String} startTime - Proposed start time (ISO)
 * @param {String} endTime - Proposed end time (ISO)
 * @param {String} excludeEventId - Event ID to exclude from conflict check (for updates)
 * @returns {Promise<Object>} - Conflict information
 */
async function detectConflicts(user_id, startTime, endTime, excludeEventId = null) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // Fetch user's events in the time range
  const events = await Event.findByUserId(user_id, startTime, endTime);

  // Filter out the event being updated (if any)
  const relevantEvents = excludeEventId
    ? events.filter(e => e.id !== excludeEventId)
    : events;

  // Find overlapping events
  const conflicts = relevantEvents.filter(event => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    
    // Check for overlap: proposed event overlaps with existing event
    return (
      (start < eventEnd && end > eventStart) ||
      (eventStart < end && eventEnd > start)
    );
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts: conflicts.map(e => ({
      id: e.id,
      title: e.title,
      start_time: e.start_time,
      end_time: e.end_time,
      calendar_name: e.calendar_name,
    })),
    conflictCount: conflicts.length,
  };
}

/**
 * Find available time slots in a date range
 * @param {String} user_id - User ID
 * @param {String} startDate - Start of date range (ISO)
 * @param {String} endDate - End of date range (ISO)
 * @param {Number} durationMinutes - Desired duration in minutes (default: 60)
 * @param {Array} preferredHours - Preferred hours of day [9, 10, 11, ...] (default: business hours)
 * @returns {Promise<Array>} - Array of available time slots
 */
async function findAvailableSlots(
  user_id,
  startDate,
  endDate,
  durationMinutes = 60,
  preferredHours = [9, 10, 11, 14, 15, 16, 17]
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Fetch all events in the range
  const events = await Event.findByUserId(user_id, startDate, endDate);
  
  // Group events by date
  const eventsByDate = {};
  events.forEach(event => {
    const eventDate = new Date(event.start_time).toISOString().split('T')[0];
    if (!eventsByDate[eventDate]) {
      eventsByDate[eventDate] = [];
    }
    eventsByDate[eventDate].push(event);
  });

  const availableSlots = [];
  const currentDate = new Date(start);
  
  // Iterate through each day in the range
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayEvents = eventsByDate[dateStr] || [];
    
    // Sort events by start time
    dayEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    // Check available slots for preferred hours
    preferredHours.forEach(hour => {
      const slotStart = new Date(currentDate);
      slotStart.setHours(hour, 0, 0, 0);
      
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);
      
      // Skip if slot is in the past
      if (slotStart < new Date()) {
        return;
      }
      
      // Check if slot conflicts with any event
      const hasConflict = dayEvents.some(event => {
        const eventStart = new Date(event.start_time);
        const eventEnd = new Date(event.end_time);
        return (
          (slotStart < eventEnd && slotEnd > eventStart) ||
          (eventStart < slotEnd && eventEnd > slotStart)
        );
      });
      
      if (!hasConflict) {
        availableSlots.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          date: dateStr,
          hour,
        });
      }
    });
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(0, 0, 0, 0);
  }
  
  return availableSlots.slice(0, 10); // Limit to top 10 suggestions
}

/**
 * Suggest optimal meeting time
 * @param {String} user_id - User ID
 * @param {String} durationMinutes - Meeting duration in minutes
 * @param {String} preferredDate - Preferred date (ISO or natural language)
 * @param {Array} preferredTimes - Preferred times (e.g., ['morning', 'afternoon', '2pm'])
 * @returns {Promise<Object>} - Suggested time slots
 */
async function suggestMeetingTime(user_id, durationMinutes = 60, preferredDate = null, preferredTimes = []) {
  const now = new Date();
  let startDate = now;
  let endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days

  // Parse preferred date
  if (preferredDate) {
    const parsed = chrono.parseDate(preferredDate, now);
    if (parsed) {
      startDate = parsed;
      endDate = new Date(parsed.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours from preferred date
    }
  }

  // Map preferred times to hours
  const hourMap = {
    morning: [9, 10, 11],
    afternoon: [14, 15, 16],
    evening: [17, 18, 19],
  };

  let preferredHours = [9, 10, 11, 14, 15, 16, 17]; // Default: business hours

  if (preferredTimes.length > 0) {
    preferredHours = [];
    preferredTimes.forEach(time => {
      const lower = time.toLowerCase();
      
      // Check hour map
      if (hourMap[lower]) {
        preferredHours.push(...hourMap[lower]);
      }
      // Try to extract hour from "2pm", "14:00", etc.
      else {
        const hourMatch = time.match(/(\d+)(?:pm|am|:00)?/i);
        if (hourMatch) {
          let hour = parseInt(hourMatch[1]);
          if (time.toLowerCase().includes('pm') && hour < 12) {
            hour += 12;
          }
          if (hour >= 9 && hour <= 18) {
            preferredHours.push(hour);
          }
        }
      }
    });
    
    // Remove duplicates and sort
    preferredHours = [...new Set(preferredHours)].sort((a, b) => a - b);
    
    if (preferredHours.length === 0) {
      preferredHours = [9, 10, 11, 14, 15, 16, 17]; // Fallback to default
    }
  }

  const slots = await findAvailableSlots(
    user_id,
    startDate.toISOString(),
    endDate.toISOString(),
    durationMinutes,
    preferredHours
  );

  return {
    suggestions: slots,
    count: slots.length,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
}

module.exports = {
  detectConflicts,
  findAvailableSlots,
  suggestMeetingTime,
};

