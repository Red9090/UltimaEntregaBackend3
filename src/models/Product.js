const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Please add a price'],
    min: [0, 'Price must be at least 0'],
    max: [1000000, 'Price cannot be more than 1,000,000'],
  },
  image: {
    type: String,
    default: 'no-photo.jpg',
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: [
      'Smartphones',
      'Laptops',
      'Tablets',
      'Accessories',
      'Audio',
      'Cameras',
      'Gaming',
      'Software',
    ],
  },
  countInStock: {
    type: Number,
    required: [true, 'Please add a stock count'],
    min: [0, 'Stock cannot be less than 0'],
    max: [1000, 'Stock cannot be more than 1000'],
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be at least 0'],
    max: [5, 'Rating cannot be more than 5'],
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Product', productSchema);