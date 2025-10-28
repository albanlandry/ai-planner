const Calendar = require('../../models/Calendar');
const { pool } = require('../../config/database');

// Mock the database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Calendar Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new calendar', async () => {
      const calendarData = {
        user_id: '123',
        name: 'Test Calendar',
        color: '#FF0000',
        is_primary: true
      };

      const mockResult = {
        rows: [{
          id: '456',
          user_id: '123',
          name: 'Test Calendar',
          color: '#FF0000',
          is_primary: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const calendar = await Calendar.create(calendarData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO calendars'),
        ['123', 'Test Calendar', '#FF0000', true]
      );
      expect(calendar).toBeInstanceOf(Calendar);
      expect(calendar.name).toBe('Test Calendar');
      expect(calendar.color).toBe('#FF0000');
    });

    it('should create calendar with default values', async () => {
      const calendarData = {
        user_id: '123',
        name: 'Test Calendar'
      };

      const mockResult = {
        rows: [{
          id: '456',
          user_id: '123',
          name: 'Test Calendar',
          color: '#3B82F6',
          is_primary: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const calendar = await Calendar.create(calendarData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO calendars'),
        ['123', 'Test Calendar', '#3B82F6', false]
      );
      expect(calendar.color).toBe('#3B82F6');
      expect(calendar.is_primary).toBe(false);
    });
  });

  describe('findByUserId', () => {
    it('should find calendars by user id', async () => {
      const mockResult = {
        rows: [
          {
            id: '456',
            user_id: '123',
            name: 'Calendar 1',
            color: '#FF0000',
            is_primary: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '789',
            user_id: '123',
            name: 'Calendar 2',
            color: '#00FF00',
            is_primary: false,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ]
      };

      pool.query.mockResolvedValue(mockResult);

      const calendars = await Calendar.findByUserId('123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123']
      );
      expect(calendars).toHaveLength(2);
      expect(calendars[0]).toBeInstanceOf(Calendar);
      expect(calendars[0].name).toBe('Calendar 1');
    });
  });

  describe('findById', () => {
    it('should find calendar by id', async () => {
      const mockResult = {
        rows: [{
          id: '456',
          user_id: '123',
          name: 'Test Calendar',
          color: '#FF0000',
          is_primary: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const calendar = await Calendar.findById('456');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['456']
      );
      expect(calendar).toBeInstanceOf(Calendar);
      expect(calendar.id).toBe('456');
    });

    it('should return null if calendar not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const calendar = await Calendar.findById('nonexistent');

      expect(calendar).toBeNull();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find calendar by id and user id', async () => {
      const mockResult = {
        rows: [{
          id: '456',
          user_id: '123',
          name: 'Test Calendar',
          color: '#FF0000',
          is_primary: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const calendar = await Calendar.findByIdAndUserId('456', '123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['456', '123']
      );
      expect(calendar).toBeInstanceOf(Calendar);
      expect(calendar.id).toBe('456');
    });
  });

  describe('update', () => {
    it('should update calendar', async () => {
      const calendar = new Calendar({
        id: '456',
        user_id: '123',
        name: 'Test Calendar',
        color: '#FF0000',
        is_primary: true
      });

      const updateData = {
        name: 'Updated Calendar',
        color: '#00FF00',
        is_primary: false
      };

      const mockResult = {
        rows: [{
          id: '456',
          user_id: '123',
          name: 'Updated Calendar',
          color: '#00FF00',
          is_primary: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const updatedCalendar = await calendar.update(updateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE calendars'),
        ['Updated Calendar', '#00FF00', false, '456']
      );
      expect(updatedCalendar).toBeInstanceOf(Calendar);
      expect(updatedCalendar.name).toBe('Updated Calendar');
    });
  });

  describe('delete', () => {
    it('should delete calendar', async () => {
      const calendar = new Calendar({
        id: '456',
        user_id: '123',
        name: 'Test Calendar'
      });

      pool.query.mockResolvedValue({});

      const result = await calendar.delete();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM calendars'),
        ['456']
      );
      expect(result).toBe(true);
    });
  });

  describe('toJSON', () => {
    it('should return calendar data as JSON', () => {
      const calendar = new Calendar({
        id: '456',
        user_id: '123',
        name: 'Test Calendar',
        color: '#FF0000',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });

      const json = calendar.toJSON();

      expect(json).toEqual({
        id: '456',
        user_id: '123',
        name: 'Test Calendar',
        color: '#FF0000',
        is_primary: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      });
    });
  });
});
