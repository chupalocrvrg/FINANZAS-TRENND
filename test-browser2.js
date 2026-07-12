import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  const rootHTML = await page.evaluate(() => {
    return document.getElementById('root').innerHTML;
  });
  console.log('ROOT HTML:', rootHTML);
  
  await browser.close();
})();
