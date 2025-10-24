// stores/calendarStore.ts
import { create } from 'zustand';

interface Event {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    day: number;
    color: 'blue' | 'red' | 'yellow';
    category: string;
}

interface CalendarState {
    events: Event[];
    updateEvent: (id: string, updates: Partial<Event>) => void;
}

const initialEvents: Event[] = [
    { id: '1', title: 'Meeting with Yaroslav', startTime: '09:00', endTime: '13:00', day: 7, color: 'blue', category: 'Management' },
    { id: '2', title: 'UI Design', startTime: '13:00', endTime: '16:00', day: 6, color: 'red', category: 'Design' },
    { id: '3', title: 'UX Workshop', startTime: '16:00', endTime: '17:00', day: 7, color: 'yellow', category: 'Design' },
    { id: '4', title: 'Design Sprint', startTime: '18:00', endTime: '20:00', day: 10, color: 'red', category: 'Design' },
];

export const useCalendarStore = create<CalendarState>((set) => ({
    events: initialEvents,
    updateEvent: (id, updates) =>
        set((state) => ({
            events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        })),
}));