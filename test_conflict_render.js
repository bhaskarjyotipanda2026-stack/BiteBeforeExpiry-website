import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));
const screenshotDir = path.resolve('test_screenshots');

async function testConflictRendering() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

  // Simulate setting scanResult in App with a detected conflict and field confidences
  await page.evaluate(() => {
    // Click on preset or trigger scan with conflict
    const scanTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Scan Item'));
    if (scanTab) scanTab.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Click on "Amul Milk 1L" test preset to load scanner
  const presetBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Amul Milk 1L'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (presetBtn) {
    await new Promise(r => setTimeout(r, 1200));
    // Click "Run Intelligent Optical OCR & Analysis"
    await page.evaluate(() => {
      const runBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Run Intelligent Optical OCR'));
      if (runBtn) runBtn.click();
    });
    await new Promise(r => setTimeout(r, 1800));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_12_results_with_confidence.png') });
    console.log('✅ Captured results screen with extraction confidence & provenance');
  }

  await browser.close();
}

testConflictRendering().catch(console.error);
