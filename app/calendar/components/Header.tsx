"use client";

import { Plus, Search, Calendar as CalendarIcon, Menu, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";
import { ViewType } from "./CalendarApp";

interface HeaderProps {
  view: ViewType;
  setView: (view: ViewType) => void;
  currentDate: Date;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onCreateEvent: () => void;
}

export default function Header({ view, setView, currentDate, sidebarOpen, setSidebarOpen, onCreateEvent }: HeaderProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 gap-3 sm:gap-0">
      {/* left: logo + search */}
      <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden p-1 hover:bg-gray-100 rounded"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button className="flex items-center gap-2 text-blue-600 font-semibold">
          <CalendarIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Calendar</span>
        </button>
        <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2 flex-1 sm:w-64">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
      </div>

      {/* center: view toggle */}
      <div className="flex-1 flex items-center justify-center w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <div className="text-sm text-gray-500 text-center sm:text-left">{formatDateRange(currentDate, view)}</div>
          <div className="bg-gray-100 p-1 rounded-full flex items-center gap-1">
            <button
              onClick={() => setView("week")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                view === "week" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
              }`}
            >
              WEEK
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors ${
                view === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
              }`}
            >
              MONTH
            </button>
          </div>
        </div>
      </div>

      {/* right: create + user */}
      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
        <button 
          onClick={onCreateEvent}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md shadow hover:bg-blue-700 text-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">CREATE</span>
        </button>
        <Link
          href="/profile"
          className="flex items-center gap-2 hover:bg-gray-100 rounded-lg px-2 py-1 transition"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white">
            {userInitials}
            </div>
          <span className="text-xs sm:text-sm font-medium hidden sm:inline">
            {user?.name || 'User'}
          </span>
        </Link>
      </div>
    </div>
  );
}

function formatDateRange(date: Date, view: ViewType) {
  // Small helper to show month/year or week label depending on view.
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
