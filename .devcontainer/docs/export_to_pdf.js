// Credits for script: https://github.com/majkinetor/mm-docs-template/blob/master/source/pdf/print.js
// Requires: npm i --save puppeteer
import puppeteer from 'puppeteer';

var args = process.argv.slice(2);
var url = args[0];
var pdfPath = args[1];
var title = args[2];

console.log('Saving', url, 'to', pdfPath);

// date –  formatted print date
// title – document title
// url  – document location
// pageNumber – current page number
// totalPages – total pages in the document
const headerHtml = ` `;

const footerHtml = `
<div style="font-size: 10px; padding-right: 1em; text-align: center; width: 100%;">
    Page <span class="pageNumber"></span> / <span class="totalPages"></span>
</div>`;


(async() => {
		console.log('==> Launching Chrome...');
    const browser = await puppeteer.launch({
        headless: true,
				timeout: 60000,
        executablePath: '/usr/bin/chromium',
        args: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage']
    });

		console.log('==> Browser launched...');
    const page = await browser.newPage();
		console.log('==> Waiting for page to be available...');
    await page.goto(url, { waitUntil: 'networkidle2' });
		console.log('==> Rendering to PDF...');
    await page.pdf({
        path: pdfPath, // path to save pdf file
        format: 'A4', // page format
        displayHeaderFooter: true, // display header and footer
        printBackground: true, // print background
        landscape: false, // use horizontal page layout
        headerTemplate: headerHtml, // indicate html template for header
        footerTemplate: footerHtml,
        scale: 1,
        margin: {
            top: 80,
            bottom: 80,
            left: 30,
            right: 30
        }
    });
		console.log('Done.');

    await browser.close();
})();
