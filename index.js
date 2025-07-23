const express = require('express');
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.static('public'));
app.use(express.json());

app.post('/record', async (req, res) => {
  const { url, searchText } = req.body;

  const videoPath = path.join(__dirname, 'public', 'output.mp4');
  if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 720 },
  });

  const page = await browser.newPage();
  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'x11grab',
    '-video_size', '1280x720',
    '-i', ':99.0',
    '-codec:v', 'libx264',
    '-t', '10',
    videoPath,
  ]);

  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="text"], input[name="q"], input'); // generic input
  await page.type('input[type="text"], input[name="q"], input', searchText);
  await page.keyboard.press('Enter');

  await new Promise(r => setTimeout(r, 8000));
  await browser.close();

  ffmpeg.on('exit', () => res.json({ video: '/output.mp4' }));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
