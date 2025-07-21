const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.post('/generate-video', async (req, res) => {
  const { url, query } = req.body;
  const outputDir = './output';
  const videoFile = path.join(outputDir, 'recording.mp4');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: true,
    fps: 25,
    videoFrame: {
      width: 1280,
      height: 720
    },
    aspectRatio: '16:9'
  });

  try {
    console.log(`➡️ Navigating to: ${url}`);
    await page.setViewport({ width: 1280, height: 720 });
    await recorder.start(videoFile);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    if (query) {
      const searchInput = await page.$('input[name=\"q\"]');
      if (searchInput) {
        console.log('✅ Typing query with real keystrokes...');
        await searchInput.click();
        await page.type('input[name=\"q\"]', query, { delay: 200 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000); // wait for results to load
      } else {
        console.warn('⚠️ No input[name=\"q\"] found on this page. Skipping typing.');
      }
    }

    await page.waitForTimeout(2000); // extra wait for smooth finish
    await recorder.stop();
    console.log('🎥 Video recording completed');

    console.log('☁️ Uploading video to catbox.moe...');
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(videoFile));

    const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });

    const videoUrl = uploadRes.data.trim();
    const message = `Here’s how to search for “${query}” on ${url} 🚀:\n${videoUrl}`;

    console.log(`✅ Upload complete: ${videoUrl}`);
    res.json({ message, videoUrl });

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    await browser.close();
    console.log('🛑 Browser closed');
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
