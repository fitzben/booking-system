import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4321/booking');
  
  // Wait for React to render
  await page.waitForSelector('.bfs-container');
  
  const labels = await page.$$eval('label', els => els.map(el => ({
    text: el.innerText,
    htmlFor: el.getAttribute('for'),
    outerHTML: el.outerHTML
  })));
  
  console.log('--- LABELS FOUND ---');
  labels.forEach(l => {
    let hasControl = false;
    if (l.htmlFor) {
      hasControl = !!document.getElementById(l.htmlFor);
      // is the control a valid input?
    } else {
      // wraps an input?
    }
    console.log(`Label: ${l.text}`);
    console.log(`For: ${l.htmlFor}`);
  });
  
  const audit = await page.evaluate(() => {
    const issues = [];
    document.querySelectorAll('label').forEach(label => {
      const htmlFor = label.getAttribute('for');
      const control = htmlFor ? document.getElementById(htmlFor) : label.querySelector('input, select, textarea, button, meter, output, progress');
      const isValidControl = control && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'METER', 'OUTPUT', 'PROGRESS'].includes(control.tagName);
      if (!isValidControl) {
        issues.push({ text: label.innerText, htmlFor, controlTagName: control?.tagName });
      }
    });
    return issues;
  });
  
  console.log('--- AUDIT ISSUES ---', audit);
  await browser.close();
})();
