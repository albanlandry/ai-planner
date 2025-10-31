"use client";

import { useState, useRef, useCallback } from "react";
import { format, addMinutes, addDays, startOfDay } from "date-fns";
import { Event, UpdateEventData } from "@/lib/api";

interface EventBlockProps {
  event: Event;
  day: Date;
  onUpdate: (id: string, updates: UpdateEventData) => void;
  onDragStart: (e: React.DragEvent, event: Event) => void;
  onDragEnd: () => void;
  onClick?: () => void;
}

// Time increment in minutes (could be moved to settings/admin config later)
const TIME_INCREMENT_MINUTES = 15;

const getEventColor = (color?: string) => {
  if (!color) return "bg-blue-600 text-white";
  return "text-white";
};

export default function EventBlock({
  event,
  day,
  onUpdate,
  onDragStart,
  onDragEnd,
  onClick,
}: EventBlockProps) {
  const [isResizing, setIsResizing] = useState<'top' | 'bottom' | 'left' | 'right' | null>(null);
  const topResizeRef = useRef<{ startY: number; initialStartTime: Date } | null>(null);
  const bottomResizeRef = useRef<{ startY: number; initialEndTime: Date } | null>(null);
  const leftResizeRef = useRef<{ startX: number; initialStartTime: Date } | null>(null);
  const rightResizeRef = useRef<{ startX: number; initialEndTime: Date } | null>(null);

  // Handle top resize (start time)
  const handleTopResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing('top');
      
      const eventStart = new Date(event.start_time);
      topResizeRef.current = {
        startY: e.clientY,
        initialStartTime: eventStart,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!topResizeRef.current) return;
        const deltaY = moveEvent.clientY - topResizeRef.current.startY;
        const hourHeight = 80; // pixels per hour
        const minutesDelta = Math.round((deltaY / hourHeight) * 60);
        const increments = Math.round(minutesDelta / TIME_INCREMENT_MINUTES);
        const adjustedMinutes = increments * TIME_INCREMENT_MINUTES;

        const newStart = addMinutes(topResizeRef.current.initialStartTime, adjustedMinutes);
        const eventEnd = new Date(event.end_time);
        
        // Ensure start time is before end time (minimum 15 minutes)
        if (newStart.getTime() >= eventEnd.getTime() - TIME_INCREMENT_MINUTES * 60000) {
          return;
        }

        const updates: UpdateEventData = {
          start_time: newStart.toISOString(),
        };

        onUpdate(event.id, updates);
      };

      const handleMouseUp = () => {
        topResizeRef.current = null;
        setIsResizing(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [event, onUpdate]
  );

  // Handle bottom resize (end time)
  const handleBottomResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing('bottom');
      
      const eventEnd = new Date(event.end_time);
      bottomResizeRef.current = {
        startY: e.clientY,
        initialEndTime: eventEnd,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!bottomResizeRef.current) return;
        const deltaY = moveEvent.clientY - bottomResizeRef.current.startY;
        const hourHeight = 80; // pixels per hour
        const minutesDelta = Math.round((deltaY / hourHeight) * 60);
        const increments = Math.round(minutesDelta / TIME_INCREMENT_MINUTES);
        const adjustedMinutes = increments * TIME_INCREMENT_MINUTES;

        const newEnd = addMinutes(bottomResizeRef.current.initialEndTime, adjustedMinutes);
        const eventStart = new Date(event.start_time);
        
        // Ensure end time is after start time (minimum 15 minutes)
        if (newEnd.getTime() <= eventStart.getTime() + TIME_INCREMENT_MINUTES * 60000) {
          return;
        }

        const updates: UpdateEventData = {
          end_time: newEnd.toISOString(),
        };

        onUpdate(event.id, updates);
      };

      const handleMouseUp = () => {
        bottomResizeRef.current = null;
        setIsResizing(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [event, onUpdate]
  );

  // Handle left resize (start date - span left)
  const handleLeftResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing('left');
      
      const eventStart = new Date(event.start_time);
      const container = (e.currentTarget as HTMLElement).closest('.col-span-1');
      const dayWidth = container ? container.getBoundingClientRect().width : 140;
      
      leftResizeRef.current = {
        startX: e.clientX,
        initialStartTime: eventStart,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!leftResizeRef.current) return;
        const deltaX = leftResizeRef.current.startX - moveEvent.clientX; // Reversed for left drag
        const daysDelta = Math.round(deltaX / dayWidth);
        
        if (daysDelta === 0) return;

        const newStartDay = addDays(startOfDay(leftResizeRef.current.initialStartTime), -daysDelta);
        const eventStart = new Date(leftResizeRef.current.initialStartTime);
        const newStart = new Date(newStartDay);
        newStart.setHours(eventStart.getHours(), eventStart.getMinutes(), eventStart.getSeconds());
        
        const eventEnd = new Date(event.end_time);
        
        // Ensure start time is before end time
        if (newStart.getTime() >= eventEnd.getTime()) {
          return;
        }

        const updates: UpdateEventData = {
          start_time: newStart.toISOString(),
        };

        onUpdate(event.id, updates);
      };

      const handleMouseUp = () => {
        leftResizeRef.current = null;
        setIsResizing(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [event, onUpdate]
  );

  // Handle right resize (end date - span right)
  const handleRightResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsResizing('right');
      
      const eventEnd = new Date(event.end_time);
      const container = (e.currentTarget as HTMLElement).closest('.col-span-1');
      const dayWidth = container ? container.getBoundingClientRect().width : 140;
      
      rightResizeRef.current = {
        startX: e.clientX,
        initialEndTime: eventEnd,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!rightResizeRef.current) return;
        const deltaX = moveEvent.clientX - rightResizeRef.current.startX;
        const daysDelta = Math.round(deltaX / dayWidth);
        
        if (daysDelta === 0) return;

        const newEndDay = addDays(startOfDay(rightResizeRef.current.initialEndTime), daysDelta);
        const eventEnd = new Date(rightResizeRef.current.initialEndTime);
        const newEnd = new Date(newEndDay);
        newEnd.setHours(eventEnd.getHours(), eventEnd.getMinutes(), eventEnd.getSeconds());
        
        const eventStart = new Date(event.start_time);
        
        // Ensure end time is after start time
        if (newEnd.getTime() <= eventStart.getTime()) {
          return;
        }

        const updates: UpdateEventData = {
          end_time: newEnd.toISOString(),
        };

        onUpdate(event.id, updates);
      };

      const handleMouseUp = () => {
        rightResizeRef.current = null;
        setIsResizing(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [event, onUpdate]
  );

  const eventColor = event.calendar_color || event.color || '#3B82F6';
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const timeFormat = (date: Date) => format(date, 'HH:mm');

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`${getEventColor(
        eventColor
      )} px-3 py-2 rounded-lg text-sm font-semibold cursor-pointer select-none shadow-lg transition-all relative overflow-hidden ${
        isResizing ? "ring-2 ring-blue-400" : ""
      }`}
      style={{ backgroundColor: eventColor }}
    >
      <div className="truncate pr-6">{event.title}</div>
      <div className="text-[11px] opacity-90 mt-1">
        {timeFormat(startTime)} - {timeFormat(endTime)}
      </div>
      
      {/* Top handle - resize start time */}
      <div
        className="absolute top-0 left-0 right-0 h-3 cursor-ns-resize flex justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-10 z-10"
        onMouseDown={handleTopResizeStart}
      >
        <div className="w-8 h-1 bg-white bg-opacity-30 rounded-full mt-1" />
      </div>

      {/* Bottom handle - resize end time */}
      <div
        className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-10 z-10"
        onMouseDown={handleBottomResizeStart}
      >
        <div className="w-8 h-1 bg-white bg-opacity-30 rounded-full mb-1" />
      </div>

      {/* Left handle - span left (decrease start date) */}
      <div
        className="absolute top-0 left-0 bottom-0 w-3 cursor-ew-resize flex items-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-10 z-10"
        onMouseDown={handleLeftResizeStart}
      >
        <div className="h-8 w-1 bg-white bg-opacity-30 rounded-full ml-1" />
      </div>

      {/* Right handle - span right (increase end date) */}
      <div
        className="absolute top-0 right-0 bottom-0 w-3 cursor-ew-resize flex items-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-10 z-10"
        onMouseDown={handleRightResizeStart}
      >
        <div className="h-8 w-1 bg-white bg-opacity-30 rounded-full mr-1" />
      </div>
    </div>
  );
}