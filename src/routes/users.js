const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getMe,
  updatePassword,
  updateDetails
} = require('../controllers/userController');
const advancedResults = require('../middleware/advancedResults');
const User = require('../models/User');

const { protect, authorize } = require('../middleware/auth');

// Route for getting all users (admin only)
router.route('/').get(protect, authorize('admin'), advancedResults(User), getUsers);

// Route for getting, updating, deleting a specific user (admin only)
router.route('/:id')
  .get(protect, authorize('admin'), getUser)
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);

// Route for getting current user info
router.route('/me').get(protect, getMe);

// Route for updating password
router.route('/updatepassword').put(protect, updatePassword);

// Route for updating user details
router.route('/updatedetails').put(protect, updateDetails);

module.exports = router;