const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  addOrderItems,
  updateOrderToPaid,
  updateOrderToDelivered,
  deleteOrder,
  getMyOrders,
} = require('../controllers/orderController');

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Order = require('../models/Order');


// Re-route into other resource routers
const orderItemsRouter = require('./orderItems');
router.use('/:orderId/items', orderItemsRouter);

router.route('/').get(protect, authorize('admin'), advancedResults(Order), getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/').post(protect, addOrderItems);
router.route('/:id').get(protect, getOrder);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/deliver').put(protect, authorize('admin'), updateOrderToDelivered);
router.route('/:id').delete(protect, authorize('admin'), deleteOrder);

module.exports = router;