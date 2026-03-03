const express = require('express');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// --- Logika Upscale User (Diadaptasi) ---
async function imgupscale(imageBuffer, { scale = 4 } = {}) {
    try {
        const scales = [1, 4, 8, 16];
        
        if (!Buffer.isBuffer(imageBuffer)) throw new Error('Image must be a buffer.');
        if (!scales.includes(parseInt(scale)) && !isNaN(scale)) throw new Error(`Available scale options: ${scales.join(', ')}.`);
        
        const identity = uuidv4();
        const inst = axios.create({
            baseURL: 'https://supawork.ai/supawork/headshot/api',
            headers: {
                authorization: 'null',
                origin: 'https://supawork.ai/',
                referer: 'https://supawork.ai/ai-photo-enhancer',
                'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
                'x-auth-challenge': '',
                'x-identity-id': identity
            }
        });
        
        // 1. Get Token
        const { data: up } = await inst.get('/sys/oss/token', {
            params: { f_suffix: 'png', get_num: 1, unsafe: 1 }
        });
        
        const img = up?.data?.[0];
        if (!img) throw new Error('Upload url not found.');
        
        // 2. Upload Image
        await axios.put(img.put, imageBuffer);
        
        // 3. Bypass CF Turnstile (External Dependency)
        const { data: cf } = await axios.post('https://api.nekolabs.web.id/tools/bypass/cf-turnstile', {
            url: 'https://supawork.ai/ai-photo-enhancer',
            siteKey: '0x4AAAAAACBjrLhJyEE6mq1c'
        });
        
        if (!cf?.result) throw new Error('Failed to get cf token.');
        
        // 4. Get Challenge Token
        const { data: t } = await inst.get('/sys/challenge/token', {
            headers: { 'x-auth-challenge': cf.result }
        });
        
        if (!t?.data?.challenge_token) throw new Error('Failed to get token.');
        
        // 5. Create Task
        const { data: task } = await inst.post('/media/image/generator', {
            aigc_app_code: 'image_enhancer',
            model_code: 'supawork-ai',
            image_urls: [img.get],
            extra_params: { scale: parseInt(scale) },
            currency_type: 'silver',
            identity_id: identity
        }, {
            headers: { 'x-auth-challenge': t.data.challenge_token }
        });
        
        if (!task?.data?.creation_id) throw new Error('Failed to create task.');
        
        // 6. Polling Result
        let attempts = 0;
        while (attempts < 30) { // Max 30 seconds wait
            const { data } = await inst.get('/media/aigc/result/list/v1', {
                params: { page_no: 1, page_size: 10, identity_id: identity }
            });
            
            const list = data?.data?.list?.[0]?.list?.[0];
            if (list && list.status === 1) return list.url;
            
            await new Promise(res => setTimeout(res, 1000));
            attempts++;
        }
        throw new Error('Timeout waiting for image generation.');

    } catch (error) {
        console.error("Upscale Error:", error.message);
        throw new Error(error.message);
    }
}

// --- API Routes ---

app.post('/api/upscale', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image file uploaded.' });
        
        const scale = req.body.scale || 4;
        const resultUrl = await imgupscale(req.file.buffer, { scale });
        
        res.json({ success: true, url: resultUrl });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Fallback for local testing (Serve static files)
app.use(express.static(path.join(__dirname, '../public')));

module.exports = app;
