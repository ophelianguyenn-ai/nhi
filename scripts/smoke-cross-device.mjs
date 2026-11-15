/* Browser regression: two independent devices follow the same daily card and flashcard. */
import fs from 'node:fs';
import http from 'node:http';
import puppeteer from 'puppeteer-core';

const lesson = JSON.parse(fs.readFileSync('lessons.json', 'utf8')).lessons.find(x => (x.items || []).length >= 6);
if (!lesson) throw new Error('Need a lesson with at least six cards');
const ROOT = 'http://127.0.0.1:8765/';
const PORT = 9852;
const CODE = 'crossdevicetestcode12345678';
const db = {};
const streams = new Set();

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.url !== '/sync/' + CODE + '.json') { res.writeHead(404); res.end(); return; }
  if (req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'Connection': 'keep-alive'
    });
    streams.add(res);
    res.write('event: put\\ndata: ' + JSON.stringify({ path: '/', data: db }) + '\\n\\n');
    req.on('close', () => streams.delete(res));
    return;
  }
  if (req.method === 'PATCH') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      const patch = JSON.parse(raw);
      Object.keys(patch).forEach(key => { db[key] = patch[key]; });
      const event = 'event: patch\\ndata: ' + JSON.stringify({ path: '/', data: patch }) + '\\n\\n';
      streams.forEach(client => { try { client.write(event); } catch {} });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
    return;
  }
  res.writeHead(405); res.end();
});
await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});
const errors = [];
async function makeDevice(name, url) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  page.on('pageerror', error => errors.push(name + ': ' + String(error)));
  await page.setViewport({ width: name === 'phone' ? 390 : 1280, height: 820 });
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('nlc-cover-seen', '1'));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('#syncOn') && !!document.querySelector('#planBox'));
  return { ctx, page };
}
async function enableSync(page) {
  await page.evaluate(({ port, code }) => {
    document.querySelector('#syncUrl').value = 'http://127.0.0.1:' + port;
    document.querySelector('#syncCode').value = code;
    document.querySelector('#syncOn').click();
  }, { port: PORT, code: CODE });
  await page.waitForFunction(() => document.querySelector('#sync')?.dataset.s === 'cloud', { timeout: 12000 });
}
async function checkCounter(page, n) {
  await page.waitForFunction(expected => {
    const el = document.querySelector('#planBox .counter');
    return el && el.textContent.trim().startsWith(expected + ' /') &&
      document.querySelector('#view-plan').hidden === false;
  }, { timeout: 18000 }, n);
}
let laptop, phone;
try {
  laptop = await makeDevice('laptop', ROOT + '#/bai/' + lesson.id);
  phone = await makeDevice('phone', ROOT);
  await laptop.page.waitForSelector('#planBox .ppage', { timeout: 18000 });
  await enableSync(laptop.page);
  await enableSync(phone.page);

  await laptop.page.evaluate(() => {
    const button = [...document.querySelectorAll('#planBox button')]
      .find(b => /Học ngay|Học trước|Tiếp tục|Học lại|Ôn/.test(b.textContent || ''));
    if (!button) throw Error('Cannot start lesson');
    button.click();
  });
  await laptop.page.waitForSelector('#planBox .pcard', { timeout: 16000 });
  await checkCounter(phone.page, 1);

  for (let i = 0; i < 3; i++) {
    await laptop.page.$eval('#planBox .pnav .parrow:last-child', button => button.click());
  }
  await checkCounter(laptop.page, 4);
  await checkCounter(phone.page, 4);
  const phoneHash = await phone.page.evaluate(() => location.hash);
  if (phoneHash !== '#/bai/' + lesson.id) throw Error('Phone deep-link wrong: ' + phoneHash);

  // Local preview deliberately disables preset Firebase on reload; manually re-enable it.
  await phone.page.reload({ waitUntil: 'domcontentloaded' });
  await enableSync(phone.page);
  await checkCounter(phone.page, 4);

  await phone.page.$eval('#planBox .pnav .parrow:last-child', button => button.click());
  await checkCounter(laptop.page, 5);

  await laptop.page.evaluate(() => {
    const b = document.querySelector('#menuList [data-mode="cards"]');
    if (!b) throw Error('Cannot switch to flashcards');
    b.click();
  });
  await laptop.page.waitForFunction(() => !document.querySelector('#view-cards').hidden);
  await laptop.page.click('#next');
  await phone.page.waitForFunction(() => !document.querySelector('#view-cards').hidden, { timeout: 18000 });
  const [fromLaptop, fromPhone] = await Promise.all([
    laptop.page.$eval('#cPrompt', el => el.textContent),
    phone.page.$eval('#cPrompt', el => el.textContent)
  ]);
  if (fromLaptop !== fromPhone) throw Error('Different flashcards: ' + fromLaptop + ' / ' + fromPhone);
  if (JSON.stringify(db).includes('nlc-ai-v1')) throw Error('AI credentials must never enter synced data');
  if (errors.length) throw Error('Browser exceptions: ' + errors.join('; '));
  console.log('PASS: laptop ↔ phone daily card 1 → 4 → 5, reload and standard flashcard');
} finally {
  if (phone) await phone.ctx.close();
  if (laptop) await laptop.ctx.close();
  await browser.close();
  for (const res of streams) res.end();
  await new Promise(resolve => server.close(resolve));
}
