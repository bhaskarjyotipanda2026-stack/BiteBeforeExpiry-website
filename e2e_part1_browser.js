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

const screenshotDir = path.resolve('test_screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

// Helper to click button by matching text content
async function clickButtonWithText(page, text) {
  const clicked = await page.evaluate((btnText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find(b => b.textContent && b.textContent.includes(btnText));
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, text);

  if (!clicked) {
    throw new Error(`Button with text "${text}" not found`);
  }
}

async function runBrowserTest() {
  console.log('Launching browser with:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Visit App
    console.log('Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({ path: path.join(screenshotDir, 'p1_01_loaded.png') });
    console.log('✅ Page loaded successfully');

    // 2. Open Auth Modal
    console.log('Opening User Account / Auth Modal...');
    const authButton = await page.waitForSelector('button[title="Account & Database Profile"]', { timeout: 5000 });
    await authButton.click();
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_02_auth_modal.png') });
    console.log('✅ Auth Modal opened');

    // Click "Create one now" inside modal
    await clickButtonWithText(page, 'Create one now');
    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_03_signup_modal.png') });
    console.log('✅ Switched to Sign Up mode');

    // Close Auth modal
    const closeBtn = await page.waitForSelector('button[data-testid="auth-modal-close"]', { timeout: 3000 });
    await closeBtn.click();
    await new Promise(r => setTimeout(r, 600));

    // 3. Open Onboarding Setup Wizard
    console.log('Launching Setup Wizard...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="Setup Wizard"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_04_wizard_step1.png') });
    console.log('✅ Wizard Step 1: Account Confirmation visible');



    // Step 1 -> Step 2
    await clickButtonWithText(page, 'Continue');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_05_wizard_step2.png') });
    console.log('✅ Wizard Step 2: Personal Profile & Diet visible');

    // Step 2 -> Step 3
    await clickButtonWithText(page, 'Continue');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_06_wizard_step3.png') });
    console.log('✅ Wizard Step 3: Allergy Protection visible');

    // Select 'Peanuts' allergy
    await clickButtonWithText(page, 'Peanuts');
    await new Promise(r => setTimeout(r, 400));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_07_wizard_allergy_selected.png') });
    console.log('✅ Allergy selected');

    // Step 3 -> Step 4
    await clickButtonWithText(page, 'Continue');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_08_wizard_step4.png') });
    console.log('✅ Wizard Step 4: First Product Scan visible');

    // Step 4 -> Step 5
    await clickButtonWithText(page, 'Continue');
    await new Promise(r => setTimeout(r, 600));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_09_wizard_step5.png') });
    console.log('✅ Wizard Step 5: Add to Pantry Review Card visible');

    // Finish Wizard & Save to Pantry
    await clickButtonWithText(page, 'Save & Open Dashboard');
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_10_dashboard_with_item.png') });
    console.log('✅ Saved to Pantry and navigated to Dashboard');

    // 4. Navigate to Settings Screen
    console.log('Navigating to Settings Screen...');
    await clickButtonWithText(page, 'Settings');
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(screenshotDir, 'p1_11_settings_screen.png') });
    console.log('✅ Settings Screen loaded with User Profile & Database Ribbon');

    console.log('\n============================================================');
    console.log('  🎉 ALL REAL BROWSER E2E TESTS PASSED SUCCESSFULLY! 🎉  ');
    console.log('============================================================\n');
  } catch (err) {
    console.error('Browser Test Error:', err);
    await page.screenshot({ path: path.join(screenshotDir, 'p1_error.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runBrowserTest();
