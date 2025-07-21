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
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(url);

    if (query) {
      await page.type('input[name=\"q\"]', query);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(3000);
    }

    for (let i = 0; i < 3; i++) {
      await page.screenshot({ path: `${outputDir}/frame_${i}.png` });
      await page.waitForTimeout(500);
    }

    await new Promise((resolve, reject) => {
      const cmd = `ffmpeg -y -framerate 1 -i ${outputDir}/frame_%d.png -vf scale=480:-1 ${gifFile}`;
      exec(cmd, (err) => err ? reject(err) : resolve());
    });

    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(gifFile));

    const uploadRes = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });

    const gifUrl = uploadRes.data.trim();
    const message = `Here’s how to search for “${query}” on ${url} 🚀:\n${gifUrl}`;

    res.json({ message, gifUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
