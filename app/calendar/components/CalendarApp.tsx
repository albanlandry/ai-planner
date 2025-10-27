"use client";

import { useState } from "react";
import { format } from "date-fns";
import Header from "./Header";
import Sidebar from "./Sidebar";
import WeekView from "./WeekView";
import MonthView from "./MonthView";

export type ViewType = "week" | "month";

export default function CalendarApp() {
  const [view, setView] = useState<ViewType>("week");
  const [currentDate, setCurrentDate] = useState(new Date(2020, 2, 1)); // March 2020
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 p-2 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <Header
          view={view}
          setView={setView}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <div className="flex flex-col lg:flex-row">
          <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
            <Sidebar currentDate={currentDate} setCurrentDate={setCurrentDate} />
          </div>
          <div className="flex-1 p-2 sm:p-4">
            {view === "week" ? (
              <WeekView currentDate={currentDate} />
            ) : (
              <MonthView currentDate={currentDate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
