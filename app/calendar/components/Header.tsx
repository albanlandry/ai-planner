"use client";

import { Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { ViewType } from "./CalendarApp";

interface HeaderProps {
  view: ViewType;
  setView: (view: ViewType) => void;
  currentDate: Date;
}

export default function Header({ view, setView, currentDate }: HeaderProps) {
  return (
  <div className="flex items-center justify-between p-4 border-b border-gray-200">
      {/* left: logo + search */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 text-blue-600 font-semibold">
          <CalendarIcon className="w-5 h-5" />
          Calendar
        </button>
        <div className="hidden md:flex items-center bg-gray-100 rounded-lg px-3 py-2 w-64">
          <Search className="w-4 h-4 text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent outline-none text-sm flex-1"
          />
        </div>
      </div>

      {/* center: view toggle */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500 hidden sm:block">{formatDateRange(currentDate, view)}</div>
          <div className="bg-gray-100 p-1 rounded-full flex items-center gap-1">
            <button
              onClick={() => setView("week")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                view === "week" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
              }`}
            >
              WEEK
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                view === "month" ? "bg-white shadow-sm text-gray-900" : "text-gray-600"
              }`}
            >
              MONTH
            </button>
          </div>
        </div>
      </div>

      {/* right: create + avatars */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          CREATE
        </button>
        <div className="flex -space-x-2 items-center">
          {["JF", "HT"].map((initial, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
            >
              {initial}
            </div>
          ))}
        </div>
        <span className="text-sm font-medium">Rach Smith</span>
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
