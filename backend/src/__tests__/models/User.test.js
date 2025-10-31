const User = require('../../models/User');
const { pool } = require('../../config/database');

// Mock the database pool
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const mockResult = {
        rows: [{
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const user = await User.create(userData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['test@example.com', 'Test User', expect.any(String)])
      );
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
    });

    it('should throw error if database query fails', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      pool.query.mockRejectedValue(new Error('Database error'));

      await expect(User.create(userData)).rejects.toThrow('Database error');
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockResult = {
        rows: [{
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          password_hash: 'hashed_password',
          avatar_url: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const user = await User.findByEmail('test@example.com');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['test@example.com']
      );
      expect(user).toBeInstanceOf(User);
      expect(user.email).toBe('test@example.com');
    });

    it('should return null if user not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const user = await User.findByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const mockResult = {
        rows: [{
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const user = await User.findById('123');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['123']
      );
      expect(user).toBeInstanceOf(User);
      expect(user.id).toBe('123');
    });
  });

  describe('validatePassword', () => {
    it('should validate correct password', async () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      });

      const mockResult = {
        rows: [{
          password_hash: '$2a$10$hashedpassword'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      // Mock bcrypt.compare to return true
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const isValid = await user.validatePassword('password123');

      expect(isValid).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT password_hash'),
        ['123']
      );
    });

    it('should reject incorrect password', async () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      });

      const mockResult = {
        rows: [{
          password_hash: '$2a$10$hashedpassword'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      // Mock bcrypt.compare to return false
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const isValid = await user.validatePassword('wrongpassword');

      expect(isValid).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      });

      const updateData = {
        name: 'Updated Name',
        avatar_url: 'https://example.com/avatar.jpg'
      };

      const mockResult = {
        rows: [{
          id: '123',
          email: 'test@example.com',
          name: 'Updated Name',
          avatar_url: 'https://example.com/avatar.jpg',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }]
      };

      pool.query.mockResolvedValue(mockResult);

      const updatedUser = await user.update(updateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        ['Updated Name', 'https://example.com/avatar.jpg', '123']
      );
      expect(updatedUser).toBeInstanceOf(User);
      expect(updatedUser.name).toBe('Updated Name');
    });
  });

  describe('toJSON', () => {
    it('should return user data as JSON', () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        role: 'user'
      });

      const json = user.toJSON();

      expect(json).toEqual({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        role: 'user'
      });
    });
  });
});
