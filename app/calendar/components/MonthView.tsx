"use client";

import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from "date-fns";
import EventBlock from "./EventBlock";
import { Event, UpdateEventData } from "@/lib/api";
import { useCalendarStore } from "@/stores/calendarStore";

interface MonthViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
}

export default function MonthView({ currentDate, events, onEventClick, onEventDelete }: MonthViewProps) {
  const { updateEvent } = useCalendarStore();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDrop = (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    try {
      const draggedEvent: Event = JSON.parse(e.dataTransfer.getData("event"));
      const eventStart = new Date(draggedEvent.start_time);
      const eventEnd = new Date(draggedEvent.end_time);
      const duration = eventEnd.getTime() - eventStart.getTime();
      
      // Set the new start time to the target day at the same time
      const newStart = new Date(targetDay);
      newStart.setHours(eventStart.getHours(), eventStart.getMinutes());
      const newEnd = new Date(newStart.getTime() + duration);

      const updates: UpdateEventData = {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      };

      updateEvent(draggedEvent.id, updates);
    } catch (err) {
      console.error('Failed to handle drop:', err);
    }
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
          .filter((e) => {
            const eventStart = new Date(e.start_time);
            return isSameDay(eventStart, day);
          })
          .slice(0, 3);
        const totalEvents = events.filter((e) => {
          const eventStart = new Date(e.start_time);
          return isSameDay(eventStart, day);
        }).length;

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
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="cursor-pointer"
                >
                  <EventBlock
                    event={event}
                    day={day}
                    onUpdate={updateEvent}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("event", JSON.stringify(event));
                    }}
                    onDragEnd={() => {}}
                    onClick={() => onEventClick(event)}
                  />
                </div>
              ))}
              {totalEvents > 3 && (
                <div className="text-xs text-gray-500">
                  +{totalEvents - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
