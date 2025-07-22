const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

const outputDir = './output';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

async function uploadToCatbox(filePath) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));

  const res = await axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders()
  });
  return res.data.trim();
}

app.post('/generate-gif', async (req, res) => {
  const { url, query } = req.body;
  const gifFile = path.join(outputDir, 'output.gif');

  const browser = await launchBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    let frameCount = 0;
    for (let i = 0; i < 3; i++) {
      const shotPath = `${outputDir}/frame_${frameCount}.png`;
      await page.screenshot({ path: shotPath });
      frameCount++;
      await new Promise(r => setTimeout(r, 500));
    }

    if (query) {
      const searchInput = await page.$('input[name="q"]');
      if (searchInput) {
        await searchInput.type(query, { delay: 200 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }
    }

    for (let i = 0; i < 3; i++) {
      const shotPath = `${outputDir}/frame_${frameCount}.png`;
      await page.screenshot({ path: shotPath });
      frameCount++;
      await new Promise(r => setTimeout(r, 500));
    }

    await new Promise((resolve, reject) => {
      exec(`ffmpeg -y -framerate 4 -i ${outputDir}/frame_%d.png ${gifFile}`, err =>
        err ? reject(err) : resolve()
      );
    });

    const gifUrl = await uploadToCatbox(gifFile);
    res.json({ message: `GIF ready! 🚀\n${gifUrl}`, fileUrl: gifUrl });
  } catch (err) {
    console.error('❌ /generate-gif ERROR:', err.message);
    res.status(500).json({ error: 'GIF generation failed' });
  } finally {
    await browser.close();
  }
});

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
      const searchInput = await page.$('input[name="q"]');
      if (searchInput) {
        await searchInput.click();
        await page.type('input[name="q"]', query, { delay: 200 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      }
    }

    await page.waitForTimeout(2000);
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

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
