// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize app
const app = express();
app.use(cors());
app.use(express.json()); // For JSON requests

// ------------------ MongoDB Connection ------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// ------------------ Models ------------------
const Image = require('./models/Image');
const SensorData = require('./models/SensorData');

// ------------------ Multer Setup ------------------
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ------------------ API: Upload Image ------------------
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const img = fs.readFileSync(req.file.path);
    const encode_image = img.toString('base64');

    const finalImg = {
      image: Buffer.from(encode_image, 'base64'),
      contentType: req.file.mimetype
    };

    await Image.create(finalImg);
    fs.unlinkSync(req.file.path); // delete local file

    res.json({ success: true, message: 'Image saved with timestamp' });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ------------------ API: Receive Sensor Data ------------------
app.post('/sensor', async (req, res) => {
  try {
    const { sound, motion } = req.body;

    // Validate input
    if (typeof sound !== 'boolean' || typeof motion !== 'boolean') {
      return res.status(400).json({ success: false, message: "Invalid data format (expected boolean values)" });
    }

    // ✅ Only save data when BOTH sensors are HIGH
    if (sound && motion) {
      await SensorData.create({ sound, motion });
      console.log("📡 Both sensors HIGH → Data saved ✅");
      return res.json({ success: true, message: "Both sensors HIGH → data stored" });
    } else {
      console.log(`⚠️ Sound: ${sound}, Motion: ${motion} → Not saved`);
      return res.json({ success: false, message: "Not saved (both not HIGH)" });
    }
  } catch (err) {
    console.error("❌ Error saving sensor data:", err);
    res.status(500).json({ success: false, message: "Failed to save sensor data" });
  }
});

// ------------------ API: Get All Sensor Data ------------------
app.get('/sensor-data', async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching sensor data:", err);
    res.status(500).json({ success: false, message: "Failed to fetch sensor data" });
  }
});

// ------------------ API: Get All Images ------------------
app.get('/images', async (req, res) => {
  try {
    const images = await Image.find().sort({ timestamp: -1 });
    res.json(images.map(img => ({
      _id: img._id,
      contentType: img.contentType,
      timestamp: img.timestamp,
      base64: img.image.toString('base64')
    })));
  } catch (err) {
    console.error("❌ Error fetching images:", err);
    res.status(500).json({ success: false, message: "Failed to fetch images" });
  }
});

// ------------------ FRONTEND HTML (Image Gallery) ------------------
app.get('/', async (req, res) => {
  const images = await Image.find().sort({ timestamp: -1 });

  let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Doorbell Images</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        margin: 0;
        padding: 0;
      }
      h1 {
        text-align: center;
        background: #007bff;
        color: white;
        padding: 15px 0;
        margin-bottom: 20px;
      }
      .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        padding: 20px;
      }
      .card {
        background: white;
        border-radius: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        overflow: hidden;
        text-align: center;
      }
      .card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
      }
      .timestamp {
        background: #f1f1f1;
        padding: 10px;
        font-size: 14px;
        color: #333;
      }
    </style>
  </head>
  <body>
    <h1>📸 Smart Doorbell Captures</h1>
    <div class="gallery">`;

  for (let img of images) {
    html += `
      <div class="card">
        <img src="data:${img.contentType};base64,${img.image.toString('base64')}" />
        <div class="timestamp">
          ${new Date(img.timestamp).toLocaleString()}
        </div>
      </div>`;
  }

  html += `
    </div>
  </body>
  </html>`;
  res.send(html);
});

// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
