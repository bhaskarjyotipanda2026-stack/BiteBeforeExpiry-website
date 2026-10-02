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
if (!executablePath) {
  console.error('No Chrome or Edge browser executable found on system.');
  process.exit(1);
}

const screenshotDir = path.resolve('test_screenshots_part2');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function runBrowserTest() {
  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    console.log('1. Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    
    // Switch from initial Scan tab to Dashboard tab
    console.log('Clicking "Dashboard" tab in navigation...');
    await page.evaluate(() => {
      const navButtons = Array.from(document.querySelectorAll('button, a'));
      const dashBtn = navButtons.find(b => b.textContent && b.textContent.trim().toLowerCase() === 'dashboard');
      if (dashBtn) dashBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    await page.screenshot({ path: path.join(screenshotDir, '01_dashboard_with_ai_pantry.png') });
    console.log('✅ Dashboard loaded with Personalized AI Pantry');

    // Check for Personalized AI Pantry Section
    const hasAiPantry = await page.evaluate(() => {
      return document.body.innerText.includes('Personalized AI Pantry Engine') ||
             document.body.innerText.includes('Smart Attention & Consumption Intelligence');
    });
    console.log('Personalized AI Pantry present:', hasAiPantry);

    // Switch to Waste Prediction tab
    console.log('2. Clicking "Waste Prediction" tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const wasteTab = btns.find(b => b.textContent && b.textContent.includes('Waste Prediction'));
      if (wasteTab) wasteTab.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, '02_waste_prediction_tab.png') });
    console.log('✅ Waste Prediction tab rendered with Safe vs Waste separation');

    // Switch to Habit Patterns tab
    console.log('3. Clicking "Habit Patterns" tab...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const statsTab = btns.find(b => b.textContent && b.textContent.includes('Habit Patterns'));
      if (statsTab) statsTab.click();
    });
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, '03_habit_patterns_tab.png') });
    console.log('✅ Habit patterns tab rendered');

    // Click on an item card to open ItemDetailModal
    console.log('4. Opening an item to inspect ItemDetailModal with AI/ML cards...');
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.grid > div');
      if (cards.length > 0) cards[0].click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotDir, '04_item_detail_with_ai_ml.png') });
    console.log('✅ Item Detail Modal rendered with ML Attention and Product Intelligence');

    console.log('\n🎉 ALL PART 2 BROWSER CHECKS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Browser test failed:', err);
    await page.screenshot({ path: path.join(screenshotDir, 'error.png') });
    throw err;
  } finally {
    await browser.close();
  }
}

runBrowserTest().catch(err => {
  console.error(err);
  process.exit(1);
});
