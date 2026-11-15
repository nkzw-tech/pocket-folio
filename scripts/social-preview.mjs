import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';

const root = resolve(import.meta.dirname, '..');
const dataURL = async (path, type) =>
  `data:${type};base64,${(await readFile(resolve(root, path))).toString('base64')}`;
const font = await dataURL('public/fonts/salesforce/SalesforceSans-Bold.woff2', 'font/woff2');
const book = await dataURL('public/fonts/salesforce/SalesforceSans-Book.woff2', 'font/woff2');
const cards = await Promise.all(
  ['094', '100', '013'].map((id) =>
    dataURL(`.cache/card-assets/files/cards/vs/${id}.webp`, 'image/webp'),
  ),
);
const browser = await chromium.launch({
  ...browserOptions,
  headless: true,
});
try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 630, width: 1200 },
  });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>
  @font-face{font-family:Folio;src:url('${font}');font-weight:700}
  @font-face{font-family:Folio;src:url('${book}');font-weight:400}
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;overflow:hidden;background:#141417;color:#f5f4fa;font-family:Folio,sans-serif}
  .halo{position:absolute;inset:0;background:radial-gradient(ellipse at 81% 42%,#6470ad38,transparent 43%),radial-gradient(ellipse at 62% 80%,#bb6a9825,transparent 42%)}
  .frame{position:absolute;inset:24px;border:1px solid #ffffff13;border-radius:48px;corner-shape:squircle}
  .brand{position:absolute;left:72px;top:64px;display:flex;align-items:center;gap:16px;font-size:26px;font-weight:700;letter-spacing:-.4px}
  .mark{width:48px;height:48px;display:grid;place-items:center;border:1px solid #ffffff24;border-radius:16px;corner-shape:squircle;background:linear-gradient(135deg,#b6d9ff28,#d9acf724,#e9d99418)}
  h1{position:absolute;left:72px;top:210px;margin:0;width:490px;font-size:64px;line-height:1.03;letter-spacing:-2.7px}
  .domain{position:absolute;left:76px;bottom:58px;color:#858591;font-size:17px;letter-spacing:.4px}
  .fan{position:absolute;left:570px;top:128px;width:540px;height:440px}
  .card{position:absolute;width:226px;height:316px;border-radius:12px;top:32px;left:157px;box-shadow:0 28px 52px #0009,0 0 0 1px #ffffff20;isolation:isolate;overflow:hidden}
  .card img{width:100%;height:100%;display:block}
  .card:first-child{transform:translate(-118px,30px) rotate(-17deg)}
  .card:nth-child(2){z-index:2;transform:translate(0,-22px) rotate(2deg)}
  .card:last-child{transform:translate(118px,30px) rotate(18deg)}
  .card.holo:after{content:'';position:absolute;inset:10% 9% 48%;background:linear-gradient(125deg,#96dbff00 10%,#c9b8ff88 30%,#fffacb44 45%,#b3e5ff77 58%,#dfb2ff00 80%);mix-blend-mode:screen;opacity:.5;mask-image:radial-gradient(ellipse,#000 30%,transparent 75%)}
  </style><div class="halo"></div><div class="frame"></div>
  <div class="brand"><span class="mark"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e5ddf6" stroke-width="1.5" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></svg></span>Pocket Folio</div>
  <h1>Your card<br>collection.</h1>
  <span class="domain">folio.nakazawa.tech</span>
  <div class="fan">${cards.map((src, index) => `<div class="card ${index !== 1 ? 'holo' : ''}"><img src="${src}" alt=""></div>`).join('')}</div></html>`);
  await page.evaluate(async () => {
    await globalThis.document.fonts.ready;
    await Promise.all([...globalThis.document.images].map((image) => image.decode()));
  });
  await mkdir(resolve(root, '.cache/card-assets/files/social'), { recursive: true });
  await page.screenshot({
    path: resolve(root, '.cache/card-assets/files/social/pocket-folio.png'),
  });
} finally {
  await browser.close();
}
