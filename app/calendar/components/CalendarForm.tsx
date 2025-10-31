'use client';

import { useState } from 'react';
import { Calendar as CalendarType, CreateCalendarData, UpdateCalendarData } from '@/lib/api';
import { X } from 'lucide-react';

interface CalendarFormProps {
  calendar?: CalendarType;
  onSave: (data: CreateCalendarData | UpdateCalendarData) => Promise<void>;
  onCancel: () => void;
}

const CALENDAR_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export default function CalendarForm({ calendar, onSave, onCancel }: CalendarFormProps) {
  const [name, setName] = useState(calendar?.name || '');
  const [color, setColor] = useState(calendar?.color || CALENDAR_COLORS[0]);
  const [isPrimary, setIsPrimary] = useState(calendar?.is_primary || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('Calendar name is required');
      return;
    }

    setLoading(true);
    try {
      const data: CreateCalendarData | UpdateCalendarData = {
        name: name.trim(),
        color,
        is_primary: isPrimary,
      };

      await onSave(data);
      // Form will be closed by parent component on success
      // Reset loading state - parent will close form
      setLoading(false);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save calendar';
      setError(errorMessage);
      setLoading(false); // Keep form open on error so user can retry
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {calendar ? 'Edit Calendar' : 'Create Calendar'}
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
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Calendar Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="My Calendar"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-3">
              {CALENDAR_COLORS.map((calColor) => (
                <button
                  key={calColor}
                  type="button"
                  onClick={() => setColor(calColor)}
                  className={`w-10 h-10 rounded-full border-2 transition ${
                    color === calColor
                      ? 'border-gray-900 ring-2 ring-gray-400'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: calColor }}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm font-medium text-gray-700">Set as primary calendar</span>
            </label>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : calendar ? 'Update Calendar' : 'Create Calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

