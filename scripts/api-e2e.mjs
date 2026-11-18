import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';
import { browserOptions } from './browser-options.mjs';
import { controlValue, selectOption } from './control-helpers.mjs';
import { verifyLocalEmail } from './verification-helpers.mjs';
const base = 'http://127.0.0.1:5217';
const browser = await chromium.launch({
  ...browserOptions,
  headless: true,
});
let cliDirectory;
function cli(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [process.env.PKMN_TEST_CLI ?? 'packages/pocket-folio/cli/pocket-folio.mjs', ...args],
      {
        env: { ...process.env, PKMN_CONFIG_DIR: cliDirectory },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    let output = '',
      error = '';
    child.stdout.on('data', (c) => (output += c));
    child.stderr.on('data', (c) => (error += c));
    child.on('close', (code) =>
      code === 0 ? resolve(JSON.parse(output)) : reject(new Error(error)),
    );
    child.on('error', reject);
    child.stdin.end(input);
  });
}
try {
  const owner = await browser.newContext(),
    other = await browser.newContext();
  let ownerId;
  for (const ctx of [owner, other]) {
    const email = `binder-api-${randomUUID()}@example.com`;
    const response = await ctx.request.post(base + '/api/auth/sign-up/email', {
      data: {
        email,
        name: 'API test',
        password: 'local-only-api-test-password',
      },
      headers: { Origin: base },
    });
    assert.equal(response.status(), 200, await response.text());
    const account = (await response.json()).user;
    assert.equal(account.emailVerified, false);
    assert.equal(
      (await ctx.request.get(base + '/api/workspace')).status(),
      200,
      'Unverified accounts can use their binders',
    );
    const rejected = await ctx.request.post(base + '/api/settings/keys', {
      data: { name: 'Unverified', scopes: ['collection:read'] },
      headers: { Origin: base },
    });
    assert.equal(rejected.status(), 403);
    assert.match((await rejected.json()).error, /Verify your email/);
    if (ctx === owner) {
      ownerId = account.id;
      const page = await ctx.newPage();
      await page.goto(base + '/settings?tab=api');
      await page
        .getByText('Verify your email before creating or using API keys.', { exact: true })
        .waitFor();
      assert.equal(
        await page.getByRole('button', { exact: true, name: 'Create API key' }).count(),
        0,
      );
      await page.getByRole('button', { exact: true, name: 'Verify your email' }).click();
      await page.getByRole('button', { exact: true, name: 'Send verification email' }).waitFor();
      await page.close();
    }
    await verifyLocalEmail(ctx, base, email);
  }
  const settings = async (data, ctx = owner) => {
    const response = await ctx.request.post(base + '/api/settings/keys', {
      data,
      headers: { Origin: base },
    });
    assert.equal(response.status(), 200, await response.text());
    return response.json();
  };
  const key = await settings({
    expiresInDays: 30,
    name: 'Agent test',
    scopes: ['collection:read', 'ownership:write', 'binders:write', 'sharing:write'],
  });
  const call = async (path, body, token = key.key) => {
    const response = await owner.request.fetch(base + '/api/v1/' + path, {
      data: body || undefined,
      headers: { Authorization: `Bearer ${token}` },
      method: body ? 'POST' : 'GET',
    });
    return { body: await response.json(), status: response.status() };
  };
  let state = await call('collection');
  assert.equal(state.status, 200, JSON.stringify(state.body));
  const revocable = await settings({
    name: 'Revoke while unverified',
    scopes: ['collection:read'],
  });
  // Exercise an existing key if its owner's current verification is removed.
  // Only this freshly-created local fixture account is changed.
  assert.match(ownerId, /^[a-zA-Z0-9_-]+$/);
  const verification = (verified) =>
    execFileSync(
      'vp',
      [
        'exec',
        'void',
        'db',
        'execute',
        `UPDATE user SET emailVerified = ${verified ? 1 : 0} WHERE id = '${ownerId}'`,
      ],
      { stdio: 'pipe' },
    );
  verification(false);
  try {
    assert.equal((await call('collection')).status, 403);
    assert.equal((await call('catalog')).status, 403);
    assert.equal(
      (await call('changes', { expectedRevision: state.body.revision, operations: [] })).status,
      403,
    );
    assert.equal((await owner.request.get(base + '/api/settings/keys')).status(), 200);
    assert.equal(
      (
        await owner.request.delete(base + '/api/settings/keys', {
          data: { id: revocable.id },
          headers: { Origin: base },
        })
      ).status(),
      200,
      'Unverified accounts must still be able to revoke keys',
    );
    assert.equal(
      (
        await owner.request.post(base + '/api/settings/keys', {
          data: { name: 'Stale session', scopes: ['collection:read'] },
          headers: { Origin: base },
        })
      ).status(),
      403,
      'A previously verified session must not authorize new keys',
    );
  } finally {
    verification(true);
  }
  assert.equal((await call('collection')).status, 200);
  const binderId = randomUUID();
  const secretBinder = randomUUID();
  const operations = [
    {
      command: {
        binder: {
          columns: 3,
          doubleSided: false,
          id: binderId,
          name: 'API binder',
          rows: 3,
          shareToken: null,
          slots: ['13:first', 'base1-1:unlimited'],
        },
        type: 'binder.create',
      },
      id: randomUUID(),
    },
    {
      command: { printing: '13:first', status: 'purchased', type: 'ownership.status' },
      id: randomUUID(),
    },
  ];
  const payload = { expectedRevision: state.body.revision, operations };
  assert.equal((await call('changes', { ...payload, dryRun: true })).status, 200);
  assert.equal((await call('collection')).body.document.binders.length, 0);
  const applied = await call('changes', payload);
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.equal(applied.body.document.ownership['13:first'], 'purchased');
  assert.equal((await call('changes', payload)).body.revision, applied.body.revision);
  assert.equal(
    (
      await call('changes', {
        ...payload,
        operations: [{ ...operations[1], command: { ...operations[1].command, status: 'owned' } }],
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await call('changes', {
        expectedRevision: 0,
        operations: [
          {
            command: { printing: '13:first', status: 'owned', type: 'ownership.status' },
            id: randomUUID(),
          },
        ],
      })
    ).status,
    409,
  );
  const readonly = await settings({ name: 'Read only', scopes: ['collection:read'] });
  assert.equal(
    (
      await call(
        'changes',
        {
          expectedRevision: applied.body.revision,
          operations: [
            {
              command: { printing: '13:first', status: 'owned', type: 'ownership.status' },
              id: randomUUID(),
            },
          ],
        },
        readonly.key,
      )
    ).status,
    403,
  );
  state = await call('collection');
  assert.equal(
    (
      await call('changes', {
        expectedRevision: state.body.revision,
        operations: [
          {
            command: {
              binder: {
                columns: 3,
                doubleSided: false,
                id: secretBinder,
                name: 'Private binder',
                rows: 3,
                shareToken: null,
                slots: ['base5-83:first'],
              },
              type: 'binder.create',
            },
            id: randomUUID(),
          },
        ],
      })
    ).status,
    200,
  );
  const restricted = await settings({
    binderIds: [binderId],
    name: 'One binder',
    scopes: ['collection:read', 'ownership:write'],
  });
  state = await call('collection', undefined, restricted.key);
  assert.equal(state.body.document.binders.length, 1);
  assert.equal(
    (
      await call(
        'changes',
        {
          expectedRevision: state.body.revision,
          operations: [
            {
              command: { printing: 'base5-83:first', status: 'owned', type: 'ownership.status' },
              id: randomUUID(),
            },
          ],
        },
        restricted.key,
      )
    ).status,
    403,
  );
  assert.equal((await other.request.get(base + '/api/settings/keys')).status(), 200);
  assert.equal(
    (await (await other.request.get(base + '/api/settings/keys')).json()).keys.length,
    0,
  );
  assert.equal(
    (
      await other.request.delete(base + '/api/settings/keys', {
        data: { id: key.id },
        headers: { Origin: base },
      })
    ).status(),
    404,
  );
  assert.equal(
    (await owner.request.get(base + '/api/settings/keys')).status(),
    200,
    'Session before direct endpoint',
  );
  assert.ok(
    [401, 403].includes(
      (
        await owner.request.post(base + '/api/auth/api-key/create', {
          data: { name: 'Bypass' },
          headers: { Origin: base },
        })
      ).status(),
    ),
  );
  assert.equal(
    (await owner.request.get(base + '/api/settings/keys')).status(),
    200,
    'Session after direct endpoint',
  );
  assert.ok(
    [401, 403].includes(
      (
        await owner.request.post(base + '/api/settings/keys', {
          data: { name: 'Forbidden', scopes: ['collection:read'] },
          headers: { Origin: 'https://evil.example' },
        })
      ).status(),
    ),
  );
  assert.equal((await call('catalog?q=Raikou&set=vs')).body.cards[0].id, '94');
  const activity = await (await owner.request.get(base + '/api/settings/activity')).json();
  assert.equal(activity.activity.length, 2);
  assert(!JSON.stringify(activity).includes(key.key));
  cliDirectory = await mkdtemp(join(tmpdir(), 'pkmn-cli-'));
  await cli(['auth', 'login', '--origin', base, '--stdin'], key.key);
  assert.equal((await cli(['auth', 'status'])).keyId, key.id);
  assert(!String(await readFile(join(cliDirectory, 'config.json'))).includes(key.key));
  const commands = join(cliDirectory, 'commands.json'),
    plan = join(cliDirectory, 'plan.json');
  await writeFile(
    commands,
    JSON.stringify([{ printing: '13:first', status: 'owned', type: 'ownership.status' }]),
  );
  await cli(['changes', 'preview', commands, '--out', plan]);
  const result = await cli(['changes', 'apply', plan]);
  assert.equal(result.document.ownership['13:first'], true);
  assert.equal((await cli(['changes', 'apply', plan])).revision, result.revision);
  await cli(['auth', 'logout']);
  const guest = await browser.newContext({ viewport: { height: 844, width: 390 } });
  const guide = await guest.newPage();
  await guest.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  for (const [url, file] of [
    ['/agent/SKILL.md', 'packages/pocket-folio/skills/pocket-folio/SKILL.md'],
    ['/agent/references/api.md', 'packages/pocket-folio/skills/pocket-folio/references/api.md'],
  ]) {
    const response = await guest.request.get(base + url);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /text\/plain/);
    assert.equal(await response.text(), await readFile(file, 'utf8'));
  }
  assert.equal((await guest.request.get(base + '/agent/private')).status(), 404);
  await guide.goto(base + '/agents');
  await guide.getByRole('heading', { exact: true, name: 'Connect your agent' }).waitFor();
  await selectOption(guide.getByRole('combobox', { exact: true, name: 'Agent' }), 'claude');
  await guide.getByRole('button', { exact: true, name: 'Copy skill command' }).click();
  assert.equal(
    await guide.evaluate(() => globalThis.navigator.clipboard.readText()),
    'pocket-folio skill install --agent claude',
  );
  await guide.getByRole('button', { exact: true, name: 'Copy login command' }).click();
  assert.equal(
    await guide.evaluate(() => globalThis.navigator.clipboard.readText()),
    `pocket-folio auth login --origin '${base}'`,
  );
  assert(
    await guide.evaluate(
      () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth,
    ),
  );
  await guide.screenshot({ fullPage: true, path: '/tmp/pocket-folio-agent-setup-mobile.png' });
  await guide.setViewportSize({ height: 1000, width: 1280 });
  await guide.screenshot({ fullPage: true, path: '/tmp/pocket-folio-agent-setup-desktop.png' });
  await guest.close();
  const page = await owner.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + '/settings?tab=api');
  await page.getByRole('heading', { exact: true, name: 'Connect your agent' }).waitFor();
  await page.getByRole('heading', { exact: true, name: 'API keys' }).waitFor();
  await page.getByRole('textbox', { exact: true, name: 'Key name' }).fill('Browser UI key');
  await page.getByRole('button', { exact: true, name: 'Create API key' }).click();
  const secretInput = page.getByRole('textbox', { exact: true, name: 'New API key' });
  await secretInput.waitFor();
  const browserKey = await controlValue(secretInput);
  await owner.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
  await page.getByRole('button', { exact: true, name: 'Copy example request' }).click();
  const example = await page.evaluate(() => globalThis.navigator.clipboard.readText());
  assert(example.includes(base));
  assert(!example.includes(browserKey), 'Agent instructions must never contain the API key');
  assert.equal((await call('collection', undefined, browserKey)).status, 200);
  await page.getByRole('button', { exact: true, name: 'Done' }).click();
  assert.equal(await secretInput.count(), 0);
  const browserKeyRow = page.locator('.key-row').filter({ hasText: 'Browser UI key' });
  await browserKeyRow.getByRole('button', { exact: true, name: 'Revoke' }).click();
  await browserKeyRow.getByText('Revoked', { exact: false }).waitFor();
  assert.equal((await call('collection', undefined, browserKey)).status, 401);
  await page.screenshot({ fullPage: true, path: '/tmp/pkmn-settings.png' });
  await page.getByRole('tab', { exact: true, name: 'App' }).click();
  await selectOption(page.getByRole('combobox', { name: 'Interface language' }), 'de-DE');
  await page.getByRole('heading', { exact: true, name: 'Einstellungen' }).waitFor();
  await selectOption(page.getByRole('combobox', { name: 'Sprache der Oberfläche' }), 'ja-JP');
  await page.getByRole('heading', { exact: true, name: '設定' }).waitFor();
  await page
    .getByRole('navigation')
    .getByRole('link', { exact: true, name: 'バインダー' })
    .waitFor();
  await page.reload();
  await page.getByRole('heading', { exact: true, name: '設定' }).waitFor();
  await page.setViewportSize({ height: 844, width: 390 });
  await page.screenshot({ fullPage: true, path: '/tmp/pkmn-settings-ja-mobile.png' });
  assert(
    await page.evaluate(
      () => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth + 1,
    ),
  );
  assert.deepEqual(errors, []);
  assert.equal(
    (
      await owner.request.delete(base + '/api/settings/keys', {
        data: { id: key.id },
        headers: { Origin: base },
      })
    ).status(),
    200,
  );
  assert.equal((await call('collection')).status, 401);
  process.stdout.write(
    'PASS: scoped keys, account isolation, preview/apply, replay, conflicts, auditing, keychain CLI, revocation, localization and mobile settings.\n',
  );
} finally {
  await browser.close();
}
