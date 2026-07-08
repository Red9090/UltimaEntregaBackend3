const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Endpoints', () => {
  // Helper to create a mock user with token
  const createMockUser = (overrides = {}) => {
    const baseUser = {
      _id: '60d5ecb86c8d4b001c8e4e3a',
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      isModified: () => false,
      save: jest.fn().mockResolvedValue(this),
      getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
      matchPassword: jest.fn().mockResolvedValue(true)
    };
    return { ...baseUser, ...overrides };
  };

  // Helper to set auth header
  const setAuth = (token) => {
    return { Authorization: `Bearer ${token}` };
  };

  describe('GET /api/users', () => {
    it('should return all users for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const users = [createMockUser(), createMockUser({ _id: 'anotherid' })];

      // Mock User.find for getting all users
      User.find.mockResolvedValue(users);

      const res = await request(app)
        .get('/api/users')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(User.find).toHaveBeenCalled();
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });

      const res = await request(app)
        .get('/api/users')
        .set(setAuth(regularUser.getSignedJwtToken()));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a single user for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const targetUser = createMockUser({ _id: 'targetid', name: 'Target User' });

      User.findById.mockResolvedValue(targetUser);

      const res = await request(app)
        .get(`/api/users/targetid`)
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe('targetid');
      expect(User.findById).toHaveBeenCalledWith('targetid');
    });

    it('should return 404 if user not found', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      User.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/nonexistent')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const updateData = { name: 'Updated Name' };
      const updatedUser = { ...updateData, _id: 'targetid' };

      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .put('/api/users/targetid')
        .set(setAuth(adminUser.getSignedJwtToken()))
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'targetid',
        updateData,
        { new: true, runValidators: true }
      );
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const userToDelete = { _id: 'targetid', remove: jest.fn().mockResolvedValue() };

      User.findById.mockResolvedValue(userToDelete);

      const res = await request(app)
        .delete('/api/users/targetid')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(User.findById).toHaveBeenCalledWith('targetid');
      expect(userToDelete.remove).toHaveBeenCalled();
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const user = createMockUser();

      // Mock User.findById to return the user when called with user._id
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve(user);
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get('/api/users/me')
        .set(setAuth(user.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(user._id);
      expect(User.findById).toHaveBeenCalledWith(user._id);
    });
  });

  describe('PUT /api/users/updatepassword', () => {
    it('should update password when current password is correct', async () => {
      const user = createMockUser({
        // For this test, we need to simulate the select('+password') behavior
        // The actual implementation finds user by id and selects +password
        _id: '60d5ecb86c8d4b001c8e4e3a',
        password: 'currenthashedpassword', // This would be the hashed password in DB
        matchPassword: jest.fn().mockResolvedValue(true), // Returns true for correct password
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('newtoken')
      });

      // Mock the findById that happens in updatePassword controller
      // The controller does: User.findById(req.user.id).select('+password')
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          // Return a user that has the password field selected (simulating .select('+password'))
          const userWithPassword = { ...user, select: () => userWithPassword };
          return Promise.resolve(userWithPassword);
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .put('/api/users/updatepassword')
        .set(setAuth(user.getSignedJwtToken()))
        .send({ currentPassword: 'currentpassword', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBe('newtoken');
      expect(user.matchPassword).toHaveBeenCalledWith('currentpassword');
      expect(user.save).toHaveBeenCalled();
    });

    it('should return 401 if current password is incorrect', async () => {
      const user = createMockUser({
        _id: '60d5ecb86c8d4b001c8e4e3a',
        matchPassword: jest.fn().mockResolvedValue(false) // Returns false for wrong password
      });

      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          const userWithPassword = { ...user, select: () => userWithPassword };
          return Promise.resolve(userWithPassword);
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .put('/api/users/updatepassword')
        .set(setAuth(user.getSignedJwtToken()))
        .send({ currentPassword: 'wrongpassword', newPassword: 'newpassword123' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(user.matchPassword).toHaveBeenCalledWith('wrongpassword');
    });
  });

  describe('PUT /api/users/updatedetails', () => {
    it('should update user details', async () => {
      const user = createMockUser();
      const updateData = { name: 'New Name', email: 'newemail@example.com' };
      const updatedUser = { ...updateData, _id: user._id };

      // Mock User.findByIdAndUpdate
      User.findByIdAndUpdate.mockResolvedValue(updatedUser);

      const res = await request(app)
        .put('/api/users/updatedetails')
        .set(setAuth(user.getSignedJwtToken()))
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Name');
      expect(res.body.data.email).toBe('newemail@example.com');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        user._id,
        updateData,
        { new: true, runValidators: true }
      );
    });
  });
});