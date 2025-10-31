'use client';

import CalendarApp from "./components/CalendarApp";
import { ProtectedRoute } from "@/lib/auth";

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarApp />
    </ProtectedRoute>
  );
}
