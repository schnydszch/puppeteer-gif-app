**// index.js**
const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('public'));

app.get('/generate', async (req, res) => {
  const OUTPUT = 'recording.webm';

  if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);

  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Start ffmpeg recording
  const ffmpeg = execSync(`ffmpeg -y -f x11grab -video_size 1280x720 -i :99.0 -codec:v libvpx -b:v 1M ${OUTPUT}`, { stdio: 'ignore' });

  // Go to a page and interact
  await page.goto('https://duckduckgo.com');
  await page.waitForSelector('input[name="q"]');
  await page.type('input[name="q"]', 'puppeteer automated search', { delay: 100 });
  await page.click('input[type="submit"]');
  await page.waitForTimeout(5000);

  await browser.close();

  // Send video file
  res.download(OUTPUT);
});

app.listen(PORT, () => {
  console.log(`🎉 Server running on http://localhost:${PORT}`);
});
