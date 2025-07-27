const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { check, validationResult } = require('express-validator');

const router = express.Router();

/**
 * @route   GET /api/products
 * @desc    Get all products (for future use)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({ active: true }).sort({ createdAt: -1 });
    
    return res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/products/default
 * @desc    Get default product (single product for this landing page)
 * @access  Public
 */
router.get('/default', async (req, res) => {
  try {
    const product = await Product.getDefaultProduct();
    
    return res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching default product:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   PUT /api/products/default
 * @desc    Update default product price and discount
 * @access  Private (Admin only)
 */
router.put('/default', [
  auth.verifyToken,
  auth.verifyAdmin,
  check('price').isNumeric().withMessage('Price must be a number'),
  check('discount').optional().isNumeric().withMessage('Discount must be a number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const { price, discount } = req.body;
    
    const product = await Product.findOne({ active: true });
    if (!product) {
      // Create default product if it doesn't exist
      const newProduct = await Product.getDefaultProduct();
      newProduct.price = price;
      if (discount !== undefined) newProduct.discount = discount;
      await newProduct.save();
      
      return res.json({
        success: true,
        data: newProduct,
        message: 'Default product created and updated'
      });
    }
    
    // Update existing product
    product.price = price;
    if (discount !== undefined) product.discount = discount;
    await product.save();
    
    return res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router; 