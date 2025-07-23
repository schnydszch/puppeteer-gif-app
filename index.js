const puppeteer = require('puppeteer');
const fs = require('fs');
const { exec } = require('child_process');

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Ensure the GUI is rendered for recording
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const url = 'https://example.com'; // Replace with your actual URL
  const searchSelector = '#searchInput'; // Replace with actual input selector
  const buttonSelector = '#searchButton'; // Replace with actual button selector
  const searchText = 'OpenAI';

  const ffmpegCmd = `ffmpeg -y -video_size 1280x720 -framerate 25 -f x11grab -i :99.0 -codec:v libx264 -preset ultrafast output.mp4`;
  const recorder = exec(ffmpegCmd);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(searchSelector);

  // Simulate visible typing
  await page.click(searchSelector);
  await page.type(searchSelector, searchText, { delay: 100 });

  // Wait a bit before clicking the button
  await page.waitForTimeout(1000);
  await page.click(buttonSelector);

  // Let results load and record some duration
  await page.waitForTimeout(5000);

  await browser.close();

  // Stop ffmpeg after closing the browser
  recorder.kill('SIGINT');

  console.log('🎥 Recording complete: output.mp4');
})();
