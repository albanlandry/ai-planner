"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChatbotProvider } from "@/app/providers/ChatbotProvider";
import MainNavigation from "@/app/calendar/components/MainNavigation";
import { useTaskStore } from "@/stores/taskStore";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [navCollapsed, setNavCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('navCollapsed');
      return stored === 'true';
    }
    return false;
  });

  // Fetch tasks to get count for badge
  const { tasks, fetchTasks } = useTaskStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('navCollapsed', navCollapsed.toString());
    }
  }, [navCollapsed]);

  useEffect(() => {
    // Fetch tasks to get count for navigation badge
    fetchTasks().catch(() => {
      // Ignore errors - tasks may not be loaded yet
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count pending tasks (todo + in_progress)
  const pendingTaskCount = tasks.filter(t => 
    t.status === 'todo' || t.status === 'in_progress'
  ).length;

  return (
    <ChatbotProvider floating={<AIFloatingChat />}>
      <div className="min-h-screen bg-white flex">
        {/* Left Main Navigation */}
        <MainNavigation 
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed(!navCollapsed)}
          pendingTaskCount={pendingTaskCount}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ChatbotProvider>
  );
}
const AIFloatingChat = dynamic(() => import("@/app/components/AIFloatingChat"), { ssr: false });

