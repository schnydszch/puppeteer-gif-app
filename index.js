const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('public'));
app.use(express.json());

app.post('/record', async (req, res) => {
  const { url, inputText, inputSelector, buttonSelector } = req.body;
  const videoPath = path.join(__dirname, 'public', 'recorded.mp4');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox'],
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();
  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: true,
    fps: 25,
    videoFrame: { width: 1280, height: 720 },
    aspectRatio: '16:9',
  });

  try {
    await recorder.start(videoPath);
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.waitForSelector(inputSelector, { timeout: 10000 });
    await page.click(inputSelector);
    await page.keyboard.type(inputText, { delay: 100 });

    await page.waitForTimeout(500); // Pause before clicking
    await page.click(buttonSelector);
    await page.waitForTimeout(5000); // Let search results load

    await recorder.stop();
    await browser.close();
    res.json({ video: 'recorded.mp4' });
  } catch (err) {
    console.error('Error:', err);
    await recorder.stop();
    await browser.close();
    res.status(500).send('Recording failed');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
