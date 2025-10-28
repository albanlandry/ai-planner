import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarApp from '../../app/calendar/components/CalendarApp';

// Mock the store
jest.mock('../../stores/calendarStore', () => ({
  useCalendarStore: () => ({
    events: [],
    calendars: [],
    currentUser: null,
    loading: false,
    error: null,
    fetchEvents: jest.fn(),
    fetchCalendars: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    duplicateEvent: jest.fn(),
    createCalendar: jest.fn(),
    updateCalendar: jest.fn(),
    deleteCalendar: jest.fn(),
    optimisticUpdateEvent: jest.fn(),
    rollbackEventUpdate: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'EEE') return 'Mon';
    if (formatStr === 'd') return '1';
    return '2020-03-01';
  }),
  startOfWeek: jest.fn(() => new Date('2020-03-01')),
  addDays: jest.fn((date, days) => new Date('2020-03-01')),
  startOfMonth: jest.fn(() => new Date('2020-03-01')),
  endOfMonth: jest.fn(() => new Date('2020-03-31')),
  eachDayOfInterval: jest.fn(() => [new Date('2020-03-01')]),
  addMinutes: jest.fn((date, minutes) => new Date('2020-03-01')),
  setHours: jest.fn((date, hours) => new Date('2020-03-01')),
  setMinutes: jest.fn((date, minutes) => new Date('2020-03-01')),
}));

describe('CalendarApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<CalendarApp />);
    expect(screen.getAllByText('Mon')).toHaveLength(7); // 7 days of the week
  });

  it('displays week view by default', () => {
    render(<CalendarApp />);
    // Check for time slots (8:00, 9:00, etc.)
    expect(screen.getByText('8:00')).toBeInTheDocument();
    expect(screen.getByText('9:00')).toBeInTheDocument();
  });

  it('switches between week and month view', () => {
    render(<CalendarApp />);
    
    // Find and click the view toggle button
    const viewToggle = screen.getByRole('button', { name: /month/i });
    fireEvent.click(viewToggle);
    
    // Should now show month view
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
  });

  it('displays current date correctly', () => {
    render(<CalendarApp />);
    // The component uses a fixed date of March 2020
    expect(screen.getAllByText('1')).toHaveLength(8); // Multiple instances of "1"
  });

  it('shows sidebar toggle functionality', () => {
    render(<CalendarApp />);
    
    // Find and click the sidebar toggle button (first button without name)
    const sidebarToggle = screen.getAllByRole('button')[0];
    fireEvent.click(sidebarToggle);
    
    // Sidebar should be visible
    expect(screen.getAllByText('Mon')).toHaveLength(7);
  });

  it('renders with proper styling classes', () => {
    const { container } = render(<CalendarApp />);
    
    // Check for main container classes
    expect(container.firstChild).toHaveClass('min-h-screen', 'bg-gradient-to-br');
    
    // Check for calendar grid (month view shows grid-cols-7)
    const calendarGrid = container.querySelector('.grid');
    expect(calendarGrid).toHaveClass('grid-cols-7');
  });
});
