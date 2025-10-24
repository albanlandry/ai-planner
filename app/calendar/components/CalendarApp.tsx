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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-pink-200 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <Header
          view={view}
          setView={setView}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
        />
        <div className="flex">
          <Sidebar currentDate={currentDate} setCurrentDate={setCurrentDate} />
          <div className="flex-1 p-4">
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
