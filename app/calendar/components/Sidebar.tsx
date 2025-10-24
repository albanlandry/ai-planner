"use client";

import { useState } from "react";
import { format, startOfMonth, eachDayOfInterval, endOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
}

const calendars = [
  { name: "Finance", color: "bg-blue-500", checked: true },
  { name: "Design", color: "bg-red-500", checked: true },
  { name: "Management", color: "bg-yellow-500", checked: true },
  { name: "Marketing", color: "bg-gray-400", checked: false },
];

const teamMembers = [
  { name: "Jules Forrest", initials: "JF" },
  { name: "Helen Tran", initials: "HT" },
];

export default function Sidebar({ currentDate, setCurrentDate }: SidebarProps) {
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([
    "Finance",
    "Design",
    "Management",
  ]);

  const toggleCalendar = (name: string) => {
    setSelectedCalendars((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="w-64 p-4 border-r border-gray-200 space-y-6">
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
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div key={d}>{d}</div>
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
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-1">
          {calendars.map((cal) => (
            <label
              key={cal.name}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCalendars.includes(cal.name)}
                onChange={() => toggleCalendar(cal.name)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className={`w-3 h-3 rounded-full ${cal.color}`} />
              <span className="text-sm">{cal.name}</span>
            </label>
          ))}
        </div>
        <button className="text-sm text-blue-600 hover:underline mt-2">
          + CREATE CALENDAR
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">FILTER BY TEAM</h3>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="space-y-2">
          {teamMembers.map((member) => (
            <div key={member.name} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-medium">
                {member.initials}
              </div>
              <span className="text-sm">{member.name}</span>
            </div>
          ))}
        </div>
        <button className="text-sm text-blue-600 hover:underline mt-2">
          + ADD PEOPLE
        </button>
      </div>
    </div>
  );
}
