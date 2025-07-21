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

    if (query) {
      // Check if search input exists
      const searchInput = await page.$('input[name="q"]');
      if (searchInput) {
        console.log('✅ Found input[name="q"], typing query...');
        await searchInput.type(query);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
      } else {
        console.warn('⚠️ No input[name="q"] found on this page. Skipping typing.');
      }
    }

    // Take screenshots
    for (let i = 0; i < 3; i++) {
      const screenshotPath = `${outputDir}/frame_${i}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 Saved screenshot: ${screenshotPath}`);
      await page.waitForTimeout(500);
    }

    // Create GIF using ffmpeg
    console.log('🎞️ Creating GIF with ffmpeg...');
    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -y -framerate 1 -i ${outputDir}/frame_%d.png -vf scale=480:-1 ${gifFile}`;
      exec(cmd, (err) => err ? reject(err) : resolve());
    });

    // Upload GIF to catbox.moe
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
