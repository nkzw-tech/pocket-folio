import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';
import { controlValue } from './control-helpers.mjs';

const base = 'http://127.0.0.1:5217';
const browser = await chromium.launch({ ...browserOptions, headless: true });
try {
  const owner = await browser.newContext({ reducedMotion: 'reduce' });
  const guest = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await owner.newPage();
  page.setDefaultTimeout(10_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  // Public browsing, then one complete create → edit → reload → share flow.
  await page.goto(base + '/cards', { waitUntil: 'domcontentloaded' });
  await page.locator('.binder-card').first().waitFor();
  const signup = await owner.request.post(base + '/api/auth/sign-up/email', {
    data: {
      email: `smoke-${randomUUID()}@example.com`,
      name: 'Smoke test',
      password: 'local-only-smoke-test-password',
    },
    headers: { Origin: base },
  });
  assert.equal(signup.status(), 200);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page
    .locator('.library-heading')
    .getByRole('button', { exact: true, name: 'New binder' })
    .click();
  await page.getByLabel('Name', { exact: true }).fill('Smoke binder');
  await page.getByRole('button', { exact: true, name: 'Create binder' }).click();
  await page.getByRole('button', { exact: true, name: 'Add card to pocket' }).first().click();
  await page.getByRole('combobox', { name: 'Find a card' }).fill('Simsala');
  await page.getByRole('combobox', { name: 'Find a card' }).press('Escape');
  await page.getByRole('button', { exact: true, name: 'Insert Simsala 1/102' }).click();
  await page.getByRole('button', { exact: true, name: 'View Alakazam 1/102, owned' }).waitFor();

  // Sharing requires the pending collection edits to reach the server first.
  await page.getByRole('button', { exact: true, name: 'Share' }).click();
  await page.getByRole('button', { exact: true, name: 'Create share link' }).click();
  const copy = page.getByRole('button', { exact: true, name: 'Copy link' });
  await copy.waitFor();
  await page.waitForFunction((button) => !button.disabled, await copy.elementHandle());
  const shareUrl = await controlValue(page.getByLabel('Read-only link'));
  assert(shareUrl.startsWith(base + '/b/'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { exact: true, name: 'View Alakazam 1/102, owned' }).waitFor();
  const saved = await (await owner.request.get(base + '/api/workspace')).json();
  assert.equal(saved.document.binders[0].slots[0], 'base1-1:unlimited');
  assert.equal(saved.document.ownership['base1-1:unlimited'], true);

  assert.equal((await guest.request.get(base + '/api/workspace')).status(), 401);
  const publicPage = await guest.newPage();
  publicPage.setDefaultTimeout(10_000);
  publicPage.on('pageerror', (error) => errors.push(error.message));
  await publicPage.goto(shareUrl, { waitUntil: 'domcontentloaded' });
  await publicPage
    .getByRole('button', { exact: true, name: 'View Alakazam 1/102, owned' })
    .waitFor();
  assert.equal(await publicPage.locator('.folio-add,.folio-edit,.folio-own').count(), 0);
  assert.equal(
    await publicPage.getByRole('button', { exact: true, name: 'Binder settings' }).count(),
    0,
  );
  assert.deepEqual(errors, []);
  process.stdout.write(
    'PASS: public catalog, account, binder creation, card insertion, persistence and read-only sharing.\n',
  );
} finally {
  await browser.close();
}
