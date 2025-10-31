"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTaskStore } from "@/stores/taskStore";
import { useCalendarStore } from "@/stores/calendarStore";
import { ProtectedRoute } from "@/lib/auth";
import MainLayout from "@/app/layouts/MainLayout";
import { Task, CreateTaskData, UpdateTaskData } from "@/lib/api";
import TaskList from "./components/TaskList";
import TaskForm from "./components/TaskForm";
import { Plus, Filter, X, CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";

function TasksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  const { tasks, loading, error, filters, fetchTasks, createTask, updateTask, deleteTask, setFilters, clearFilters } = useTaskStore();
  const { calendars, fetchCalendars } = useCalendarStore();

  // Check if we should open task form from query params
  useEffect(() => {
    const action = searchParams?.get('action');
    if (action === 'new') {
      setShowTaskForm(true);
      // Clean up URL
      router.replace('/tasks', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch calendars and tasks on mount
  useEffect(() => {
    fetchCalendars();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters when they change
  useEffect(() => {
    const currentFilters: { status?: string; priority?: string } = {};
    if (selectedStatus) currentFilters.status = selectedStatus;
    if (selectedPriority) currentFilters.priority = selectedPriority;
    setFilters(currentFilters);
    fetchTasks(currentFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus, selectedPriority]);

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleSaveTask = async (data: CreateTaskData | UpdateTaskData) => {
    try {
      if (editingTask) {
        await updateTask(editingTask.id, data as UpdateTaskData);
      } else {
        await createTask(data as CreateTaskData);
      }
      setShowTaskForm(false);
      setEditingTask(undefined);
      
      // Refresh tasks with current filters
      fetchTasks(filters);
    } catch (err) {
      console.error('Failed to save task:', err);
      throw err;
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await updateTask(task.id, { status: newStatus });
      fetchTasks(filters);
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      fetchTasks(filters);
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert(`Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleClearFilters = () => {
    setSelectedStatus('');
    setSelectedPriority('');
    clearFilters();
    fetchTasks();
  };

  // Group tasks by status
  const groupedTasks = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done'),
  };

  const stats = {
    total: tasks.length,
    todo: groupedTasks.todo.length,
    in_progress: groupedTasks.in_progress.length,
    done: groupedTasks.done.length,
    overdue: tasks.filter(t => 
      t.due_date && 
      new Date(t.due_date) < new Date() && 
      t.status !== 'done'
    ).length,
  };

  return (
    <MainLayout>
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <p className="text-gray-600 mt-1">Manage your tasks and to-dos</p>
            </div>
            <button
              onClick={handleCreateTask}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>New Task</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-sm text-blue-600">To Do</div>
              <div className="text-2xl font-bold text-blue-700">{stats.todo}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-sm text-purple-600">In Progress</div>
              <div className="text-2xl font-bold text-purple-700">{stats.in_progress}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-sm text-green-600">Done</div>
              <div className="text-2xl font-bold text-green-700">{stats.done}</div>
            </div>
            {stats.overdue > 0 && (
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-sm text-red-600">Overdue</div>
                <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            {(selectedStatus || selectedPriority) && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {showFilters && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  >
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Tasks by Status */}
            <div className="space-y-6">
              {/* To Do */}
              {(!selectedStatus || selectedStatus === 'todo') && groupedTasks.todo.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Circle className="w-5 h-5 text-blue-600" />
                    To Do ({groupedTasks.todo.length})
                  </h2>
                  <TaskList
                    tasks={groupedTasks.todo}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                </div>
              )}

              {/* In Progress */}
              {(!selectedStatus || selectedStatus === 'in_progress') && groupedTasks.in_progress.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    In Progress ({groupedTasks.in_progress.length})
                  </h2>
                  <TaskList
                    tasks={groupedTasks.in_progress}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                </div>
              )}

              {/* Done */}
              {(!selectedStatus || selectedStatus === 'done') && groupedTasks.done.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Done ({groupedTasks.done.length})
                  </h2>
                  <TaskList
                    tasks={groupedTasks.done}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                  />
                </div>
              )}

              {/* No tasks matching filters */}
              {tasks.length === 0 && (
                <TaskList
                  tasks={[]}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                />
              )}
            </div>
          </>
        )}
        </div>

        {/* Task Form Modal */}
        {showTaskForm && (
          <TaskForm
            task={editingTask}
            calendars={calendars}
            onSave={handleSaveTask}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(undefined);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  );
}

