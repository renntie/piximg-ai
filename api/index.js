const express = require("express");
const multer = require("multer");
const axios = require("axios");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/upscale", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    const response = await axios({
      method: "post",
      url: "https://api-inference.huggingface.co/models/caidas/swin2SR-classical-sr-x2-64",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/octet-stream",
      },
      data: req.file.buffer,
      responseType: "arraybuffer",
    });

    const base64 = Buffer.from(response.data, "binary").toString("base64");

    res.json({
      success: true,
      image: `data:image/png;base64,${base64}`,
    });

  } catch (error) {
    console.error("HF Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: "Upscale failed",
    });
  }
});

module.exports = app;