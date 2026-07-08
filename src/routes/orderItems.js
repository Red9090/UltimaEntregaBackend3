const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  addOrderItem,
  updateOrderItemQuantity,
  removeOrderItem
} = require('../controllers/orderController');

const { protect } = require('../middleware/auth');

// Merge params allows us to access :orderId from parent router
router.route('/').post(protect, addOrderItem);
router.route('/:itemId').put(protect, updateOrderItemQuantity);
router.route('/:itemId').delete(protect, removeOrderItem);

module.exports = router;