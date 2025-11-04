"use client";

import { useState, useCallback } from "react";
import {
  startOfWeek,
  addDays,
  format,
  parse,
  addMinutes,
  setHours,
  setMinutes,
  isSameDay,
  startOfDay,
  endOfDay,
  isAfter,
  isBefore,
} from "date-fns";
import EventBlock from "./EventBlock";
import { Event, UpdateEventData } from "@/lib/api";
import { useCalendarStore } from "@/stores/calendarStore";

interface WeekViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
}

export default function WeekView({ currentDate, events, onEventClick, onEventDelete }: WeekViewProps) {
  const { updateEvent } = useCalendarStore();
  const [draggedEvent, setDraggedEvent] = useState<any>(null);
  const [dragOverCell, setDragOverCell] = useState<Date | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDragStart = useCallback((e: React.DragEvent, event: any) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("opacity-50");
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
    setDragOverCell(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetDay: Date) => {
      e.preventDefault();
      if (!draggedEvent) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hourHeight = rect.height / 15;
      const totalMinutes = Math.round((y / hourHeight) * 60);
      const hours = Math.floor(totalMinutes / 60) + 8;
      const minutes = totalMinutes % 60;
      const newStart = setMinutes(setHours(targetDay, hours), minutes);

      const eventStart = new Date(draggedEvent.start_time);
      const eventEnd = new Date(draggedEvent.end_time);
      const duration = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
      const newEnd = addMinutes(newStart, duration);

      const updates: UpdateEventData = {
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      };

      updateEvent(draggedEvent.id, updates);
    },
    [draggedEvent, updateEvent]
  );

  return (
    <div className="grid grid-cols-8 gap-0 border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
      <div className="col-span-1">
        <div className="h-12 border-b border-gray-100" />
        {Array.from({ length: 16 }, (_, i) => {
          const hour = 8 + i;
          return (
            <div
              key={hour}
              className="h-20 border-b border-gray-100 text-xs text-gray-500 text-right pr-2 pt-1"
            >
              {hour}:00
            </div>
          );
        })}
      </div>

      {weekDays.map((day, idx) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        
        // Filter events that overlap with this day
        const dayEvents = events
          .filter((e) => {
            const eventStart = new Date(e.start_time);
            const eventEnd = new Date(e.end_time);
            // Event overlaps with this day if it starts before day ends and ends after day starts
            return eventStart <= dayEnd && eventEnd >= dayStart;
          })
          .sort((a, b) => {
            const aStart = new Date(a.start_time);
            const bStart = new Date(b.start_time);
            return aStart.getTime() - bStart.getTime();
          });

        return (
          <div
            key={idx}
            className={`col-span-1 border-l border-gray-100 relative ${
              dragOverCell?.getTime() === day.getTime() ? "bg-blue-50" : ""
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day)}
            onDragEnter={() => setDragOverCell(day)}
            onDragLeave={() => setDragOverCell(null)}
          >
            <div className="h-12 border-b border-gray-100 bg-gray-50 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-500 uppercase">
                {format(day, "EEE")}
              </div>
              <div
                className={`text-lg font-semibold ${
                  day.getDate() === new Date().getDate() ? "text-blue-600" : ""
                }`}
              >
                {format(day, "d")}
              </div>
            </div>
            <div className="relative h-full min-h-[1280px]">
              {dayEvents.map((event) => {
                const eventStart = new Date(event.start_time);
                const eventEnd = new Date(event.end_time);
                
                // Calculate the visible portion of the event for this day
                const visibleStart = isAfter(eventStart, dayStart) ? eventStart : dayStart;
                const visibleEnd = isBefore(eventEnd, dayEnd) ? eventEnd : dayEnd;
                
                // Calculate position and height based on visible portion
                // Clamp visible times to grid bounds (8:00 - 24:00)
                const gridStartHour = 8;
                const gridEndHour = 24;
                const gridStartTime = setHours(day, gridStartHour);
                const gridEndTime = setHours(day, gridEndHour);
                
                const clampedStart = isAfter(visibleStart, gridStartTime) ? visibleStart : gridStartTime;
                const clampedEnd = isBefore(visibleEnd, gridEndTime) ? visibleEnd : gridEndTime;
                
                // Only render if there's a visible portion within the grid
                if (clampedStart >= clampedEnd) {
                  return null;
                }
                
                const visibleStartHour = clampedStart.getHours();
                const visibleStartMinutes = clampedStart.getMinutes();
                const top = Math.max(0, (visibleStartHour - gridStartHour) * 80 + (visibleStartMinutes / 60) * 80);
                
                // Calculate duration in minutes for the visible portion
                const durationMinutes = (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60);
                const height = Math.max(20, (durationMinutes / 60) * 80);
                
                // Ensure height doesn't exceed grid bounds
                const maxHeight = (gridEndHour - gridStartHour) * 80 - top;
                const finalHeight = Math.min(height, maxHeight);

                return (
                  <div
                    key={`${event.id}-${day.toISOString()}`}
                    className="absolute left-1 right-1 cursor-pointer"
                    style={{ top: `${top}px`, height: `${finalHeight}px`, display: 'flex' }}
                    onClick={() => onEventClick(event)}
                  >
                    <EventBlock
                      event={event}
                      day={day}
                      onUpdate={updateEvent}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onClick={() => onEventClick(event)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
