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
    default: 999
  },
  discount: {
    type: Number,
    default: 50
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

// Static method to get default product
productSchema.statics.getDefaultProduct = async function() {
  const defaultProduct = await this.findOne({ active: true });
  if (defaultProduct) {
    return defaultProduct;
  }

  // Create default product if it doesn't exist
  return this.create({
    name: 'Neelkanth Palangtod Capsules',
    price: 999,
    discount: 50,
    description: 'Ayurvedic Strength Enhancement',
    active: true
  });
};

module.exports = mongoose.model('Product', productSchema); 