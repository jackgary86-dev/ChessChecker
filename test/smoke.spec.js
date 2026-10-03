// Playwright smoke test: play one move on each board, at desktop (1280px) and
// phone (390px) widths. Serves the repo over plain HTTP (module scripts are
// blocked by CORS when loaded from file://) and drives real chromium.
import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const CHROMIUM_PATH = '/opt/pw-browsers/chromium';
const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

let server;

test.beforeAll(async () => {
  server = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
  // give the server a moment to bind before the first request
  await new Promise((resolve) => setTimeout(resolve, 700));
});

test.afterAll(() => {
  server.kill();
});

async function openPage(browser, urlPath, width) {
  const context = await browser.newContext({ viewport: { width, height: Math.round(width * 1.6) } });
  const page = await context.newPage();
  await page.goto(BASE + urlPath);
  return { context, page };
}

for (const width of [1280, 390]) {
  test(`chess: select a piece and move it (${width}px)`, async () => {
    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
    const { context, page } = await openPage(browser, '/chess/index.html', width);
    const squares = page.locator('.sq');
    await expect(squares.first()).toBeVisible();
    // White pawn e2 -> e4: row6,col4 is the 53rd square (6*8+4=52, 0-indexed).
    await squares.nth(6 * 8 + 4).click();
    await expect(page.locator('.sq.selected')).toHaveCount(1);
    await squares.nth(4 * 8 + 4).click();
    await expect(page.locator('#turnPill')).toContainText('Black');
    const box = await squares.first().boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(38); // ~40px minimum, allow for rounding
    await page.screenshot({ path: path.join(here, 'screenshots', `chess-${width}.png`) });
    await context.close();
    await browser.close();
  });

  test(`checkers: select a piece and move it (${width}px)`, async () => {
    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
    const { context, page } = await openPage(browser, '/checkers/index.html', width);
    const squares = page.locator('.sq');
    await expect(squares.first()).toBeVisible();
    // Red piece at row2,col1 (index 17) has a legal forward move.
    await squares.nth(2 * 8 + 1).click();
    await expect(page.locator('.sq.selected')).toHaveCount(1);
    await squares.nth(3 * 8 + 0).click();
    await expect(page.locator('#turnPill')).toContainText('Black');
    const box = await squares.first().boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(38);
    await page.screenshot({ path: path.join(here, 'screenshots', `checkers-${width}.png`) });
    await context.close();
    await browser.close();
  });

  test(`autochess: both armies render and a battle resolves instantly (${width}px)`, async () => {
    const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
    const { context, page } = await openPage(browser, '/autochess/index.html', width);

    await expect(page.locator('#chessCount')).toHaveText('Chess: 16');
    await expect(page.locator('#checkersCount')).toHaveText('Checkers: 12');
    await expect(page.locator('.unit-icon')).toHaveCount(28);

    const box = await page.locator('.sq').first().boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(38);

    // Draft phase: click a unit, then another of its own faction, to swap them.
    await expect(page.locator('#draftHint')).toBeVisible();
    const squares = page.locator('.sq');
    await squares.nth(0).click(); // select the Bulwark at row0,col0
    await expect(page.locator('.unit-wrap.draft-selected')).toHaveCount(1);
    await squares.nth(4).click(); // swap with the High King at row0,col4
    await expect(page.locator('.unit-wrap.draft-selected')).toHaveCount(0);
    await expect(page.locator('#fightBtn')).toHaveText('Start Battle!');

    await page.click('#instantBtn');
    await expect(page.locator('#winnerBanner')).not.toHaveClass(/hidden/);
    const bannerText = await page.locator('#winnerBanner').textContent();
    expect(['Chess wins the battle!', 'Checkers wins the battle!', 'Draw — both armies fell.']).toContain(bannerText);
    await expect(page.locator('#fightBtn')).toBeDisabled();

    await page.screenshot({ path: path.join(here, 'screenshots', `autochess-${width}.png`) });

    // AUTOCHESS-09: the finished battle should have been recorded into the
    // same match-history store Chess and Checkers already write to.
    await page.goto(BASE + '/autochess/history.html');
    await expect(page.locator('.history-list li').first()).toContainText('Autochess:');

    await context.close();
    await browser.close();
  });
}
