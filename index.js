const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const app = express();
const port = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/record', async (req, res) => {
  const searchText = req.body.search || 'test';
  const videoPath = `video/capture-${Date.now()}.mp4`;

  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        '--window-size=1280,720',
        `--autoplay-policy=no-user-gesture-required`
      ],
      defaultViewport: {
        width: 1280,
        height: 720
      }
    });

    const page = await browser.newPage();
    await page.goto('https://www.google.com');

    // Type the search text into the Google search box
    await page.waitForSelector('input[name="q"]');
    await page.type('input[name="q"]', searchText, { delay: 100 });
    await page.keyboard.press('Enter');

    const ffmpegCommand = `ffmpeg -y -video_size 1280x720 -framerate 25 -f x11grab -i :99.0+0,0 ${videoPath}`;
    const ffmpegProcess = exec(ffmpegCommand);

    console.log('Recording started...');

    await page.waitForTimeout(8000); // record for 8 seconds

    ffmpegProcess.kill('SIGINT');
    console.log('Recording stopped.');

    await browser.close();

    res.download(videoPath);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while recording.');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
