const mongoose = require('mongoose');

const adoptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Please provide a user']
  },
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: [true, 'Please provide a product']
  },
  adoptionDate: {
    type: Date,
    default: Date.now
  },
  amount: {
    type: Number,
    required: [true, 'Please provide an adoption amount'],
    min: [1, 'Adoption amount must be at least 1']
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot be more than 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for faster queries
adoptionSchema.index({ user: 1, product: 1 });
adoptionSchema.index({ status: 1 });

module.exports = mongoose.model('Adoption', adoptionSchema);