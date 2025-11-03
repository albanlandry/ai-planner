"use client";

import { isSameDay, setHours, setMinutes, addMinutes, format } from "date-fns";
import { useState, useCallback } from "react";
import { Event, UpdateEventData } from "@/lib/api";
import { useCalendarStore } from "@/stores/calendarStore";
import EventBlock from "./EventBlock";

interface DayViewProps {
  currentDate: Date;
  events: Event[];
  onEventClick: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
}

export default function DayView({ currentDate, events, onEventClick, onEventDelete }: DayViewProps) {
  const { updateEvent } = useCalendarStore();
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, event: Event) => {
    setDraggedEvent(event);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEvent(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!draggedEvent) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hourHeight = rect.height / 15; // 8am - 24pm => 16 hours * 60 / 15min = 64 rows -> but we map visually by px
      const totalMinutes = Math.round((y / hourHeight) * 60);
      const hours = Math.floor(totalMinutes / 60) + 8;
      const minutes = totalMinutes % 60;
      const newStart = setMinutes(setHours(currentDate, hours), minutes);

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
    [draggedEvent, updateEvent, currentDate]
  );

  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.start_time), currentDate))
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="grid grid-cols-8 gap-0 border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
      <div className="col-span-1">
        <div className="h-12 border-b border-gray-100" />
        {Array.from({ length: 16 }, (_, i) => {
          const hour = 8 + i;
          return (
            <div key={hour} className="h-20 border-b border-gray-100 text-xs text-gray-500 text-right pr-2 pt-1">
              {hour}:00
            </div>
          );
        })}
      </div>

      <div className="col-span-7 border-l border-gray-100 relative" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
        <div className="h-12 border-b border-gray-100 bg-gray-50 flex flex-col items-center justify-center">
          <div className="text-xs text-gray-500 uppercase">{format(currentDate, "EEE")}</div>
          <div className="text-lg font-semibold">{format(currentDate, "d")}</div>
        </div>
        <div className="relative h-full min-h-[1280px]">
          {dayEvents.map((event) => {
            const eventStart = new Date(event.start_time);
            const eventEnd = new Date(event.end_time);
            const top = (eventStart.getHours() - 8) * 80 + (eventStart.getMinutes() / 60) * 80;
            const height = Math.max(40, ((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60) / 60) * 80);
            return (
              <div key={event.id} className="absolute left-1 right-1 cursor-pointer" style={{ top: `${top}px`, height: `${height}px` }} onClick={() => onEventClick(event)}>
                <EventBlock
                  event={event}
                  day={currentDate}
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
    </div>
  );
}


