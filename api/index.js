const express = require("express");
const multer = require("multer");
const Replicate = require("replicate");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

app.post("/api/upscale", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    const scale = parseInt(req.body.scale) || 4;

    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    // Call Real-ESRGAN model
    const output = await replicate.run(
      "nightmareai/real-esrgan",
      {
        input: {
          image: base64Image,
          scale: scale
        }
      }
    );

    return res.json({
      success: true,
      url: output
    });

  } catch (error) {
    console.error("Replicate Error:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = app;