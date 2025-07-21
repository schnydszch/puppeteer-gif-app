const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.post('/generate-gif', async (req, res) => {
  const { url, query } = req.body;
  const outputDir = './output';
  const gifFile = path.join(outputDir, 'output.gif');

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    console.log(`➡️ Navigating to: ${url}`);
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    let frameCount = 0;

    // Capture initial page
    const screenshotPath = `${outputDir}/frame_${frameCount}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Captured initial frame: ${screenshotPath}`);
    frameCount++;

    if (query) {
      const searchInput = await page.$('input[name=\"q\"]');
      if (searchInput) {
        console.log('✅ Typing query with live capture...');
        for (const char of query) {
          await searchInput.type(char, { delay: 200 }); // slow per char
          await page.evaluate(el => el.blur(), searchInput); // trigger repaint
          const screenshotPath = `${outputDir}/frame_${frameCount}.png`;
          await page.screenshot({ path: screenshotPath });
          console.log(`📸 Captured typing frame: ${screenshotPath}`);
          frameCount++;
          await new Promise(resolve => setTimeout(resolve, 300)); // wait extra for render
        }
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.warn('⚠️ No input[name=\"q\"] found on this page. Skipping typing.');
      }
    }

    // Capture extra frames after search
    for (let i = 0; i < 5; i++) {
      const screenshotPath = `${outputDir}/frame_${frameCount}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 Captured post-search frame: ${screenshotPath}`);
      frameCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('🎞️ Creating high-res GIF with ffmpeg...');
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -y -framerate 4 -i ${outputDir}/frame_%d.png ${gifFile}`; // removed scale, increased framerate
      exec(cmd, (err) => err ? reject(err) : resolve());
    });

    console.log('☁️ Uploading GIF to catbox.moe...');
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(gifFile));

    const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });

    const gifUrl = uploadRes.data.trim();
    const message = `Here’s how to search for “${query}” on ${url} 🚀:\n${gifUrl}`;

    console.log(`✅ Upload complete: ${gifUrl}`);
    res.json({ message, gifUrl });

  } catch (err) {
    console.error('❌ ERROR:', err.message);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    await browser.close();
    console.log('🛑 Browser closed');
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

