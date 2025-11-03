"use client";

import { Plus, Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Menu } from "lucide-react";
import { ViewType } from "./CalendarApp";
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, format } from "date-fns";
import UserMenu from "./UserMenu";

interface HeaderProps {
  view: ViewType;
  setView: (view: ViewType) => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onCreateEvent: () => void;
}

export default function Header({ view, setView, currentDate, setCurrentDate, sidebarOpen, setSidebarOpen, onCreateEvent }: HeaderProps) {
  const goPrev = () => {
    if (view === "day") setCurrentDate(subDays(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  const goNext = () => {
    if (view === "day") setCurrentDate(addDays(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 gap-3 sm:gap-0 bg-white">
      {/* left: menu toggle + search */}
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1 hover:bg-gray-100 rounded transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 flex-1 sm:w-80">
          <Search className="w-4 h-4 text-gray-500 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search events, calendars, tasks..."
            className="bg-transparent outline-none text-sm flex-1 w-full"
          />
        </div>
      </div>

      {/* center: date range + view toggle */}
      <div className="flex-1 flex items-center justify-center w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="p-1.5 rounded hover:bg-gray-100" aria-label="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-medium text-gray-700 text-center sm:text-left min-w-[160px]">
              {formatDateRange(currentDate, view)}
            </div>
            <button onClick={goNext} className="p-1.5 rounded hover:bg-gray-100" aria-label="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="ml-2 text-xs px-2 py-1 rounded border hover:bg-gray-50">Today</button>
          </div>
          <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
            <button
              onClick={() => setView("day")}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                view === "day" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              DAY
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                view === "week" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              WEEK
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${
                view === "month" 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              MONTH
            </button>
          </div>
        </div>
      </div>

      {/* right: create button + user menu */}
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <button 
          onClick={onCreateEvent}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 text-sm font-medium transition-all hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">CREATE</span>
        </button>
        <UserMenu />
      </div>
    </div>
  );
}

function formatDateRange(date: Date, view: ViewType) {
  // Small helper to show month/year or week label depending on view.
  if (view === "day") {
    return format(date, "MMMM d, yyyy");
  }
  if (view === "month") {
    return date.toLocaleString(undefined, { month: "long", year: "numeric" });
  }
  // For week view show week of month/day range roughly
  const start = new Date(date);
  const end = new Date(date);
  start.setDate(date.getDate() - 3);
  end.setDate(date.getDate() + 3);
  const fmt = (d: Date) => d.toLocaleString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} — ${fmt(end)}`;
}
