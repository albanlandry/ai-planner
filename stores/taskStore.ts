import { create } from 'zustand';
import { apiService, Task, CreateTaskData, UpdateTaskData } from '../lib/api';

interface TaskState {
  // State
  tasks: Task[];
  loading: boolean;
  error: string | null;
  filters: {
    status?: string;
    priority?: string;
    calendar_id?: string;
  };

  // Actions
  fetchTasks: (filters?: { status?: string; priority?: string; calendar_id?: string }) => Promise<void>;
  createTask: (taskData: CreateTaskData) => Promise<Task>;
  updateTask: (id: string, updates: UpdateTaskData) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  
  // Filters
  setFilters: (filters: { status?: string; priority?: string; calendar_id?: string }) => void;
  clearFilters: () => void;

  // Utility
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Initial state
  tasks: [],
  loading: false,
  error: null,
  filters: {},

  // Fetch tasks
  fetchTasks: async (filters = {}) => {
    set({ loading: true, error: null, filters });
    try {
      const response = await apiService.getTasks(filters);
      set({ tasks: response.tasks, loading: false });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tasks';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Create task
  createTask: async (taskData: CreateTaskData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.createTask(taskData);
      set((state) => ({
        tasks: [...state.tasks, response.task],
        loading: false
      }));
      return response.task;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create task';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Update task
  updateTask: async (id: string, updates: UpdateTaskData) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.updateTask(id, updates);
      set((state) => ({
        tasks: state.tasks.map(t => t.id === id ? response.task : t),
        loading: false
      }));
      return response.task;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Delete task
  deleteTask: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await apiService.deleteTask(id);
      set((state) => ({
        tasks: state.tasks.filter(t => t.id !== id),
        loading: false
      }));
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete task';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  // Set filters
  setFilters: (filters) => {
    set({ filters });
  },

  // Clear filters
  clearFilters: () => {
    set({ filters: {} });
  },

  // Utility functions
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),
}));

