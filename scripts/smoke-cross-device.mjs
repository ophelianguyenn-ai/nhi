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
    res.write('event: put\ndata: ' + JSON.stringify({ path: '/', data: db }) + '\n\n');
    req.on('close', () => streams.delete(res));
    return;
  }
  if (req.method === 'PATCH') {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      const patch = JSON.parse(raw);
      Object.keys(patch).forEach(key => { db[key] = patch[key]; });
      const event = 'event: patch\ndata: ' + JSON.stringify({ path: '/', data: patch }) + '\n\n';
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
  try {
    await page.waitForFunction(expected => {
      const data = JSON.parse(localStorage.getItem('viko-plan-sess-v1') || '{}');
      const card = document.querySelector('#planBox .pcard');
      return card && Array.isArray(data.queue) && data.pos === expected - 1 &&
        document.querySelector('#view-plan').hidden === false;
    }, { timeout: 13000 }, n);
  } catch (error) {
    const diag = await page.evaluate(() => ({
      hash: location.hash, sync: document.querySelector('#sync')?.textContent,
      mode: JSON.parse(localStorage.getItem('viko-ko-meeting-ui-v1') || '{}').mode,
      viewHidden: document.querySelector('#view-plan')?.hidden,
      counter: document.querySelector('#planBox .counter')?.textContent,
      card: document.querySelector('#planBox .pcard')?.textContent?.slice(0, 100),
      plan: document.querySelector('#planBox')?.textContent?.slice(0, 300),
      active: localStorage.getItem('nlc-active-card-v1')?.slice(0, 350),
      session: localStorage.getItem('viko-plan-sess-v1')?.slice(0, 350),
      documentReady: document.readyState
    }));
    console.log('CURSOR TIMEOUT:', n, JSON.stringify(diag), 'CLOUD:', JSON.stringify(db), 'ERRORS:', JSON.stringify(errors));
    throw error;
  }
}
let laptop, phone;
try {
  laptop = await makeDevice('laptop', ROOT + '#/bai/' + lesson.id);
  phone = await makeDevice('phone', ROOT + '?v=20261125-v143&utm_source=chatgpt.com#/lich-hoc');
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
  // A remote cursor must NEVER pull an explicit calendar route into a lesson.
  await new Promise(r=>setTimeout(r,1200));
  async function assertCalendar(){
    const route=await phone.page.evaluate(()=>({hash:location.hash,search:location.search,card:!!document.querySelector('#planBox .pcard'),view:!document.querySelector('#view-plan').hidden}));
    if(route.hash!=='#/lich-hoc'||route.search!=='?v=20261125-v143&utm_source=chatgpt.com'||route.card||!route.view)throw Error('Calendar was hijacked: '+JSON.stringify(route));
  }
  await assertCalendar();
  const paused=await laptop.page.evaluate(()=>localStorage.getItem('viko-plan-sess-v1'));
  await phone.page.evaluate(saved=>localStorage.setItem('viko-plan-sess-v1',saved),paused);
  await phone.page.reload({waitUntil:'domcontentloaded'});
  await enableSync(phone.page);
  await phone.page.waitForFunction(()=>!!document.querySelector('#planBox .plesson'));
  await new Promise(r=>setTimeout(r,1200));
  await assertCalendar();
  console.log('PASS: calendar reload preserves exact URL with stale local session and live remote cursor');
  // Same lesson selected deliberately: cursor following remains available.
  await phone.page.goto(ROOT+'#/bai/'+lesson.id,{waitUntil:'domcontentloaded'});
  await enableSync(phone.page);
  await checkCounter(phone.page, 1);

  for (let i = 0; i < 3; i++) {
    await laptop.page.$eval('#planBox .parrow[aria-label="Thẻ sau"]', button => button.click());
  }
  await checkCounter(laptop.page, 4);
  await checkCounter(phone.page, 4);
  const phoneHash = await phone.page.evaluate(() => location.hash);
  if (phoneHash !== '#/bai/' + lesson.id) throw Error('Phone deep-link wrong: ' + phoneHash);

  // Local preview deliberately disables preset Firebase on reload; manually re-enable it.
  await phone.page.reload({ waitUntil: 'domcontentloaded' });
  await enableSync(phone.page);
  await checkCounter(phone.page, 4);

  await phone.page.$eval('#planBox .parrow[aria-label="Thẻ sau"]', button => button.click());
  await checkCounter(laptop.page, 5);

  await laptop.page.evaluate(() => {
    const b = document.querySelector('#menuList [data-mode="cards"]');
    if (!b) throw Error('Cannot switch to flashcards');
    b.click();
  });
  await laptop.page.waitForFunction(() => !document.querySelector('#view-cards').hidden);
  await laptop.page.click('#next');
  // Different active pages are no longer forcibly synchronized.
  await new Promise(r=>setTimeout(r,700));
  const stillLesson=await phone.page.evaluate(()=>location.hash);
  if(stillLesson!=='#/bai/'+lesson.id)throw Error('Remote classic cards replaced lesson URL');
  await phone.page.evaluate(()=>document.querySelector('#menuList [data-mode="cards"]').click());
  await phone.page.waitForFunction(()=>!document.querySelector('#view-cards').hidden);
  await laptop.page.click('#next');
  await new Promise(r=>setTimeout(r,700));
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
