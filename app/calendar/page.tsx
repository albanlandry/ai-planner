'use client';

import CalendarApp from "./components/CalendarApp";
import { ProtectedRoute } from "@/lib/auth";
import MainLayout from "@/app/layouts/MainLayout";

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <CalendarApp />
      </MainLayout>
    </ProtectedRoute>
  );
}
