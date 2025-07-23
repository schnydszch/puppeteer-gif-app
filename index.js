const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
const port = process.env.PORT || 3000;
const outputDir = path.join(__dirname, 'output');

app.use(bodyParser.json());
app.use(express.static('public'));

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const launchBrowser = async () => {
  return await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
};

const uploadToCatbox = async (filePath) => {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  const response = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders()
  });
  return response.data;
};

app.post('/generate-video', async (req, res) => {
  const { url, query } = req.body;
  const videoFile = path.join(outputDir, 'recording.mp4');

  const browser = await launchBrowser();
  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: true,
    fps: 25,
    videoFrame: { width: 1280, height: 720 },
    aspectRatio: '16:9'
  });

  try {
    await page.setViewport({ width: 1280, height: 720 });
    await recorder.start(videoFile);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    if (query) {
      const selector = 'input[name="q"]';
      const searchInput = await page.$(selector);
      if (searchInput) {
        await searchInput.click();

        await page.evaluate(sel => {
          const el = document.querySelector(sel);
          el.style.outline = '3px solid red';
        }, selector);

        for (let i = 1; i <= query.length; i++) {
          const partial = query.slice(0, i);
          await page.evaluate((sel, val) => {
            const el = document.querySelector(sel);
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }, selector, partial);
          await new Promise(r => setTimeout(r, 200));
        }

        await page.evaluate(sel => {
          const el = document.querySelector(sel);
          el.style.outline = '';
        }, selector);

        const searchButton = await page.$('input[type="submit"], button[type="submit"]');
        if (searchButton) {
          await new Promise(r => setTimeout(r, 500));
          await searchButton.click();
        } else {
          await page.keyboard.press('Enter');
        }

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    await new Promise(r => setTimeout(r, 2000));
    await recorder.stop();

    const videoUrl = await uploadToCatbox(videoFile);
    res.json({ message: `Video ready! 🚀\n${videoUrl}`, fileUrl: videoUrl });
  } catch (err) {
    console.error('❌ /generate-video ERROR:', err.message);
    res.status(500).json({ error: 'Video generation failed' });
  } finally {
    await browser.close();
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
