const request = require('supertest');
const express = require('express');
const authRouter = require('../../api/auth');
const User = require('../../models/User');
const { generateTokens, verifyRefreshToken } = require('../../utils/jwt');

// Mock dependencies
jest.mock('../../models/User');
jest.mock('../../utils/jwt');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        toJSON: () => ({
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        })
      };

      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      generateTokens.mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken', 'access_token');
      expect(response.body).toHaveProperty('refreshToken', 'refresh_token');
      expect(User.create).toHaveBeenCalledWith(userData);
    });

    it('should return 409 if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const existingUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      };

      User.findByEmail.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'User already exists with this email');
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        email: 'invalid-email',
        name: '',
        password: '123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should return 500 for server error', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      User.findByEmail.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Internal server error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        validatePassword: jest.fn().mockResolvedValue(true),
        toJSON: () => ({
          id: '123',
          email: 'test@example.com',
          name: 'Test User',
          avatar_url: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        })
      };

      User.findByEmail.mockResolvedValue(mockUser);
      generateTokens.mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken', 'access_token');
      expect(response.body).toHaveProperty('refreshToken', 'refresh_token');
      expect(mockUser.validatePassword).toHaveBeenCalledWith('password123');
    });

    it('should return 401 for invalid credentials - user not found', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });

    it('should return 401 for invalid credentials - wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        validatePassword: jest.fn().mockResolvedValue(false)
      };

      User.findByEmail.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshData = {
        refreshToken: 'valid_refresh_token'
      };

      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      };

      verifyRefreshToken.mockReturnValue({ id: '123' });
      User.findById.mockResolvedValue(mockUser);
      generateTokens.mockReturnValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token'
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken', 'new_access_token');
      expect(response.body).toHaveProperty('refreshToken', 'new_refresh_token');
    });

    it('should return 401 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Refresh token required');
    });

    it('should return 401 for invalid refresh token', async () => {
      const refreshData = {
        refreshToken: 'invalid_token'
      };

      verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });

    it('should return 401 for user not found', async () => {
      const refreshData = {
        refreshToken: 'valid_refresh_token'
      };

      verifyRefreshToken.mockReturnValue({ id: '123' });
      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
    });
  });
});
