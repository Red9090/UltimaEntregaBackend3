const request = require('supertest');
const app = require('../src/server');
const Product = require('../src/models/Product');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');

// Helper to create a mock user
const createMockUser = (overrides = {}) => ({
  _id: '60d5ecb86c8d4b001c8e4e3a',
  role: 'admin',
  getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
  ...overrides
});

// Helper to set auth header
const setAuth = (token) => ({ Authorization: `Bearer ${token}` });

describe('Product Endpoints', () => {
  let mockJwtVerify;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock jwt.verify to return a decoded token with user id
    mockJwtVerify = jest.spyOn(jwt, 'verify').mockImplementation((token, secret) => {
      return { id: '60d5ecb86c8d4b001c8e4e3a' };
    });

    // Mock User.findById to return a user object when awaited
    const mockUser = {
      _id: '60d5ecb86c8d4b001c8e4e3a',
      id: '60d5ecb86c8d4b001c8e4e3a',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin'
    };
    User.findById.mockImplementation((id) => {
      return Promise.resolve(mockUser);
    });
  });
  describe('GET /api/products', () => {
    it('should return all products', async () => {
      const products = [
        { _id: '1', name: 'Product 1', price: 100 },
        { _id: '2', name: 'Product 2', price: 200 }
      ];

      // Mock Product.find for getting all products
      Product.find.mockResolvedValue(products);

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(Product.find).toHaveBeenCalled();
    });

    it('should handle empty products list', async () => {
      Product.find.mockResolvedValue([]);

      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a single product', async () => {
      const productData = { _id: '1', name: 'Test Product', price: 99.99, description: 'A test product' };

      Product.findById.mockResolvedValue(productData);

      const res = await request(app).get('/api/products/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe('1');
      expect(Product.findById).toHaveBeenCalledWith('1');
    });

    it('should return 404 if product not found', async () => {
      Product.findById.mockResolvedValue(null);

      const res = await request(app).get('/api/products/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/products', () => {
    it('should create a product for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const productData = { name: 'New Product', price: 149.99, description: 'A new product', category: 'Electronics' };
      const createdProduct = { ...productData, _id: 'newproductid', user: adminUser._id };

      Product.create.mockResolvedValue(createdProduct);

      const res = await request(app)
        .post('/api/products')
        .set(setAuth(adminUser.getSignedJwtToken()))
        .send(productData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Product');
      expect(Product.create).toHaveBeenCalledWith({
        ...productData,
        user: adminUser._id
      });
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });
      const productData = { name: 'New Product', price: 149.99 };

      const res = await request(app)
        .post('/api/products')
        .set(setAuth(regularUser.getSignedJwtToken()))
        .send(productData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if required fields are missing', async () => {
      const adminUser = createMockUser({ role: 'admin' });

      // Mock Product.create to throw ValidationError for empty data
      Product.create.mockRejectedValueOnce(new Error("Product validation failed: name: Path `name` is required., price: Path `price` is required."));

      const res = await request(app)
        .post('/api/products')
        .set(setAuth(adminUser.getSignedJwtToken()))
        .send({}); // Missing required fields

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update a product for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const updateData = { name: 'Updated Product', price: 199.99 };
      const updatedProduct = { ...updateData, _id: 'productid' };

      // Mock findById to return a product (needed for the check in controller)
      Product.findById.mockResolvedValueOnce({ _id: 'productid' });
      // Mock findByIdAndUpdate to return the updated product
      Product.findByIdAndUpdate.mockResolvedValue(updatedProduct);

      const res = await request(app)
        .put('/api/products/productid')
        .set(setAuth(adminUser.getSignedJwtToken()))
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Product');
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        'productid',
        updateData,
        { new: true, runValidators: true }
      );
    });

    it('should return 404 if product not found', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      Product.findById.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/products/nonexistent')
        .set(setAuth(adminUser.getSignedJwtToken()))
        .send({ name: 'Updated Product' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });

      const res = await request(app)
        .put('/api/products/productid')
        .set(setAuth(regularUser.getSignedJwtToken()))
        .send({ name: 'Updated Product' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const productToDelete = { _id: 'productid', remove: jest.fn().mockResolvedValue() };

      Product.findById.mockResolvedValue(productToDelete);

      const res = await request(app)
        .delete('/api/products/productid')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Product.findById).toHaveBeenCalledWith('productid');
      expect(productToDelete.remove).toHaveBeenCalled();
    });

    it('should return 404 if product not found', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      Product.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/products/nonexistent')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });

      const res = await request(app)
        .delete('/api/products/productid')
        .set(setAuth(regularUser.getSignedJwtToken()));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/products/:id/photo', () => {
    it('should upload photo for product for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const product = { _id: 'productid', name: 'Test Product' };

      Product.findById.mockResolvedValue(product);

      const res = await request(app)
        .put('/api/products/productid/photo')
        .set(setAuth(adminUser.getSignedJwtToken()))
        .send({}); // In a real test, we'd send file data, but this is a placeholder endpoint

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Product.findById).toHaveBeenCalledWith('productid');
    });

    it('should return 404 if product not found', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      Product.findById.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/products/nonexistent/photo')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });

      const res = await request(app)
        .put('/api/products/productid/photo')
        .set(setAuth(regularUser.getSignedJwtToken()));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});