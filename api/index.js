const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

async function imgupscale(imageBuffer, { scale = 4 } = {}) {
    try {
        console.log("STEP 0: Start Upscale");

        const scales = [1, 4, 8, 16];
        if (!Buffer.isBuffer(imageBuffer)) throw new Error('Image must be a buffer.');
        if (!scales.includes(parseInt(scale))) throw new Error(`Available scale options: ${scales.join(', ')}`);

        const identity = uuidv4();

        const inst = axios.create({
            baseURL: 'https://supawork.ai/supawork/headshot/api',
            timeout: 8000,
            headers: {
                authorization: 'null',
                origin: 'https://supawork.ai/',
                referer: 'https://supawork.ai/ai-photo-enhancer',
                'user-agent': 'Mozilla/5.0',
                'x-identity-id': identity
            }
        });

        // 1️⃣ Get Upload Token
        console.log("STEP 1: Get Upload Token");
        const { data: up } = await inst.get('/sys/oss/token', {
            params: { f_suffix: 'png', get_num: 1, unsafe: 1 }
        });

        const img = up?.data?.[0];
        if (!img) throw new Error('Upload url not found.');

        // 2️⃣ Upload Image
        console.log("STEP 2: Upload Image");
        await axios.put(img.put, imageBuffer);

        // 3️⃣ Create Task (NO CF)
        console.log("STEP 3: Create Task (No CF)");
        const { data: task } = await inst.post(
            '/media/image/generator',
            {
                aigc_app_code: 'image_enhancer',
                model_code: 'supawork-ai',
                image_urls: [img.get],
                extra_params: { scale: parseInt(scale) },
                currency_type: 'silver',
                identity_id: identity
            }
        );

        if (!task?.data?.creation_id) throw new Error('Failed to create task.');

        // 4️⃣ Polling Result (dipersingkat biar gak timeout)
        console.log("STEP 4: Polling Result");

        let attempts = 0;
        while (attempts < 6) { // maksimal ~5 detik
            const { data } = await inst.get('/media/aigc/result/list/v1', {
                params: { page_no: 1, page_size: 10, identity_id: identity }
            });

            const list = data?.data?.list?.[0]?.list?.[0];
            if (list && list.status === 1) {
                console.log("SUCCESS: Image Generated");
                return list.url;
            }

            await new Promise(res => setTimeout(res, 800));
            attempts++;
        }

        throw new Error('Processing timeout (Vercel limit).');

    } catch (error) {
        console.error("Upscale Error FULL:", error.response?.data || error.message);
        throw new Error(error.response?.data?.message || error.message);
    }
}

app.post('/api/upscale', upload.single('image'), async (req, res) => {
    try {
        console.log("Incoming request...");

        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded.' });
        }

        const scale = req.body.scale || 4;
        const resultUrl = await imgupscale(req.file.buffer, { scale });

        res.json({ success: true, url: resultUrl });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.use(express.static(path.join(__dirname, '../public')));

module.exports = app;