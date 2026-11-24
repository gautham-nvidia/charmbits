import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(repo, 'extension/package.json'));
const { chromium } = require('@playwright/test');
const { PNG } = require('pngjs');
const iconOnly = process.argv.includes('--icon-only');
const capturesArgument = process.argv.find(value => value.startsWith('--captures='));
if (!iconOnly && !capturesArgument) throw new Error('Provide --captures=DIRECTORY or --icon-only.');
const captures = capturesArgument ? resolve(capturesArgument.slice('--captures='.length)) : undefined;
const output = join(repo, 'docs/store-assets');
const image = async path => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
const font = async filename => `data:font/ttf;base64,${(await readFile(join(repo, 'website/assets/fonts', filename))).toString('base64')}`;
async function crop(filename, height) {
  const original = PNG.sync.read(await readFile(join(captures, filename)));
  const cropped = new PNG({ width: original.width, height: Math.min(height, original.height) });
  PNG.bitblt(original, cropped, 0, 0, cropped.width, cropped.height, 0, 0);
  return `data:image/png;base64,${PNG.sync.write(cropped).toString('base64')}`;
}
const mascot = await image(join(repo, 'extension/media/live-art-cali-thumbs.png'));
const styles = `
@font-face { font-family: Brand; src: url("${await font('bricolage-grotesque-variable.ttf')}"); font-weight: 200 800; }
@font-face { font-family: Body; src: url("${await font('manrope-variable.ttf')}"); font-weight: 200 800; }
* { box-sizing: border-box; }
body { margin: 0; background: #fff; color: #233f34; font-family: Body, sans-serif; }
.board { position: relative; width: 1400px; height: 760px; overflow: hidden; background: #f8f8f0; }
.board.short { height: 680px; }
h1,h2,p { margin: 0; }
h1,h2 { font-family: Brand, sans-serif; letter-spacing: -.045em; line-height: 1.04; }
.brand { position: absolute; top: 46px; left: 64px; font: 750 40px Brand; letter-spacing: -.055em; }
.pill { display: inline-block; padding: 13px 22px; background: #244b3b; color: #fff; border-radius: 50px; font-size: 20px; font-weight: 750; letter-spacing: .02em; }
.hero .pill { position: absolute; top: 48px; right: 64px; }
.hero h1 { position: absolute; left: 64px; top: 147px; font-size: 82px; }
.hero .intro { position: absolute; left: 68px; top: 335px; font-size: 24px; line-height: 1.5; }
.hero .halo { position: absolute; width: 510px; height: 570px; border-radius: 48% 48% 42% 42%; background: #e3ead5; right: 80px; top: 140px; }
.hero .bear { position: absolute; width: 550px; height: 550px; object-fit: contain; right: 60px; bottom: 12px; }
.hero .workspace { position: absolute; left: 68px; top: 435px; width: 570px; height: 285px; border: 1px solid #d7ddd4; border-radius: 16px; box-shadow: 0 16px 32px #233f3412; }
.hero .cali-label { position: absolute; right: 420px; top: 190px; font: 600 21px Body; }
.kicker { position: absolute; top: 44px; left: 64px; font-size: 18px; font-weight: 750; letter-spacing: .1em; text-transform: uppercase; }
.choices { background: #edf1e5; }
.choices h2 { position: absolute; top: 90px; left: 62px; font-size: 66px; }
.choices .description { position: absolute; top: 250px; left: 67px; font-size: 23px; line-height: 1.6; }
.choices .bracelet { position: absolute; left: 63px; top: 354px; width: 680px; height: 347px; border: 1px solid #d8ded2; border-radius: 22px; object-fit: contain; object-position: center; background: #f7f7f7; box-shadow: 0 20px 35px #233f3410; }
.choices .picker { position: absolute; right: 70px; top: 54px; height: 652px; width: auto; border-radius: 18px; border: 1px solid #d8ded2; box-shadow: 0 20px 35px #233f3412; }
.board.garden { background: #f6f0e6; height: 760px; }
.garden h2 { position: absolute; left: 64px; top: 47px; font-size: 57px; }
.garden .focus { position: absolute; left: 66px; top: 190px; width: 500px; height: 500px; object-fit: contain; padding: 25px; border: 1px solid #e3ddce; background: #f7f7f7; border-radius: 20px; box-shadow: 0 15px 30px #493f2810; }
.garden .garden-shot { position: absolute; right: 76px; top: 70px; height: 610px; width: auto; border-radius: 20px; border: 1px solid #e3ddce; box-shadow: 0 15px 30px #493f2810; }
.garden .note { position: absolute; left: 69px; bottom: 28px; font-size: 22px; }
.keepsake { background: #f8eee7; }
.keepsake .photo-card { position: absolute; left: 66px; top: 55px; width: 590px; height: 565px; border: 1px solid #e6d6ca; border-radius: 28px; background: #f7f7f7; box-shadow: 0 18px 40px #704e3612; overflow: hidden; }
.keepsake .locket { width: 590px; height: auto; }
.keepsake .photo-note { position: absolute; left: 106px; top: 532px; font-size: 20px; color: #775d4b; }
.keepsake h2 { position: absolute; left: 730px; top: 128px; font-size: 64px; }
.keepsake .copy { position: absolute; left: 735px; top: 294px; font-size: 24px; line-height: 1.65; }
.keepsake .privacy { position: absolute; left: 735px; top: 484px; font-size: 21px; padding: 18px 23px; border: 1px solid #b8c7ab; border-radius: 14px; background: #eaf0e0; }
.icon { position: relative; width: 256px; height: 256px; overflow: hidden; border-radius: 38px; background: #e5eddc; }
.icon img { position: absolute; width: 348px; height: 348px; left: -40px; top: 10px; }
`;
const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 760 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function render(body) {
    await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><style>${styles}</style><body>${body}</body></html>`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
    });
  }
  await render(`<div class="icon"><img src="${mascot}" alt="Cali giving a friendly thumbs-up"></div>`);
  await page.locator('.icon').screenshot({ path: join(repo, 'extension/media/marketplace-icon.png') });
  if (captures) {
    await page.locator('.icon').evaluate(element => {
      element.style.transform = 'scale(.5)';
      element.style.transformOrigin = 'top left';
    });
    await page.locator('.icon').screenshot({ path: join(captures, 'cali-publisher-128.png') });
  }
  if (iconOnly) {
    console.log('Rendered the Cali Marketplace icon.');
  } else {
    const receipt = JSON.parse(await readFile(join(captures, 'capture-receipt.json'), 'utf8'));
    assert.equal(receipt.actualInstalledPublicApp, true);
    assert.equal(receipt.noOwnerPhotosUsed, true);
    const boards = [
      ['cali-hero-0161.png', `<section class="board hero"><div class="brand">CharmBits</div><div class="pill">FREE FOR VS CODE</div><div class="halo"></div><h1>Good company.<br>For your code.</h1><p class="intro">A little luck. A little focus.<br>A little closer to home.</p><img class="workspace" src="${await image(join(captures, 'cali-workspace.png'))}" alt="Cali running in VS Code"><img class="bear" src="${mascot}" alt="Cali, the CharmBits mascot"><p class="cali-label">Meet Cali.</p></section>`],
      ['choose-and-play-0161.png', `<section class="board choices"><p class="kicker">Make it yours</p><h2>Your favourites.<br>Better together.</h2><p class="description">241 charms · 13 cord choices<br>Five bracelet styles. Room for three little favourites.</p><img class="bracelet" src="${await crop('bracelet.png', 240)}" alt="Cali, a dog locket and a rose on a bracelet"><img class="picker" src="${await image(join(captures, 'collection.png'))}" alt="The actual free charm collection picker"></section>`],
      ['garden-focus-0161.png', `<section class="board short garden"><h2>A little focus.<br>A little progress.</h2><img class="focus" src="${await image(join(captures, 'focus.png'))}" alt="A focus session in the actual app"><img class="garden-shot" src="${await image(join(captures, 'garden.png'))}" alt="A hibiscus blooming in the actual garden"><p class="note">Water once a day. Bloom at your own pace.</p></section>`],
      ['dog-keepsake-0161.png', `<section class="board short keepsake"><div class="photo-card"><img class="locket" src="${await crop('dog-locket.png', 315)}" alt="The actual dog photo locket in CharmBits"></div><p class="photo-note">A favourite face, wherever the day takes you.</p><h2>A little closer<br>to home.</h2><p class="copy">Family. A beloved pet.<br>Someone whose blessing you carry.<br>Make their photo your keepsake.</p><p class="privacy">Your photos stay on your device.</p></section>`],
    ];
    await mkdir(output, { recursive: true });
    const files = [];
    for (const [filename, body] of boards) {
      await render(body);
      const bytes = await page.locator('.board').screenshot({ path: join(output, filename) });
      files.push({ file: filename, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      console.log(`Rendered ${filename}: ${bytes.length} bytes`);
    }
    assert.deepEqual(errors, []);
    await writeFile(join(captures, 'composition-receipt.json'), `${JSON.stringify({
      capturedVersion: receipt.version, sourceVsixSha256: receipt.vsixSha256,
      generatedAt: new Date().toISOString(), actualAppCaptures: true, files,
    }, null, 2)}\n`);
  }
} finally { await browser.close(); }
