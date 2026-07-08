const asyncHandler = require('../middleware/async');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res, next) => {
  const orders = await Order.find({ user: req.user.id }).populate(
    'user',
    'name email'
  );
  res.status(200).json({ success: true, count: orders.length, data: orders });
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private/Admin
exports.getOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    'user',
    'name email'
  );

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, data: order });
});

// @desc    Create order
// @route   POST /api/orders
// @access  Private
exports.addOrderItems = asyncHandler(async (req, res, next) => {
  const {
    orderItems,
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice,
  } = req.body;

  if (orderItems && orderItems.length === 0) {
    return next(new ErrorResponse('No order items', 400));
  } else {
    const order = await Order.create({
      orderItems,
      user: req.user.id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    res.status(201).json({ success: true, data: order });
  }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
exports.updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    };

    const updatedOrder = await order.save();

    res.status(200).json({ success: true, data: updatedOrder });
  } else {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();

    res.status(200).json({ success: true, data: updatedOrder });
  } else {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }
});

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
exports.deleteOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (order) {
    await order.remove();
    res.status(200).json({ success: true, data: {} });
  } else {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }
});

// @desc    Add item to order
// @route   POST /api/orders/:id/items
// @access  Private
exports.addOrderItem = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }

  // Check if user owns the order or is admin
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to modify this order`, 403));
  }

  const { productId, quantity } = req.body;

  // Fetch product details
  const product = await Product.findById(productId);
  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${productId}`, 404));
  }

  // Check if item already exists in order
  const existingItemIndex = order.orderItems.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex >= 0) {
    // Update quantity if item exists
    order.orderItems[existingItemIndex].quantity += quantity;
  } else {
    // Add new item
    order.orderItems.push({
      product: productId,
      quantity: quantity,
      name: product.name,
      image: product.image,
      price: product.price
    });
  }

  // Recalculate totals
  const calculateTotals = (order) => {
    let itemsPrice = 0;
    order.orderItems.forEach(item => {
      itemsPrice += item.price * item.quantity;
    });

    const taxPrice = 0; // Placeholder - would be calculated based on tax rate
    const shippingPrice = itemsPrice > 0 ? 10 : 0; // Example: free shipping over $50
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    return { itemsPrice, taxPrice, shippingPrice, totalPrice };
  };

  const { itemsPrice, taxPrice, shippingPrice, totalPrice } = calculateTotals(order);

  order.itemsPrice = itemsPrice;
  order.taxPrice = taxPrice;
  order.shippingPrice = shippingPrice;
  order.totalPrice = totalPrice;

  await order.save();

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update item quantity in order
// @route   PUT /api/orders/:id/items/:itemId
// @access  Private
exports.updateOrderItemQuantity = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }

  // Check if user owns the order or is admin
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to modify this order`, 403));
  }

  const { quantity } = req.body;
  const itemId = req.params.itemId;

  // Find the item
  const itemIndex = order.orderItems.findIndex(item => item._id.toString() === itemId);

  if (itemIndex === -1) {
    return next(new ErrorResponse(`Item not found in order`, 404));
  }

  if (quantity <= 0) {
    // If quantity is zero or less, remove the item
    order.orderItems.splice(itemIndex, 1);
  } else {
    // Update quantity
    order.orderItems[itemIndex].quantity = quantity;
  }

  // Recalculate totals
  const calculateTotals = (order) => {
    let itemsPrice = 0;
    order.orderItems.forEach(item => {
      itemsPrice += item.price * item.quantity;
    });

    const taxPrice = 0; // Placeholder - would be calculated based on tax rate
    const shippingPrice = itemsPrice > 0 ? 10 : 0; // Example: free shipping over $50
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    return { itemsPrice, taxPrice, shippingPrice, totalPrice };
  };

  const { itemsPrice, taxPrice, shippingPrice, totalPrice } = calculateTotals(order);

  order.itemsPrice = itemsPrice;
  order.taxPrice = taxPrice;
  order.shippingPrice = shippingPrice;
  order.totalPrice = totalPrice;

  await order.save();

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Remove item from order
// @route   DELETE /api/orders/:id/items/:itemId
// @access  Private
exports.removeOrderItem = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
  }

  // Check if user owns the order or is admin
  if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to modify this order`, 403));
  }

  const itemId = req.params.itemId;

  // Find and remove the item
  const itemIndex = order.orderItems.findIndex(item => item._id.toString() === itemId);

  if (itemIndex === -1) {
    return next(new ErrorResponse(`Item not found in order`, 404));
  }

  order.orderItems.splice(itemIndex, 1);

  // Recalculate totals
  const calculateTotals = (order) => {
    let itemsPrice = 0;
    order.orderItems.forEach(item => {
      itemsPrice += item.price * item.quantity;
    });

    const taxPrice = 0; // Placeholder - would be calculated based on tax rate
    const shippingPrice = itemsPrice > 0 ? 10 : 0; // Example: free shipping over $50
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    return { itemsPrice, taxPrice, shippingPrice, totalPrice };
  };

  const { itemsPrice, taxPrice, shippingPrice, totalPrice } = calculateTotals(order);

  order.itemsPrice = itemsPrice;
  order.taxPrice = taxPrice;
  order.shippingPrice = shippingPrice;
  order.totalPrice = totalPrice;

  await order.save();

  res.status(200).json({
    success: true,
    data: order
  });
});

module.exports = exports;