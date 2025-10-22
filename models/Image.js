// models/Image.js
const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  image: Buffer, // binary image data
  contentType: String,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Image', imageSchema);
