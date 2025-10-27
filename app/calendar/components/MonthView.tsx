"use client";

import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";
import EventBlock from "./EventBlock";
import { useCalendarStore } from "@/stores/calendarStore";

interface MonthViewProps {
  currentDate: Date;
}

export default function MonthView({ currentDate }: MonthViewProps) {
  const { events, updateEvent } = useCalendarStore();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDrop = (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    const draggedEvent = JSON.parse(e.dataTransfer.getData("event"));
    updateEvent(draggedEvent.id, {
      day: targetDay.getDate(),
      startTime: "10:00",
    });
  };

  return (
    <div className="grid grid-cols-7 gap-0 border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
        <div
          key={d}
          className="bg-gray-50 border-b border-r border-gray-100 p-2 text-center text-sm font-medium text-gray-700"
        >
          {d}
        </div>
      ))}
      {Array.from({ length: monthStart.getDay() }, (_, i) => (
        <div key={`empty-${i}`} className="border-r border-b border-gray-100 h-32 bg-gray-50" />
      ))}
      {monthDays.map((day) => {
        const dayEvents = events
          .filter((e) => e.day === day.getDate())
          .slice(0, 3);
        return (
          <div
            key={day.toISOString()}
            className="border-r border-b border-gray-100 h-32 p-2 overflow-hidden"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, day)}
          >
            <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
            <div className="space-y-1">
              {dayEvents.map((event) => (
                <EventBlock
                  key={event.id}
                  event={event}
                  day={day}
                  onUpdate={updateEvent}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                />
              ))}
              {events.filter((e) => e.day === day.getDate()).length > 3 && (
                <div className="text-xs text-gray-500">
                  +{events.filter((e) => e.day === day.getDate()).length - 3}{" "}
                  more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
