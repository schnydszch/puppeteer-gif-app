const express = require("express");
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use("/videos", express.static("videos"));

const PORT = process.env.PORT || 10000;

app.post("/record", async (req, res) => {
  const { searchText } = req.body;
  const outputFile = `videos/${uuidv4()}.mp4`;

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Start recording using ffmpeg from display :99
  const ffmpeg = exec(`ffmpeg -y -video_size 1280x720 -f x11grab -i :99.0 -t 10 -r 25 -vcodec libx264 -preset ultrafast ${outputFile}`);

  // Go to page
  await page.goto("http://localhost:10000", { waitUntil: "networkidle2" });

  // Inject text and click search
  await page.type("#searchInput", searchText, { delay: 100 });
  await page.click("#searchBtn");

  await page.waitForTimeout(8000);
  await browser.close();

  ffmpeg.on("close", () => {
    res.json({ success: true, url: `videos/${path.basename(outputFile)}` });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
