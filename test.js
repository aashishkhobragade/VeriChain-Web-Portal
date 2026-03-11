const puppeteer = require('puppeteer');
(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER_ERROR:', err.toString()));
        await page.goto('http://localhost:8000/test_register.html');
        console.log("WAITING 1s...");
        await new Promise(r => setTimeout(r, 1000));
        
        console.log("CLICKING CONNECT...");
        await page.click('#connectBtn');
        await new Promise(r => setTimeout(r, 2000));
        
        console.log("CLICKING REGISTER...");
        await page.click('#registerBtn');
        await new Promise(r => setTimeout(r, 2000));
        
        await browser.close();
    } catch (e) {
        console.error("TEST FAILED", e);
    }
})();
