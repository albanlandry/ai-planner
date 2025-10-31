"use client";

import { useState } from "react";
import { format, startOfMonth, eachDayOfInterval, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react";
import { Calendar } from "@/lib/api";

interface SidebarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  calendars: Calendar[];
  onCreateCalendar: () => void;
  onEditCalendar: (calendar: Calendar) => void;
  onDeleteCalendar: (calendar: Calendar) => void;
}

export default function Sidebar({ 
  currentDate, 
  setCurrentDate,
  calendars,
  onCreateCalendar,
  onEditCalendar,
  onDeleteCalendar
}: SidebarProps) {
  // Initialize with all calendar IDs selected
  const initialSelected = calendars.map(c => c.id);
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>(initialSelected);

  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(calendarId) ? prev.filter((c) => c !== calendarId) : [...prev, calendarId]
    );
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="w-full lg:w-64 p-3 lg:p-4 border-r border-gray-200 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
            )
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
        <button
          onClick={() =>
            setCurrentDate(
              new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
            )
          }
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-600 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d: string, i: number) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-xs">
          {Array.from({ length: monthStart.getDay() }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {monthDays.map((day) => (
            <div
              key={day.toISOString()}
              className={`p-1 text-center cursor-pointer hover:bg-blue-100 rounded ${
                day.getDate() === new Date().getDate() &&
                day.getMonth() === new Date().getMonth()
                  ? "bg-blue-600 text-white rounded-full"
                  : ""
              } ${
                day.getMonth() !== currentDate.getMonth() ? "text-gray-400" : ""
              }`}
            >
              {format(day, "d")}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">MY CALENDARS</h3>
          <button
            onClick={onCreateCalendar}
            className="p-1 hover:bg-gray-100 rounded"
            title="Create Calendar"
          >
            <Plus className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="space-y-1">
          {calendars.map((cal) => (
            <div
              key={cal.id}
              className="flex items-center gap-2 group hover:bg-gray-50 rounded p-1"
            >
              <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                  checked={selectedCalendars.includes(cal.id)}
                  onChange={() => toggleCalendar(cal.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: cal.color }}
                />
              <span className="text-sm">{cal.name}</span>
            </label>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={() => onEditCalendar(cal)}
                  className="p-1 hover:bg-gray-200 rounded transition"
                  title="Edit Calendar"
                >
                  <Edit2 className="w-3 h-3 text-gray-500" />
                </button>
                <button
                  onClick={() => onDeleteCalendar(cal)}
                  className="p-1 hover:bg-red-100 rounded transition"
                  title="Delete Calendar"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
        </button>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={onCreateCalendar}
          className="text-sm text-blue-600 hover:underline mt-2 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          CREATE CALENDAR
        </button>
      </div>

    </div>
  );
}
