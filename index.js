const express = require("express");
const puppeteer = require("puppeteer");
const stream = require("puppeteer-stream");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("🎥 Puppeteer video recorder is running.");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

app.post("/record", async (req, res) => {
  const keyword = req.body.keyword || "librarian";
  const outputPath = path.join(__dirname, "output.webm");

  let browser;
  try {
    console.log("Launching browser...");

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log("Navigating to search page...");
    await page.goto("https://www.google.com", { waitUntil: "networkidle2" });

    console.log(`Typing keyword: "${keyword}"`);
    await page.type('input[name="q"]', keyword, { delay: 100 });

    // Start video recording
    console.log("Starting video stream...");
    const videoStream = await stream.record(page);
    
    console.log("Submitting search...");
    await Promise.all([
      page.keyboard.press("Enter"),
      page.waitForNavigation({ waitUntil: "networkidle2" })
    ]);

    // Let it record the search results for a few seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    const videoBuffer = await videoStream.stop();

    fs.writeFileSync(outputPath, videoBuffer);
    console.log(`✅ Video saved to ${outputPath}`);

    res.sendFile(outputPath);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Recording failed: " + err.message);
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
