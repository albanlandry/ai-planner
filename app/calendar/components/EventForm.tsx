'use client';

import { useState, useEffect } from 'react';
import { Event, Calendar, CreateEventData, UpdateEventData, Attendee } from '@/lib/api';
import { format } from 'date-fns';
import { X } from 'lucide-react';

interface EventFormProps {
  event?: Event;
  calendars: Calendar[];
  onSave: (data: CreateEventData | UpdateEventData) => Promise<void>;
  onCancel: () => void;
  onDelete?: (eventId: string) => Promise<void>;
  defaultDate?: Date;
}

export default function EventForm({ 
  event, 
  calendars, 
  onSave, 
  onCancel,
  onDelete,
  defaultDate 
}: EventFormProps) {
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [calendarId, setCalendarId] = useState(event?.calendar_id || calendars[0]?.id || '');
  const [startTime, setStartTime] = useState(
    event?.start_time 
      ? format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm")
      : defaultDate 
        ? format(defaultDate, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [endTime, setEndTime] = useState(
    event?.end_time
      ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm")
      : defaultDate
        ? format(new Date(defaultDate.getTime() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
  );
  const [isAllDay, setIsAllDay] = useState(event?.is_all_day || false);
  const [location, setLocation] = useState(event?.location || '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!calendarId) {
      setError('Please select a calendar');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      const data: CreateEventData | UpdateEventData = {
        calendar_id: calendarId,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_all_day: isAllDay,
        location: location.trim() || undefined,
      };

      await onSave(data);
      // Form will be closed by parent component on success
      // Reset loading state - parent will close form
      setLoading(false);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save event';
      setError(errorMessage);
      setLoading(false); // Keep form open on error so user can retry
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${event.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError('');

    try {
      await onDelete(event.id);
      // Form will be closed by parent component
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {event ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="calendar" className="block text-sm font-medium text-gray-700 mb-2">
              Calendar <span className="text-red-500">*</span>
            </label>
            <select
              id="calendar"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
              disabled={loading}
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm font-medium text-gray-700">All Day Event</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                id="startTime"
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? startTime.split('T')[0] : startTime}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isAllDay) {
                    setStartTime(value + 'T00:00');
                    setEndTime(value + 'T23:59');
                  } else {
                    setStartTime(value);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                id="endTime"
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? endTime.split('T')[0] : endTime}
                onChange={(e) => {
                  const value = e.target.value;
                  if (isAllDay) {
                    setEndTime(value + 'T23:59');
                  } else {
                    setEndTime(value);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Add location"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Add description"
              disabled={loading}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            {event && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading || deleting}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Event</span>
                )}
              </button>
            )}
            <div className="flex justify-end space-x-4 ml-auto">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                disabled={loading || deleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || deleting}
              >
                {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

