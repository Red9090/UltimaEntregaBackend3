const Adoption = require('../models/Adoption');
const User = require('../models/User');
const Product = require('../models/Product');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all adoptions with filtering, sorting, pagination
// @route   GET /api/adoptions
// @access  Public (can be restricted later)
exports.getAdoptions = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single adoption
// @route   GET /api/adoptions/:id
// @access  Public
exports.getAdoption = asyncHandler(async (req, res, next) => {
  const adoption = await Adoption.findById(req.params.id)
    .populate('user', 'name email')
    .populate('product', 'name price');

  if (!adoption) {
    return next(new ErrorResponse(`Adoption not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: adoption
  });
});

// @desc    Create new adoption
// @route   POST /api/adoptions
// @access  Private (user must be logged in)
exports.createAdoption = asyncHandler(async (req, res, next) => {
  // Add user ID to req.body
  req.body.user = req.user.id;

  // Check if user exists
  const user = await User.findById(req.body.user);
  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.body.user}`, 404));
  }

  // Check if product exists
  const product = await Product.findById(req.body.product);
  if (!product) {
    return next(new ErrorResponse(`Product not found with id of ${req.body.product}`, 404));
  }

  
  try {
    const adoption = await Adoption.create(req.body);

    res.status(201).json({
      success: true,
      data: adoption
    });
  } catch (error) {
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return next(new ErrorResponse(error.message, 400));
    }
    // Re-throw other errors to be handled by the error middleware
    next(error);
  }
});

// @desc    Update adoption
// @route   PUT /api/adoptions/:id
// @access  Private (user must be logged in and own the adoption or be admin)
exports.updateAdoption = asyncHandler(async (req, res, next) => {
  let adoption = await Adoption.findById(req.params.id);

  if (!adoption) {
    return next(new ErrorResponse(`Adoption not found with id of ${req.params.id}`, 404));
  }

  // Make sure user owns the adoption or is admin
  if (adoption.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this adoption`, 403));
  }

  // Fields that can be updated
  const fieldsToUpdate = {
    amount: req.body.amount,
    message: req.body.message,
    status: req.body.status
  };

  // Remove undefined fields
  Object.keys(fieldsToUpdate).forEach(key =>
    fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  adoption = await Adoption.findByIdAndUpdate(req.params.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: adoption
  });
});

// @desc    Delete adoption
// @route   DELETE /api/adoptions/:id
// @access  Private (user must be logged in and own the adoption or be admin)
exports.deleteAdoption = asyncHandler(async (req, res, next) => {
  const adoption = await Adoption.findById(req.params.id);

  if (!adoption) {
    return next(new ErrorResponse(`Adoption not found with id of ${req.params.id}`, 404));
  }

  // Check ownership or admin role
  if (adoption.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this adoption`, 403));
  }

  await adoption.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});