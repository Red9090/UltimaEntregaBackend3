const express = require('express');
const router = express.Router();
const {
  getAdoptions,
  getAdoption,
  createAdoption,
  updateAdoption,
  deleteAdoption
} = require('../controllers/adoptionController');

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Adoption = require('../models/Adoption');

// Routes
router.route('/')
  .get(advancedResults(Adoption, 'user product'), getAdoptions)
  .post(protect, authorize('user', 'admin'), createAdoption);

router.route('/:id')
  .get(getAdoption)
  .put(protect, authorize('user', 'admin'), updateAdoption)
  .delete(protect, authorize('user', 'admin'), deleteAdoption);

module.exports = router;