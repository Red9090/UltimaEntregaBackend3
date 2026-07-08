const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authController.register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authController.login);

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
router.get('/logout', authController.logout);

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
router.post('/forgotpassword', authController.forgotPassword);

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
router.put('/resetpassword/:resettoken', authController.resetPassword);

module.exports = router;