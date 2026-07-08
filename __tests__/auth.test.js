const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const sendEmail = require('../src/utils/sendEmail');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a user and return token', async () => {
      const userData = { name: 'Test', email: 'test@example.com', password: 'password123', role: 'user' };
      const savedUser = { ...userData, _id: '60d5ecb86c8d4b001c8e4e3a', save: jest.fn().mockResolvedValue(this), getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken') };

      // Mock User.create to return our savedUser
      User.create.mockResolvedValue(savedUser);

      const res = await request(app).post('/api/auth/register').send(userData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('fakejwttoken');
      expect(User.create).toHaveBeenCalledWith(userData);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'invalid-email', password: 'password123', role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user and return token', async () => {
      const userData = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        _id: '60d5ecb86c8d4b001c8e4e3a',
        email: 'test@example.com',
        password: 'hashedpassword123', // hashed password
        matchPassword: jest.fn().mockResolvedValue(true),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken')
      };

      // Mock the query chain: User.findOne(...).select('+password')
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };
      User.findOne.mockReturnValue(mockQuery);

      const res = await request(app).post('/api/auth/login').send(userData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('fakejwttoken');
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockQuery.select).toHaveBeenCalledWith('+password');
      expect(mockUser.matchPassword).toHaveBeenCalledWith(userData.password);
    });

    it('should return 400 if email or password is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 if user does not exist', async () => {
      // Mock the query chain to return null (user not found)
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null)
      };
      User.findOne.mockReturnValue(mockQuery);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'nonexistent@example.com' });
      expect(mockQuery.select).toHaveBeenCalledWith('+password');
    });

    it('should return 401 if password is incorrect', async () => {
      const userData = { email: 'test@example.com', password: 'wrongpassword' };
      const mockUser = {
        email: 'test@example.com',
        matchPassword: jest.fn().mockResolvedValue(false) // password doesn't match
      };

      // Mock the query chain to return the user (but password check will fail)
      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser)
      };
      User.findOne.mockReturnValue(mockQuery);

      const res = await request(app)
        .post('/api/auth/login')
        .send(userData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockQuery.select).toHaveBeenCalledWith('+password');
      expect(mockUser.matchPassword).toHaveBeenCalledWith(userData.password);
    });
  });

  describe('GET /api/auth/logout', () => {
    it('should logout user and return success', async () => {
      const res = await request(app).get('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/forgotpassword', () => {
    it('should send password reset email', async () => {
      const userData = { email: 'test@example.com' };
      const mockUser = {
        ...userData,
        _id: '60d5ecb86c8d4b001c8e4e3a',
        getResetPasswordToken: jest.fn().mockReturnValue('resettoken123'),
        save: jest.fn().mockResolvedValue()
      };

      // Mock the query chain: User.findOne(...).select('+password') - but note: forgotPassword doesn't use select
      // Actually, forgotPassword does: User.findOne({ email: req.body.email });
      // So we need to mock the findOne to return a query that when awaited gives the user
      const mockQuery = {
        // For forgotPassword, we don't use select, so we just need the query to resolve to the user
        // We'll mock the findOne to return an object that when awaited (via .then or await) gives the user
        // But since we are mocking the return value of findOne, we can make it return a promise that resolves to the user
        // However, the controller does: await User.findOne({ email: req.body.email });
        // So we can mock User.findOne to return a promise that resolves to the user
        // But note: we are already mocking User.findOne to return an object. We need to adjust.
        // Let's change: for forgotPassword, we don't chain select, so we mock User.findOne to return a promise that resolves to the user.
        // To keep it simple, we'll mock User.findOne to return a promise that resolves to the user (or null) directly.
        // We'll adjust the mock for each test as needed.
      };

      // For forgotPassword, we don't need the select chain, so we'll mock User.findOne to resolve directly to the user
      User.findOne.mockResolvedValue(mockUser);
      sendEmail.mockResolvedValue();

      const res = await request(app)
        .post('/api/auth/forgotpassword')
        .send(userData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBe('Email sent');
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockUser.getResetPasswordToken).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith({
        email: userData.email,
        subject: 'Password reset token',
        message: expect.stringContaining('resetpassword/resettoken123')
      });
    });

    it('should return 404 if user does not exist', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/forgotpassword')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 500 if email sending fails', async () => {
      const userData = { email: 'test@example.com' };
      const mockUser = {
        ...userData,
        _id: '60d5ecb86c8d4b001c8e4e3a',
        getResetPasswordToken: jest.fn().mockReturnValue('resettoken123'),
        save: jest.fn().mockResolvedValue()
      };
      User.findOne.mockResolvedValue(mockUser);
      sendEmail.mockRejectedValue(new Error('Email service error'));

      const res = await request(app)
        .post('/api/auth/forgotpassword')
        .send(userData);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(mockedUser.resetPasswordToken).toBeUndefined();
      expect(mockedUser.resetPasswordExpire).toBeUndefined();
      expect(mockedUser.save).toHaveBeenCalled();
    });
  });

  describe('PUT /api/auth/resetpassword/:resettoken', () => {
    it('should reset password and return token', async () => {
      const resetToken = 'resettoken123';
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const userData = {
        _id: '60d5ecb86c8d4b001c8e4e3a',
        password: 'oldpassword',
        resetPasswordToken: hashedToken,
        resetPasswordExpire: Date.now() + 3600000, // 1 hour in future
        save: jest.fn().mockResolvedValue(),
        getSignedJwtToken: jest.fn().mockReturnValue('newfakejwttoken')
      };

      User.findOne.mockResolvedValue(userData);

      const res = await request(app)
        .put(`/api/auth/resetpassword/${resetToken}`)
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('newfakejwttoken');
      expect(User.findOne).toHaveBeenCalledWith({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      expect(userData.password).toBe('newpassword123');
      expect(userData.resetPasswordToken).toBeUndefined();
      expect(userData.resetPasswordExpire).toBeUndefined();
      expect(userData.save).toHaveBeenCalled();
    });

    it('should return 400 if token is invalid or expired', async () => {
      User.findOne.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/auth/resetpassword/invalidtoken')
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});