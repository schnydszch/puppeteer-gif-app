const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Optional health check
app.get('/healthz', (req, res) => {
  res.send('OK');
});

app.post('/capture', async (req, res) => {
  const searchText = req.body.searchText || 'example search';
  const filename = `recording-${Date.now()}.mp4`;
  const output = path.join(__dirname, 'public', 'recordings', filename);

  if (!fs.existsSync(path.join(__dirname, 'public', 'recordings'))) {
    fs.mkdirSync(path.join(__dirname, 'public', 'recordings'), { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--window-size=1280,720`
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  });

  const page = await browser.newPage();

  const ffmpeg = exec(`ffmpeg -y -f x11grab -video_size 1280x720 -i :99.0 -r 25 ${output}`);

  await page.goto('https://www.google.com/', { waitUntil: 'networkidle2' });

  await page.type('input[name="q"]', searchText, { delay: 100 });
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  await new Promise(resolve => setTimeout(resolve, 3000)); // wait to capture results

  await browser.close();
  ffmpeg.kill('SIGINT');

  res.json({ video: `/recordings/${filename}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
