"use client";

import { Task } from "@/lib/api";

interface TaskBlockProps {
  task: Task;
  onClick?: () => void;
}

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-600 text-white';
    case 'high':
      return 'bg-orange-600 text-white';
    case 'medium':
      return 'bg-yellow-500 text-white';
    case 'low':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getStatusIcon = (status: Task['status']) => {
  switch (status) {
    case 'done':
      return '✓';
    case 'in_progress':
      return '⟳';
    case 'cancelled':
      return '✗';
    default:
      return '○';
  }
};

export default function TaskBlock({ task, onClick }: TaskBlockProps) {
  const priorityColor = getPriorityColor(task.priority);
  const statusIcon = getStatusIcon(task.status);

  return (
    <div
      onClick={onClick}
      className={`${priorityColor} px-2 py-1 rounded text-xs font-medium cursor-pointer select-none shadow-sm transition-all hover:shadow-md h-full w-full flex items-center gap-1`}
    >
      <span className="text-[10px] opacity-90">{statusIcon}</span>
      <span className="truncate flex-1">{task.title}</span>
    </div>
  );
}

