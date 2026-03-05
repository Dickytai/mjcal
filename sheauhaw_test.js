const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Go to sheauhaw
  await page.goto('https://sheauhaw.com/old_blogs/tools/mahjong-tw.html', { waitUntil: 'networkidle2' });
  console.log('1. Page loaded');
  
  // Click "港式台灣麻將牌理" button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button.tab'));
    const btn = buttons.find(b => b.innerText.includes('港式台灣麻將牌理'));
    if (btn) btn.click();
  });
  console.log('2. Clicked 港式台灣麻將牌理');
  await new Promise(r => setTimeout(r, 500));
  
  // Input tiles
  const testHand = '1112345678999mE';
  await page.type('#inputText', testHand);
  console.log('3. Input:', testHand);
  
  // Find and click 計算 button - use evaluate
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const calcBtn = buttons.find(b => b.innerText.trim() === '計算' && b.className.includes('random-button'));
    if (calcBtn) calcBtn.click();
  });
  console.log('4. Clicked 計算');
  
  await new Promise(r => setTimeout(r, 3000));
  
  // Get result
  const result = await page.evaluate(() => {
    const outputs = document.querySelectorAll('.output, #output-tw');
    if (outputs.length > 0) {
      return Array.from(outputs).map(o => o.innerText).join('\n---next---\n');
    }
    return 'No output found';
  });
  console.log('5. Result:\n', result.substring(0, 3000));
  
  await browser.close();
})();
