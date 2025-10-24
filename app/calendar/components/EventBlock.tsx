"use client";

import { useState, useRef, useCallback } from "react";

interface Event {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  day: number;
  color: "blue" | "red" | "yellow";
  category: string;
}

interface EventBlockProps {
  event: Event;
  day: Date;
  onUpdate: (id: string, updates: Partial<Event>) => void;
  onDragStart: (e: React.DragEvent, event: Event) => void;
  onDragEnd: () => void;
}

const getEventColor = (color: string) => {
  switch (color) {
    case "blue":
      return "bg-blue-600 text-white";
    case "red":
      return "bg-red-500 text-white";
    case "yellow":
      return "bg-yellow-500 text-gray-900";
    default:
      return "bg-gray-500 text-white";
  }
};

export default function EventBlock({
  event,
  day,
  onUpdate,
  onDragStart,
  onDragEnd,
}: EventBlockProps) {
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; initialHeight: number } | null>(
    null
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).parentElement?.parentElement?.getBoundingClientRect();
      if (!rect) return;

      resizeRef.current = {
        startY: e.clientY,
        initialHeight: rect.height,
      };
      setIsResizing(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current) return;
        const deltaY = moveEvent.clientY - resizeRef.current.startY;
        const hourHeight = 80;
        const newDuration =
          (resizeRef.current.initialHeight / hourHeight) * 60 +
          (deltaY / hourHeight) * 60;
        const snapped = Math.max(30, Math.round(newDuration / 15) * 15);

        const [sh, sm] = event.startTime.split(":").map(Number);
        const startDate = new Date(day);
        startDate.setHours(sh, sm);
        const newEnd = new Date(startDate.getTime() + snapped * 60000);
        const newEndTime = `${newEnd
          .getHours()
          .toString()
          .padStart(2, "0")}:${newEnd
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;

        onUpdate(event.id, { endTime: newEndTime });
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [event, day, onUpdate]
  );

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, event)}
      onDragEnd={onDragEnd}
      className={`${getEventColor(
        event.color
      )} px-3 py-2 rounded-lg text-sm font-semibold cursor-grab active:cursor-grabbing select-none shadow-lg transition-all relative overflow-hidden ${
        isResizing ? "ring-2 ring-blue-400" : ""
      }`}
    >
      <div className="truncate pr-6">{event.title}</div>
      <div className="text-[11px] opacity-90 mt-1">
        {event.startTime} - {event.endTime}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-10"
        onMouseDown={handleResizeStart}
      >
        <div className="w-8 h-1 bg-white bg-opacity-30 rounded-full mt-0.5" />
      </div>
    </div>
  );
}
