"use client";

import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import Header from "./Header";
import Sidebar from "./Sidebar";
import WeekView from "./WeekView";
import DayView from "./DayView";
import MonthView from "./MonthView";
import EventForm from "./EventForm";
import CalendarForm from "./CalendarForm";
import { useCalendarStore } from "@/stores/calendarStore";
import { useTaskStore } from "@/stores/taskStore";
import { Event, Calendar, CreateEventData, UpdateEventData, CreateCalendarData, UpdateCalendarData } from "@/lib/api";

export type ViewType = "day" | "week" | "month";

export default function CalendarApp() {
  const [view, setView] = useState<ViewType>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calendarView');
      if (stored === 'day' || stored === 'week' || stored === 'month') {
        return stored as ViewType;
      }
    }
    return "week";
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarSidebarOpen, setCalendarSidebarOpen] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showCalendarForm, setShowCalendarForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | undefined>();
  const [editingCalendar, setEditingCalendar] = useState<Calendar | undefined>();

  const { 
    events, 
    calendars, 
    loading,
    fetchEvents, 
    fetchCalendars,
    createEvent,
    updateEvent,
    deleteEvent,
    createCalendar,
    updateCalendar,
    deleteCalendar
  } = useCalendarStore();

  const { fetchTasks } = useTaskStore();

  // Note: fetchCurrentUser is already called by ProtectedRoute wrapper
  // No need to call it again here

  // Fetch calendars and tasks on mount
  useEffect(() => {
    fetchCalendars();
    fetchTasks().catch(() => {
      // Ignore errors - tasks may not be loaded yet
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist selected view to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarView', view);
    }
  }, [view]);


  // Fetch events when date changes or calendars are loaded
  useEffect(() => {
    if (calendars.length > 0) {
      const startDate =
        view === "day"
          ? startOfDay(currentDate)
          : view === "week"
          ? startOfWeek(currentDate, { weekStartsOn: 1 })
          : startOfMonth(currentDate);
      const endDate =
        view === "day"
          ? endOfDay(currentDate)
          : view === "week"
          ? endOfWeek(currentDate, { weekStartsOn: 1 })
          : endOfMonth(currentDate);

      fetchEvents(startDate, endDate);
    }
  }, [currentDate, view, calendars.length, fetchEvents]);

  const handleCreateEvent = () => {
    setEditingEvent(undefined);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = async (data: CreateEventData | UpdateEventData) => {
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data as UpdateEventData);
      } else {
        await createEvent(data as CreateEventData);
      }
      // Only close form on success
      setShowEventForm(false);
      setEditingEvent(undefined);
      
      // Refresh events
      const startDate = view === "week" 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfMonth(currentDate);
      const endDate = view === "week"
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfMonth(currentDate);
      fetchEvents(startDate, endDate);
    } catch (err) {
      // Error is handled by the store and displayed in EventForm
      // Re-throw so EventForm can handle it and keep form open
      console.error('Failed to save event:', err);
      throw err;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setShowEventForm(false);
      setEditingEvent(undefined);
      
      // Refresh events
      const startDate = view === "week" 
        ? startOfWeek(currentDate, { weekStartsOn: 1 })
        : startOfMonth(currentDate);
      const endDate = view === "week"
        ? endOfWeek(currentDate, { weekStartsOn: 1 })
        : endOfMonth(currentDate);
      fetchEvents(startDate, endDate);
    } catch (err) {
      console.error('Failed to delete event:', err);
      // Error is handled by the store
      throw err; // Re-throw so EventForm can handle it
    }
  };

  const handleCreateCalendar = () => {
    setEditingCalendar(undefined);
    setShowCalendarForm(true);
  };

  const handleEditCalendar = (calendar: Calendar) => {
    setEditingCalendar(calendar);
    setShowCalendarForm(true);
  };

  const handleDeleteCalendar = async (calendar: Calendar) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${calendar.name}"?\n\nThis will also delete all events in this calendar. This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteCalendar(calendar.id);
      // Calendars are automatically updated in the store
    } catch (err) {
      console.error('Failed to delete calendar:', err);
      // Show error to user
      alert(`Failed to delete calendar: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveCalendar = async (data: CreateCalendarData | UpdateCalendarData) => {
    try {
      if (editingCalendar) {
        await updateCalendar(editingCalendar.id, data as UpdateCalendarData);
      } else {
        await createCalendar(data as CreateCalendarData);
      }
      // Calendars are refreshed in the store after create/update
      setShowCalendarForm(false);
      setEditingCalendar(undefined);
    } catch (err) {
      // Error is handled by the store - form stays open to show error
      console.error('Failed to save calendar:', err);
    }
  };

  if (loading && calendars.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Top Header */}
      <Header
        view={view}
        setView={setView}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        sidebarOpen={calendarSidebarOpen}
        setSidebarOpen={setCalendarSidebarOpen}
        onCreateEvent={handleCreateEvent}
      />

      {/* Calendar Content with Right Sidebar */}
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Main Calendar View */}
        <div className="flex-1 overflow-auto p-2 sm:p-4">
          {view === "day" ? (
            <DayView 
              currentDate={currentDate}
              events={events}
              onEventClick={handleEditEvent}
              onEventDelete={handleDeleteEvent}
            />
          ) : view === "week" ? (
            <WeekView 
              currentDate={currentDate} 
              events={events}
              onEventClick={handleEditEvent}
              onEventDelete={handleDeleteEvent}
            />
          ) : (
            <MonthView 
              currentDate={currentDate}
              events={events}
              onEventClick={handleEditEvent}
              onEventDelete={handleDeleteEvent}
            />
          )}
        </div>

        {/* Right Calendar Sidebar */}
        <div className={`${calendarSidebarOpen ? 'block' : 'hidden'} lg:block border-l border-gray-200 overflow-y-auto`}>
          <Sidebar 
            currentDate={currentDate} 
            setCurrentDate={setCurrentDate}
            calendars={calendars}
            onCreateCalendar={handleCreateCalendar}
            onEditCalendar={handleEditCalendar}
            onDeleteCalendar={handleDeleteCalendar}
          />
        </div>
      </div>

      {showEventForm && (
        <EventForm
          event={editingEvent}
          calendars={calendars}
          onSave={handleSaveEvent}
          onDelete={editingEvent ? handleDeleteEvent : undefined}
          onCancel={() => {
            setShowEventForm(false);
            setEditingEvent(undefined);
          }}
          defaultDate={currentDate}
        />
      )}

      {showCalendarForm && (
        <CalendarForm
          calendar={editingCalendar}
          onSave={handleSaveCalendar}
          onCancel={() => {
            setShowCalendarForm(false);
            setEditingCalendar(undefined);
          }}
        />
      )}
    </>
  );
}
