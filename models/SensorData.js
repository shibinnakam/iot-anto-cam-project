// models/SensorData.js
const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  sound: { type: Boolean, required: true },
  motion: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SensorData', sensorDataSchema);
