const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    default: () => `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Customer Information
  customer: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' }
    }
  },
  
  // Product Information
  product: {
    name: {
      type: String,
      default: 'Neelkanth Palangtod Capsules'
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    }
  },
  
  // Order Details
  totalAmount: {
    type: Number,
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Payment Information
  payment: {
    method: {
      type: String,
      enum: ['razorpay', 'cod'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    transactionId: String,
    checkCount: {
      type: Number,
      default: 0
    }
  },
  
  // Shipping Information
  shipping: {
    method: {
      type: String,
      default: 'standard'
    },
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date
  },
  
  // Notes and Special Instructions
  notes: String,
  adminNotes: String,
  
  // Timestamps
  orderDate: {
    type: Date,
    default: Date.now
  },
  
  // Email Status
  emailSent: {
    customer: { type: Boolean, default: false },
    admin: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ 'customer.phone': 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderDate: -1 });
orderSchema.index({ 'payment.status': 1 });

// Virtual for formatted order date
orderSchema.virtual('formattedOrderDate').get(function() {
  return this.orderDate.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to calculate final amount after discount
orderSchema.methods.calculateFinalAmount = function() {
  const baseAmount = this.product.price * this.product.quantity;
  const discountAmount = (baseAmount * this.product.discount) / 100;
  return baseAmount - discountAmount;
};

module.exports = mongoose.model('Order', orderSchema); 