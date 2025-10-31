"use client";

import { Task } from "@/lib/api";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar as CalendarIcon,
  MoreVertical,
  Pencil,
  Trash2,
  AlertCircle
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const priorityColors = {
  low: 'bg-blue-100 text-blue-700 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
};

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export default function TaskItem({ task, onToggleComplete, onEdit, onDelete }: TaskItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isDone = task.status === 'done';

  const handleStatusChange = () => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    onToggleComplete({ ...task, status: newStatus } as Task);
  };

  return (
    <div
      className={`group bg-white border rounded-lg p-4 hover:shadow-md transition-all ${
        isDone ? 'opacity-60' : ''
      } ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleStatusChange}
          className="mt-0.5 flex-shrink-0"
          aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-green-600 transition" />
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-medium text-gray-900 ${
                  isDone ? 'line-through text-gray-500' : ''
                }`}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className={`text-sm text-gray-600 mt-1 ${isDone ? 'line-through' : ''}`}>
                  {task.description}
                </p>
              )}
            </div>

            {/* Menu Button */}
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 hover:bg-gray-100 rounded transition opacity-0 group-hover:opacity-100"
                aria-label="Task options"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(task);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      if (window.confirm('Are you sure you want to delete this task?')) {
                        onDelete(task.id);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {/* Status Badge */}
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              task.status === 'done' ? 'bg-green-100 text-green-700' :
              task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              task.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {statusLabels[task.status]}
            </span>

            {/* Priority Badge */}
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
              priorityColors[task.priority]
            }`}>
              {task.priority.toUpperCase()}
            </span>

            {/* Due Date */}
            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'
              }`}>
                <Clock className="w-3 h-3" />
                <span>
                  {format(new Date(task.due_date), 'MMM d, yyyy')}
                </span>
                {isOverdue && (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
              </div>
            )}

            {/* Calendar Link */}
            {task.calendar_id && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <CalendarIcon className="w-3 h-3" />
                <span>Calendar</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

