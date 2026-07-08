const request = require('supertest');
const app = require('../src/server');
const Order = require('../src/models/Order');
const User = require('../src/models/User');
const Product = require('../src/models/Product');

// Mock jsonwebtoken for authentication
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ id: '60d5ecb86c8d4b001c8e4e3a' }),
  sign: jest.fn().mockReturnValue('fakejwttoken')
}));

// Override User.findById to return a promise resolving to a mock user
User.findById = jest.fn().mockImplementation((id) => {
  return Promise.resolve({
    _id: id,
    name: 'Test User',
    email: 'test@example.com',
    role: 'user' // default role
  });
});

// Override Product.findById to return a promise resolving to a mock product
Product.findById = jest.fn().mockImplementation((id) => {
  return Promise.resolve({
    _id: id,
    name: 'Test Product',
    price: 100,
    image: 'test.jpg'
  });
});

// Override Order.findById to return a promise resolving to a mock order
Order.findById = jest.fn().mockImplementation((id) => {
  return Promise.resolve({
    _id: id,
    user: { _id: '60d5ecb86c8d4b001c8e4e3a' }, // matching the mocked user id from jwt
    orderItems: [],
    isPaid: false,
    save: jest.fn().mockResolvedValueThis() // for chaining in tests
  });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Order Endpoints', () => {
  // Helper to create a mock user
  const createMockUser = (overrides = {}) => ({
    _id: '60d5ecb86c8d4b001c8e4e3a',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    getSignedJwtToken: jest.fn().mockReturnValue('fakejwttoken'),
    ...overrides
  });

  // Helper to set auth header
  const setAuth = (token) => ({ Authorization: `Bearer ${token}` });

  describe('GET /api/orders', () => {
    it('should return all orders for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const orders = [
        { _id: '1', user: { name: 'User 1' } },
        { _id: '2', user: { name: 'User 2' } }
      ];

      // Mock Order.find for getting all orders
      Order.find.mockResolvedValue(orders);

      const res = await request(app)
        .get('/api/orders')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(Order.find).toHaveBeenCalled();
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });

      const res = await request(app)
        .get('/api/orders')
        .set(setAuth(regularUser.getSignedJwtToken()));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/orders/myorders', () => {
    it('should return current user\'s orders', async () => {
      const user = createMockUser();
      const orders = [
        { _id: '1', user: { _id: user._id } },
        { _id: '2', user: { _id: user._id } }
      ];

      // Mock Order.find for getting user's orders
      Order.find.mockResolvedValue(orders);

      const res = await request(app)
        .get('/api/orders/myorders')
        .set(setAuth(user.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(Order.find).toHaveBeenCalledWith({ user: user._id });
    });

    it('should return empty array if user has no orders', async () => {
      const user = createMockUser();
      Order.find.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/orders/myorders')
        .set(setAuth(user.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('should return a single order', async () => {
      const user = createMockUser();
      const orderData = {
        _id: 'order1',
        user: { _id: user._id, name: user.name },
        orderItems: [{ name: 'Product 1', qty: 2, price: 50 }],
        totalPrice: 100
      };

      Order.findById.mockResolvedValue(orderData);
      // Mock populate to return the user data
      Order.findById().populate = jest.fn().mockResolvedValue(orderData);

      const res = await request(app)
        .get('/api/orders/order1')
        .set(setAuth(user.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe('order1');
      expect(Order.findById).toHaveBeenCalledWith('order1');
    });

    it('should return 404 if order not found', async () => {
      const user = createMockUser();
      Order.findById.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/orders/nonexistent')
        .set(setAuth(user.getSignedJwtToken()));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const user = createMockUser();
      const orderData = {
        orderItems: [
          { _id: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }
        ],
        shippingAddress: {
          address: '123 Main St',
          city: 'Anytown',
          postalCode: '12345',
          country: 'USA'
        },
        paymentMethod: 'Credit Card',
        itemsPrice: 100,
        taxPrice: 10,
        shippingPrice: 15,
        totalPrice: 125
      };
      const createdOrder = { ...orderData, _id: 'order123', user: user._id };

      Order.create.mockResolvedValue(createdOrder);

      const res = await request(app)
        .post('/api/orders')
        .set(setAuth(user.getSignedJwtToken()))
        .send(orderData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe('order123');
      expect(Order.create).toHaveBeenCalledWith({
        ...orderData,
        user: user._id
      });
    });

    it('should return 400 if no order items', async () => {
      const user = createMockUser();

      const res = await request(app)
        .post('/api/orders')
        .set(setAuth(user.getSignedJwtToken()))
        .send({ orderItems: [] });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/pay', () => {
    it('should update order to paid', async () => {
      const user = createMockUser();
      const order = {
        _id: 'order123',
        user: { _id: user._id },
        isPaid: false,
        save: jest.fn().mockResolvedValue()
      };

      Order.findById.mockResolvedValue(order);

      const paymentData = {
        id: 'paypal123',
        status: 'completed',
        update_time: '2023-01-01T10:00:00Z',
        email_address: 'user@example.com'
      };

      const res = await request(app)
        .put('/api/orders/order123/pay')
        .set(setAuth(user.getSignedJwtToken()))
        .send(paymentData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isPaid).toBe(true);
      expect(Order.findById).toHaveBeenCalledWith('order123');
      expect(order.save).toHaveBeenCalled();
    });

    it('should return 404 if order not found', async () => {
      const user = createMockUser();
      Order.findById.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/orders/nonexistent/pay')
        .set(setAuth(user.getSignedJwtToken()))
        .send({ id: 'pay123' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/orders/:id/deliver', () => {
    it('should update order to delivered for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const order = {
        _id: 'order123',
        user: { _id: 'userid' },
        isDelivered: false,
        save: jest.fn().mockResolvedValue()
      };

      Order.findById.mockResolvedValue(order);

      const res = await request(app)
        .put('/api/orders/order123/deliver')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isDelivered).toBe(true);
      expect(Order.findById).toHaveBeenCalledWith('order123');
      expect(order.save).toHaveBeenCalled();
    });

    it('should return 404 if order not found', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      Order.findById.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/orders/nonexistent/deliver')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });

      const res = await request(app)
        .put('/api/orders/order123/deliver')
        .set(setAuth(regularUser.getSignedJwtToken()));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('should delete an order for admin', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      const orderToDelete = { _id: 'order123', remove: jest.fn().mockResolvedValue() };

      Order.findById.mockResolvedValue(orderToDelete);

      const res = await request(app)
        .delete('/api/orders/order123')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Order.findById).toHaveBeenCalledWith('order123');
      expect(orderToDelete.remove).toHaveBeenCalled();
    });

    it('should return 404 if order not found', async () => {
      const adminUser = createMockUser({ role: 'admin' });
      Order.findById.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/orders/nonexistent')
        .set(setAuth(adminUser.getSignedJwtToken()));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for non-admin user', async () => {
      const regularUser = createMockUser({ role: 'user' });

      const res = await request(app)
        .delete('/api/orders/order123')
        .set(setAuth(regularUser.getSignedJwtToken()));

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});

describe('POST /api/orders/:id/items', () => {
  it('should add item to order', async () => {
    const user = createMockUser();
    const product = { _id: 'product1', name: 'Product 1', price: 50, image: 'image1.jpg' };
    const order = {
      _id: 'order123',
      user: { _id: user._id },
      orderItems: [],
      isPaid: false,
      save: jest.fn().mockResolvedValue()
    };

    Order.findById.mockResolvedValue(order);
    Product.findById.mockResolvedValue(product);

    const res = await request(app)
      .post('/api/orders/order123/items')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ productId: 'product1', quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderItems.length).toBe(1);
    expect(res.body.data.orderItems[0].quantity).toBe(2);
    expect(Order.findById).toHaveBeenCalledWith('order123');
    expect(Product.findById).toHaveBeenCalledWith('product1');
    expect(order.save).toHaveBeenCalled();
  });

  it('should update quantity if item already exists', async () => {
    const user = createMockUser();
    const product = { _id: 'product1', name: 'Product 1', price: 50, image: 'image1.jpg' };
    const order = {
      _id: 'order123',
      user: { _id: user._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false,
      save: jest.fn().mockResolvedValue()
    };

    Order.findById.mockResolvedValue(order);
    Product.findById.mockResolvedValue(product);

    const res = await request(app)
      .post('/api/orders/order123/items')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ productId: 'product1', quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderItems.length).toBe(1);
    expect(res.body.data.orderItems[0].quantity).toBe(5); // 2 + 3
    expect(Order.findById).toHaveBeenCalledWith('order123');
    expect(Product.findById).toHaveBeenCalledWith('product1');
    expect(order.save).toHaveBeenCalled();
  });

  it('should return 404 if order not found', async () => {
    const user = createMockUser();

    Order.findById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/orders/nonexistent/items')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ productId: 'product1', quantity: 2 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 if user does not own order', async () => {
    const user = createMockUser();
    const otherUser = createMockUser({ _id: 'otheruserid' });
    const order = {
      _id: 'order123',
      user: { _id: otherUser._id },
      orderItems: [],
      isPaid: false
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .post('/api/orders/order123/items')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ productId: 'product1', quantity: 2 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('PUT /api/orders/:id/items/:itemId', () => {
  it('should update item quantity in order', async () => {
    const user = createMockUser();
    const order = {
      _id: 'order123',
      user: { _id: user._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false,
      save: jest.fn().mockResolvedValue()
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .put('/api/orders/order123/items/item1')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderItems[0].quantity).toBe(5);
    expect(Order.findById).toHaveBeenCalledWith('order123');
    expect(order.save).toHaveBeenCalled();
  });

  it('should remove item if quantity is zero or less', async () => {
    const user = createMockUser();
    const order = {
      _id: 'order123',
      user: { _id: user._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false,
      save: jest.fn().mockResolvedValue()
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .put('/api/orders/order123/items/item1')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ quantity: 0 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderItems.length).toBe(0);
    expect(Order.findById).toHaveBeenCalledWith('order123');
    expect(order.save).toHaveBeenCalled();
  });

  it('should return 404 if order not found', async () => {
    const user = createMockUser();

    Order.findById.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/orders/nonexistent/items/item1')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ quantity: 5 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 if item not found', async () => {
    const user = createMockUser();
    const order = {
      _id: 'order123',
      user: { _id: user._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .put('/api/orders/order123/items/nonexistent')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ quantity: 5 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 if user does not own order', async () => {
    const user = createMockUser();
    const otherUser = createMockUser({ _id: 'otheruserid' });
    const order = {
      _id: 'order123',
      user: { _id: otherUser._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .put('/api/orders/order123/items/item1')
      .set(setAuth(user.getSignedJwtToken()))
      .send({ quantity: 5 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/orders/:id/items/:itemId', () => {
  it('should remove item from order', async () => {
    const user = createMockUser();
    const order = {
      _id: 'order123',
      user: { _id: user._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false,
      save: jest.fn().mockResolvedValue()
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .delete('/api/orders/order123/items/item1')
      .set(setAuth(user.getSignedJwtToken()));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderItems.length).toBe(0);
    expect(Order.findById).toHaveBeenCalledWith('order123');
    expect(order.save).toHaveBeenCalled();
  });

  it('should return 404 if order not found', async () => {
    const user = createMockUser();

    Order.findById.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/orders/nonexistent/items/item1')
      .set(setAuth(user.getSignedJwtToken()));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 if item not found', async () => {
    const user = createMockUser();
    const order = {
      _id: 'order123',
      user: { _id: user._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .delete('/api/orders/order123/items/nonexistent')
      .set(setAuth(user.getSignedJwtToken()));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 403 if user does not own order', async () => {
    const user = createMockUser();
    const otherUser = createMockUser({ _id: 'otheruserid' });
    const order = {
      _id: 'order123',
      user: { _id: otherUser._id },
      orderItems: [{ _id: 'item1', product: 'product1', name: 'Product 1', qty: 2, price: 50, image: 'image1.jpg' }],
      isPaid: false
    };

    Order.findById.mockResolvedValue(order);

    const res = await request(app)
      .delete('/api/orders/order123/items/item1')
      .set(setAuth(user.getSignedJwtToken()));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});