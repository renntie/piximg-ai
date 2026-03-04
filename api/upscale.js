const express = require("express");
const multer = require("multer");
const sharp = require("sharp");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/upscale", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    const scale = parseInt(req.body.scale) || 2;

    const metadata = await sharp(req.file.buffer).metadata();

    const upscaledImage = await sharp(req.file.buffer)
      .resize({
        width: metadata.width * scale,
        height: metadata.height * scale,
        kernel: sharp.kernel.lanczos3 // kualitas tinggi
      })
      .sharpen() // biar lebih tajam
      .png()
      .toBuffer();

    const base64 = upscaledImage.toString("base64");

    res.json({
      success: true,
      image: `data:image/png;base64,${base64}`
    });

  } catch (error) {
    console.error("Sharp Error:", error);
    res.status(500).json({
      success: false,
      error: "Upscale failed"
    });
  }
});

module.exports = app;