const { body, validationResult, param, query } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Order validation rules
const validateOrderCreation = [
  body('customer.name')
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .trim(),
  
  body('customer.email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('customer.phone')
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit Indian phone number is required'),
  
  body('customer.address.street')
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address must be less than 200 characters'),
  
  body('customer.address.city')
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 50 })
    .withMessage('City name must be less than 50 characters'),
  
  body('customer.address.state')
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 50 })
    .withMessage('State name must be less than 50 characters'),
  
  body('customer.address.pincode')
    .matches(/^[1-9][0-9]{5}$/)
    .withMessage('Valid 6-digit pincode is required'),
  
  body('product.quantity')
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10'),
  
  body('product.price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('payment.method')
    .isIn(['razorpay', 'cod'])
    .withMessage('Payment method must be razorpay or cod'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  
  handleValidationErrors
];

// Admin login validation
const validateAdminLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  handleValidationErrors
];

// Order status update validation
const validateOrderStatusUpdate = [
  param('orderId')
    .notEmpty()
    .withMessage('Order ID is required'),
  
  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
  
  body('trackingNumber')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Tracking number must be less than 50 characters'),
  
  body('adminNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Admin notes must be less than 1000 characters'),
  
  handleValidationErrors
];

// Payment verification validation
const validatePaymentVerification = [
  body('razorpay_order_id')
    .notEmpty()
    .withMessage('Razorpay order ID is required'),
  
  body('razorpay_payment_id')
    .notEmpty()
    .withMessage('Razorpay payment ID is required'),
  
  body('razorpay_signature')
    .notEmpty()
    .withMessage('Razorpay signature is required'),
  
  body('orderId')
    .notEmpty()
    .withMessage('Order ID is required'),
  
  handleValidationErrors
];

// Query validation for orders list
const validateOrdersQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid status filter'),
  
  query('sortBy')
    .optional()
    .isIn(['orderDate', 'totalAmount', 'status'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

// Contact form validation (if needed)
const validateContact = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Valid 10-digit phone number required'),
  
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters'),
  
  handleValidationErrors
];

// Sanitize input middleware
const sanitizeInput = (req, res, next) => {
  // Remove any HTML tags from string inputs
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value.replace(/<[^>]*>/g, '').trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else {
        obj[key] = sanitizeValue(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

module.exports = {
  validateOrderCreation,
  validateAdminLogin,
  validateOrderStatusUpdate,
  validatePaymentVerification,
  validateOrdersQuery,
  validateContact,
  sanitizeInput,
  handleValidationErrors
}; 