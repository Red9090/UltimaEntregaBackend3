const request = require('supertest');
const app = require('../src/server');
const User = require('../src/models/User');
const Adoption = require('../src/models/Adoption');
const Product = require('../src/models/Product');
const jwt = require('jsonwebtoken');


const createMockUser = (overrides = {}) => {
  const baseUser = {
    _id: '60d5ec49ff86dd0015789abc',
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


const setAuth = (token) => {
  return { Authorization: `Bearer ${token}` };
};

describe('Adoption API', () => {
  let mockJwtVerify;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockJwtVerify = jest.spyOn(jwt, 'verify').mockImplementation((token, secret) => {
      return { id: '60d5ec49ff86dd0015789abc' };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  
  describe('GET /api/adoptions', () => {
    it('should get all adoptions', async () => {
      const adminUser = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };
      const adoptions = [
        {
          _id: '60d5ec49ff86dd0015789ghi',
          user: '60d5ec49ff86dd0015789abc',
          product: '60d5ec49ff86dd0015789def',
          amount: 50.00,
          message: 'I want to adopt this product!',
          status: 'pending'
        },
        {
          _id: 'anotherid',
          user: '60d5ec49ff86dd0015789abc',
          product: '60d5ec49ff86dd0015789def',
          amount: 75.00,
          message: 'Another adoption',
          status: 'completed'
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
        if (id === '60d5ec49ff86dd0015789abc') {
        
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'admin',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  // Test GET single adoption
  describe('GET /api/adoptions/:id', () => {
    it('should get a single adoption by ID', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock Adoption.findById for getting single adoption
      // The controller calls: Adoption.findById(id).populate('user', 'name email').populate('product', 'name price')
      const mockPopulate2 = {
        then: (resolve, reject) => resolve({
          _id: '60d5ec49ff86dd0015789ghi',
          user: '60d5ec49ff86dd0015789abc',
          product: '60d5ec49ff86dd0015789def',
          amount: 50.00,
          message: 'I want to adopt this product!',
          status: 'pending'
        })
      };
      const mockPopulate1 = { populate: jest.fn().mockReturnValue(mockPopulate2) };
      const mockFindByIdResult = { populate: jest.fn().mockReturnValue(mockPopulate1) };
      Adoption.findById = jest.fn().mockReturnValue(mockFindByIdResult);

      // Mock User.findById for authentication
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get(`/api/adoptions/60d5ec49ff86dd0015789ghi`)
        .set(setAuth('fakejwttoken'))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe('60d5ec49ff86dd0015789ghi');
    });

    it('should return 404 for invalid adoption ID', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock Adoption.findById to return null for invalid ID
      const mockPopulate2 = {
        then: (resolve, reject) => resolve(null)
      };
      const mockPopulate1 = { populate: jest.fn().mockReturnValue(mockPopulate2) };
      const mockFindByIdResult = { populate: jest.fn().mockReturnValue(mockPopulate1) };
      Adoption.findById = jest.fn().mockReturnValue(mockFindByIdResult);

      // Mock User.findById for authentication
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get('/api/adoptions/invalidid')
        .set(setAuth('fakejwttoken'))
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // Test CREATE adoption
  describe('POST /api/adoptions', () => {
    it('should create a new adoption', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      // Mock Product.findById for product verification
      Product.findById = jest.fn().mockResolvedValue({
        _id: '60d5ec49ff86dd0015789def',
        name: 'Test Product',
        price: 29.99,
        description: 'A test product',
        image: 'test.jpg',
        category: 'Electronics',
        countInStock: 10
      });

      // Mock Adoption.create
      Adoption.create = jest.fn().mockResolvedValue({
        _id: '60d5ec49ff86dd0015789jkl',
        user: '60d5ec49ff86dd0015789abc',
        product: '60d5ec49ff86dd0015789def',
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending'
      });

      const adoptionData = {
        user: '60d5ec49ff86dd0015789abc',
        product: '60d5ec49ff86dd0015789def',
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
    });

    it('should return 400 if required fields are missing', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      // Mock Product.findById to return a valid product (so we pass the product check)
      Product.findById = jest.fn().mockResolvedValue({
        _id: '60d5ec49ff86dd0015789def',
        name: 'Test Product',
        price: 29.99,
        description: 'A test product',
        image: 'test.jpg',
        category: 'Electronics',
        countInStock: 10
      });

      // Mock Adoption.create to simulate validation error when required fields are missing
      // We'll check what gets passed to it and return appropriate response
      Adoption.create = jest.fn().mockImplementation((adoptionData) => {
        // If amount is missing or invalid, simulate Mongoose validation error
        if (!adoptionData.amount || adoptionData.amount < 1) {
          const error = new Error('Adoption validation failed: amount: Path `amount` is required.');
          error.name = 'ValidationError';
          throw error;
        }
        // Otherwise return a valid adoption object
        return Promise.resolve({
          _id: '60d5ec49ff86dd0015789jkl',
          user: adoptionData.user,
          product: adoptionData.product,
          amount: adoptionData.amount,
          message: adoptionData.message || '',
          status: adoptionData.status || 'pending'
        });
      });

      const res = await request(app)
        .post('/api/adoptions')
        .set(setAuth('fakejwttoken'))
        .send({
          // Include product ID so we pass the product check, but omit amount (required)
          product: '60d5ec49ff86dd0015789def'
        });

      expect(res.status).toBe(400);

      expect(res.body.success).toBe(false);
    });
  });

  // Test UPDATE adoption
  describe('PUT /api/adoptions/:id', () => {
    it('should update an adoption', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById (called first in controller)
      const mockFindByIdResult = {
        _id: '60d5ec49ff86dd0015789ghi',
        user: '60d5ec49ff86dd0015789abc',
        product: '60d5ec49ff86dd0015789def',
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending'
      };
      Adoption.findById = jest.fn().mockResolvedValue(mockFindByIdResult);

      // Mock Adoption.findByIdAndUpdate
      Adoption.findByIdAndUpdate = jest.fn().mockResolvedValue({
        _id: '60d5ec49ff86dd0015789ghi',
        user: '60d5ec49ff86dd0015789abc',
        product: '60d5ec49ff86dd0015789def',
        amount: 75.00,
        message: 'Updated message!',
        status: 'completed'
      });

      const updateData = {
        amount: 75.00,
        message: 'Updated message!',
        status: 'completed'
      };

      const res = await request(app)
        .put(`/api/adoptions/60d5ec49ff86dd0015789ghi`)
        .set(setAuth('fakejwttoken'))
        .send(updateData)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(75.00);
      expect(res.body.data.message).toBe('Updated message!');
      expect(res.body.data.status).toBe('completed');
    });

    it('should return 404 for invalid adoption ID', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById to return null for invalid ID (this will trigger 404 in controller)
      Adoption.findById = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .put('/api/adoptions/invalidid')
        .set(setAuth('fakejwttoken'))
        .send({ amount: 50.00 })
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  // Test DELETE adoption
  describe('DELETE /api/adoptions/:id', () => {
    it('should delete an adoption', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById and remove
      const mockAdoption = {
        _id: '60d5ec49ff86dd0015789ghi',
        user: '60d5ec49ff86dd0015789abc',
        product: '60d5ec49ff86dd0015789def',
        amount: 50.00,
        message: 'I want to adopt this product!',
        status: 'pending',
        remove: jest.fn().mockResolvedValue()
      };
      Adoption.findById = jest.fn().mockResolvedValue(mockAdoption);

      const res = await request(app)
        .delete(`/api/adoptions/60d5ec49ff86dd0015789ghi`)
        .set(setAuth('fakejwttoken'))
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockAdoption.remove).toHaveBeenCalled();
    });

    it('should return 404 for invalid adoption ID', async () => {
      const user = {
        _id: '60d5ec49ff86dd0015789abc',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        isModified: () => false,
        save: jest.fn().mockResolvedValue(this),
        getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
        matchPassword: jest.fn().mockResolvedValue(true)
      };

      // Mock User.findById for user verification during auth
      User.findById.mockImplementation((id) => {
        if (id === '60d5ec49ff86dd0015789abc') {
          // Return user object with id field (not _id) to match what controller expects
          return Promise.resolve({
            id: '60d5ec49ff86dd0015789abc',
            name: 'Test User',
            email: 'test@example.com',
            role: 'user',
            isModified: () => false,
            save: jest.fn().mockResolvedValue(this),
            getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
            matchPassword: jest.fn().mockResolvedValue(true)
          });
        }
        return Promise.resolve(null);
      });

      // Mock Adoption.findById to return null for invalid ID
      Adoption.findById = jest.fn().mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/adoptions/invalidid')
        .set(setAuth('fakejwttoken'))
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});