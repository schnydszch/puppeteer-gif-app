// Quick Start: Node.js + Puppeteer + FFmpeg to create a GIF from website interaction

const express = require('express');
const puppeteer = require('puppeteer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/generate-gif', async (req, res) => {
  const { url, query } = req.body;
  const outputDir = './output';
  const videoFile = path.join(outputDir, 'output.mp4');
  const gifFile = path.join(outputDir, 'output.gif');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url);

    if (query) {
      await page.type('input[name="q"]', query);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    const client = await page.target().createCDPSession();
    await client.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });

    const frames = [];
    client.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
      frames.push(Buffer.from(data, 'base64'));
      await client.send('Page.screencastFrameAck', { sessionId });
    });

    await page.waitForTimeout(5000); // capture ~5 sec
    await client.send('Page.stopScreencast');

    const frameDir = path.join(outputDir, 'frames');
    if (!fs.existsSync(frameDir)) fs.mkdirSync(frameDir);

    frames.forEach((frame, idx) => {
      fs.writeFileSync(path.join(frameDir, `frame_${idx}.png`), frame);
    });

    exec(`ffmpeg -framerate 5 -i ${frameDir}/frame_%d.png -vf scale=640:-1 ${gifFile}`, (err, stdout, stderr) => {
      if (err) {
        console.error('FFmpeg error:', stderr);
        res.status(500).send('Failed to generate GIF');
      } else {
        res.sendFile(path.resolve(gifFile));
      }
      browser.close();
    });

  } catch (err) {
    console.error(err);
    await browser.close();
    res.status(500).send('Error occurred');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
