const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const Adoption = require('../src/models/Adoption');
const Product = require('../src/models/Product');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');


const createMockUser = (overrides = {}) => {
  const baseUser = {
    _id: new mongoose.Types.ObjectId().toString(),
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


const createAdminUser = (overrides = {}) => {
  const baseUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    isModified: () => false,
    save: jest.fn().mockResolvedValue(this),
    getSignedJwtToken: jest.fn().mockReturnValue('fakejwttokenadmin'),
    matchPassword: jest.fn().mockResolvedValue(true)
  };
  return { ...baseUser, ...overrides };
};


const setAuth = (token) => {
  return { Authorization: `Bearer ${token}` };
};

describe('Adoption API - Comprehensive Tests', () => {
  let mockJwtVerify;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJwtVerify = jest.spyOn(jwt, 'verify').mockImplementation((token, secret) => {
      
      if (token === 'fakejwttoken') {
        return { id: new mongoose.Types.ObjectId().toString() };
      } else if (token === 'fakejwttokenadmin') {
        return { id: new mongoose.Types.ObjectId().toString() };
      }
      return { id: 'invaliduser' };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/adoptions', () => {
    it('should get all adoptions when authenticated', async () => {
      const user = createMockUser();
      const adoptions = [
        {
          _id: new mongoose.Types.ObjectId().toString(),
          user: user._id,
          product: new mongoose.Types.ObjectId().toString(),
          amount: 50.00,
          message: 'I want to adopt this product!',
          status: 'pending'
        }
      ];

      
      const mockPopulate = jest.fn().mockReturnThis();
      const mockFindResult = {
        populate: mockPopulate,
        then: (resolve, reject) => resolve(adoptions)
      };
      Adoption.find.mockReturnValue(mockFindResult);

    
      Adoption.countDocuments.mockResolvedValue(adoptions.length);

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/adoptions')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should return 401 when invalid token is provided', async () => {
      
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const res = await request(app)
        .get('/api/adoptions')
        .set(setAuth('invalidtoken'))
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/adoptions/:id', () => {
    it('should get a single adoption by ID when authenticated', async () => {
      const user = createMockUser();
      const adoptionId = new mongoose.Types.ObjectId().toString();
      const productId = new mongoose.Types.ObjectId().toString();

      const adoption = {
        _id: adoptionId,
        user: user._id,
        product: productId,
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending'
      };

      
      const mockPopulateUser = {
        then: (resolve, reject) => resolve({
          ...adoption,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email
          }
        })
      };
      const mockPopulateProduct = {
        populate: jest.fn().mockReturnValue(mockPopulateUser)
      };
      const mockFindByIdResult = {
        populate: jest.fn().mockReturnValue(mockPopulateProduct)
      };
      Adoption.findById = jest.fn().mockReturnValue(mockFindByIdResult);

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttoken'))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(adoptionId);
    });

    it('should return 404 for non-existent adoption ID', async () => {
      const user = createMockUser();
      const adoptionId = new mongoose.Types.ObjectId().toString();

      
      const mockPopulateUser = {
        then: (resolve, reject) => resolve(null)
      };
      const mockPopulateProduct = {
        populate: jest.fn().mockReturnValue(mockPopulateUser)
      };
      const mockFindByIdResult = {
        populate: jest.fn().mockReturnValue(mockPopulateProduct)
      };
      Adoption.findById = jest.fn().mockReturnValue(mockFindByIdResult);

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttoken'))
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/adoptions/12345')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/adoptions', () => {
    it('should create a new adoption when authenticated with valid data', async () => {
      const user = createMockUser();
      const productId = new mongoose.Types.ObjectId().toString();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

     
      Product.findById = jest.fn().mockResolvedValue({
        _id: productId,
        name: 'Test Product',
        price: 29.99,
        description: 'A test product',
        image: 'test.jpg',
        category: 'Electronics',
        countInStock: 10
      });

      
      const adoptionId = new mongoose.Types.ObjectId().toString();
      Adoption.create = jest.fn().mockResolvedValue({
        _id: adoptionId,
        user: user._id,
        product: productId,
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending'
      });

      const adoptionData = {
        product: productId,
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending'
      };

      const res = await request(app)
        .post('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .send(adoptionData)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(50.00);
      expect(res.body.data.message).toBe('I want to adopt this product!');
      expect(res.body.data.product).toBe(productId);
    });

    it('should return 401 when no token is provided', async () => {
      const res = await request(app)
        .post('/api/adoptions')
        .send({})
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 403 when user is not authorized (wrong role)', async () => {
      
      const guestUser = {
        _id: new mongoose.Types.ObjectId().toString(),
        name: 'Guest User',
        email: 'guest@example.com',
        role: 'guest', 
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwtguest'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      
      jest.spyOn(jwt, 'verify').mockImplementation((token, secret) => {
        if (token === 'fakejwtguest') {
          return { id: guestUser._id };
        }
        return { id: 'invaliduser' };
      });

      
      User.findById.mockImplementation((id) => {
        if (id === guestUser._id) {
          return Promise.resolve({
            ...guestUser,
            id: guestUser._id
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/adoptions')
        .set(setAuth('fakejwtguest'))
        .send({
          product: new mongoose.Types.ObjectId().toString(),
          amount: 50.00
        })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should return 400 if product ID is invalid', async () => {
      const user = createMockUser();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

     
      Product.findById = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .post('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .send({
          product: 'invalidproductid',
          amount: 50.00
        })
        .expect(404); 

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid amount (less than minimum)', async () => {
      const user = createMockUser();
      const productId = new mongoose.Types.ObjectId().toString();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      
      Product.findById = jest.fn().mockResolvedValue({
        _id: productId,
        name: 'Test Product',
        price: 29.99
      });

     
      Adoption.create = jest.fn().mockImplementation((adoptionData) => {
        if (adoptionData.amount < 1) {
          const error = new Error('Adoption validation failed: amount: Path `amount` (`0.5` is less than minimum allowed value (1)).');
          error.name = 'ValidationError';
          throw error;
        }
        return Promise.reject(new Error('Unexpected success'));
      });

      const res = await request(app)
        .post('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .send({
          product: productId,
          amount: 0.5 
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/amount/i);
    });

    it('should return 400 for invalid status (not in enum)', async () => {
      const user = createMockUser();
      const productId = new mongoose.Types.ObjectId().toString();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      
      Product.findById = jest.fn().mockResolvedValue({
        _id: productId,
        name: 'Test Product',
        price: 29.99
      });

      
      Adoption.create = jest.fn().mockImplementation((adoptionData) => {
        if (!['pending', 'approved', 'completed', 'cancelled'].includes(adoptionData.status)) {
          const error = new Error('Adoption validation failed: status: `invalidstatus` is not a valid enum value for path `status`.');
          error.name = 'ValidationError';
          throw error;
        }
        return Promise.reject(new Error('Unexpected success'));
      });

      const res = await request(app)
        .post('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .send({
          product: productId,
          amount: 50.00,
          status: 'invalidstatus' 
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/status/i);
    });

    it('should return 400 for message exceeding max length', async () => {
      const user = createMockUser();
      const productId = new mongoose.Types.ObjectId().toString();
      const longMessage = 'a'.repeat(501); 

     
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      
      Product.findById = jest.fn().mockResolvedValue({
        _id: productId,
        name: 'Test Product',
        price: 29.99
      });

      
      Adoption.create = jest.fn().mockImplementation((adoptionData) => {
        if (adoptionData.message && adoptionData.message.length > 500) {
          const error = new Error('Adoption validation failed: message: Path `message` (`501` characters) exceeds the maximum allowed length (500).');
          error.name = 'ValidationError';
          throw error;
        }
        return Promise.reject(new Error('Unexpected success'));
      });

      const res = await request(app)
        .post('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .send({
          product: productId,
          amount: 50.00,
          message: longMessage
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/message/i);
    });
  });

  describe('PUT /api/adoptions/:id', () => {
    it('should update an adoption when user owns it', async () => {
      const user = createMockUser();
      const adoptionId = new mongoose.Types.ObjectId().toString();
      const productId = new mongoose.Types.ObjectId().toString();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

     
      const existingAdoption = {
        _id: adoptionId,
        user: user._id, 
        product: productId,
        amount: 50.00,
        message: 'Original message',
        status: 'pending'
      };
      Adoption.findById = jest.fn().mockResolvedValue(existingAdoption);

      
      const updatedAdoption = {
        _id: adoptionId,
        user: user._id,
        product: productId,
        amount: 75.00,
        message: 'Updated message!',
        status: 'completed'
      };
      Adoption.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedAdoption);

      const updateData = {
        amount: 75.00,
        message: 'Updated message!',
        status: 'completed'
      };

      const res = await request(app)
        .put(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttoken'))
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(75.00);
      expect(res.body.data.message).toBe('Updated message!');
      expect(res.body.data.status).toBe('completed');
    });

    it('should return 403 when user tries to update adoption they do not own', async () => {
      const user = createMockUser({ _id: 'userid1' });
      const otherUser = createMockUser({ _id: 'userid2', name: 'Other User', email: 'other@example.com' });
      const adoptionId = new mongoose.Types.ObjectId().toString();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      
      const adoption = {
        _id: adoptionId,
        user: otherUser._id, 
        product: new mongoose.Types.ObjectId().toString(),
        amount: 50.00,
        message: 'Original message',
        status: 'pending'
      };
      Adoption.findById = jest.fn().mockResolvedValue(adoption);

      const res = await request(app)
        .put(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttoken'))
        .send({ amount: 75.00 })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should allow admin to update any adoption', async () => {
      const adminUser = createAdminUser({ _id: 'adminid' });
      const user = createMockUser({ _id: 'userid1', role: 'user' });
      const adoptionId = new mongoose.Types.ObjectId().toString();

      
      User.findById.mockImplementation((id) => {
        if (id === adminUser._id) {
          return Promise.resolve({
            ...adminUser,
            id: adminUser._id
          });
        }
        return Promise.resolve(null);
      });

      
      const adoption = {
        _id: adoptionId,
        user: user._id, 
        product: new mongoose.Types.ObjectId().toString(),
        amount: 50.00,
        message: 'Original message',
        status: 'pending'
      };
      Adoption.findById = jest.fn().mockResolvedValue(adoption);

      
      const updatedAdoption = {
        _id: adoptionId,
        user: user._id,
        product: new mongoose.Types.ObjectId().toString(),
        amount: 100.00,
        message: 'Admin updated message',
        status: 'approved'
      };
      Adoption.findByIdAndUpdate = jest.fn().mockResolvedValue(updatedAdoption);

      const updateData = {
        amount: 100.00,
        message: 'Admin updated message',
        status: 'approved'
      };

      const res = await request(app)
        .put(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttokenadmin'))
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(100.00);
    });

    it('should return 404 for non-existent adoption ID', async () => {
      const user = createMockUser();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      
      Adoption.findById = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .put('/api/adoptions/invalidid')
        .set(setAuth('fakejwttoken'))
        .send({ amount: 50.00 })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid amount during update', async () => {
      const user = createMockUser();
      const adoptionId = new mongoose.Types.ObjectId().toString();

      
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

     
      const adoption = {
        _id: adoptionId,
        user: user._id,
        product: new mongoose.Types.ObjectId().toString(),
        amount: 50.00,
        message: 'Test message',
        status: 'pending'
      };
      Adoption.findById = jest.fn().mockResolvedValue(adoption);

      
      Adoption.findByIdAndUpdate = jest.fn().mockImplementation((id, updateData, options) => {
        if (updateData.amount < 1) {
          const error = new Error(`Adoption validation failed: amount: Path \`amount\` (${updateData.amount}) is less than minimum allowed value (1).`);
          error.name = 'ValidationError';
          throw error;
        }
        return Promise.reject(new Error('Unexpected success'));
      });

      const res = await request(app)
        .put(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttoken'))
        .send({ amount: 0 }) // Invalid amount
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/amount/i);
    });
  });

  describe('DELETE /api/adoptions/:id', () => {
    it('should delete an adoption when user owns it', async () => {
      const user = createMockUser();
      const adoptionId = new mongoose.Types.ObjectId().toString();

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById and remove
      const adoption = {
        _id: adoptionId,
        user: user._id, // User owns this adoption
        product: new mongoose.Types.ObjectId().toString(),
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending',
        remove: jest.fn().mockResolvedValue()
      };
      Adoption.findById = jest.fn().mockResolvedValue(adoption);

      const res = await request(app)
        .delete(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttoken'))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(adoption.remove).toHaveBeenCalled();
    });

    it('should return 403 when user tries to delete adoption they do not own', async () => {
      const user = createMockUser({ _id: 'userid1' });
      const otherUser = createMockUser({ _id: 'userid2', name: 'Other User', email: 'other@example.com' });
      const adoptionId = new mongoose.Types.ObjectId().toString();

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById - adoption belongs to other user
      const adoption = {
        _id: adoptionId,
        user: otherUser._id, // Owned by other user
        product: new mongoose.Types.ObjectId().toString(),
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending',
        remove: jest.fn().mockResolvedValue()
      };
      Adoption.findById = jest.fn().mockResolvedValue(adoption);

      const res = await request(app)
        .delete(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttoken'))
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should allow admin to delete any adoption', async () => {
      const adminUser = createAdminUser({ _id: 'adminid' });
      const user = createMockUser({ _id: 'userid1', role: 'user' });
      const adoptionId = new mongoose.Types.ObjectId().toString();

      // Mock User.findById for user verification during auth (for admin)
      User.findById.mockImplementation((id) => {
        if (id === adminUser._id) {
          return Promise.resolve({
            ...adminUser,
            id: adminUser._id
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById - adoption belongs to regular user
      const adoption = {
        _id: adoptionId,
        user: user._id, // Owned by regular user
        product: new mongoose.Types.ObjectId().toString(),
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending',
        remove: jest.fn().mockResolvedValue()
      };
      Adoption.findById = jest.fn().mockResolvedValue(adoption);

      const res = await request(app)
        .delete(`/api/adoptions/${adoptionId}`)
        .set(setAuth('fakejwttokenadmin'))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(adoption.remove).toHaveBeenCalled();
    });

    it('should return 404 for non-existent adoption ID', async () => {
      const user = createMockUser();

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === user._id) {
          return Promise.resolve({
            ...user,
            id: user._id
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById to return null for non-existent ID
      Adoption.findById = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/adoptions/invalidid')
        .set(setAuth('fakejwttoken'))
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
});