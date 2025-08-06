const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'Neelkanth Palangtod Capsules'
  },
  price: {
    type: Number,
    required: true,
    default: 998
  },
  discount: {
    type: Number,
    default: 55
  },
  description: {
    type: String,
    default: 'Ayurvedic Strength Enhancement'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add index for faster queries on active products
productSchema.index({ active: 1 });

// Static method to get default product (optimized with lean and projection)
productSchema.statics.getDefaultProduct = async function() {
  // Use lean() for faster queries and select only needed fields
  const defaultProduct = await this.findOne(
    { active: true }, 
    { name: 1, price: 1, discount: 1, description: 1 }
  ).lean();
  
  if (defaultProduct) {
    return defaultProduct;
  }

  // Create default product if it doesn't exist
  const newProduct = await this.create({
    name: 'Neelkanth Palangtod Capsules',
    price: 998,
    discount: 55,
    description: 'Ayurvedic Strength Enhancement',
    active: true
  });
  
  // Return lean version for consistency
  return {
    _id: newProduct._id,
    name: newProduct.name,
    price: newProduct.price,
    discount: newProduct.discount,
    description: newProduct.description
  };
};

module.exports = mongoose.model('Product', productSchema); 