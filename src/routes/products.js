const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductPhoto,
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/auth');

// Re-route into other resource routers
const reviewRouter = require('./reviews');
router.use('/:productId/reviews', reviewRouter);

const advancedResults = require('../middleware/advancedResults');
const Product = require('../models/Product');

router.route('/').get(advancedResults(Product), getProducts).post(protect, authorize('admin'), createProduct);

router.route('/:id').get(getProduct).put(protect, authorize('admin'), updateProduct).delete(protect, authorize('admin'), deleteProduct);

router.route('/:id/photo').put(protect, authorize('admin'), uploadProductPhoto);

module.exports = router;