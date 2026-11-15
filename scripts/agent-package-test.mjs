import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const packageRoot = join(root, 'packages/pocket-folio');
const temporary = await mkdtemp(join(tmpdir(), 'pocket-folio-package-'));
try {
  await exec(process.execPath, ['--test', 'tests/skill.test.mjs'], { cwd: packageRoot });
  const { stdout } = await exec(
    'npm',
    ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary],
    { cwd: packageRoot },
  );
  const [packed] = JSON.parse(stdout);
  assert.deepEqual(
    packed.files.map(({ path }) => path).sort(),
    [
      'LICENSE',
      'README.md',
      'cli/keychain.swift',
      'cli/pocket-folio.mjs',
      'cli/skill.mjs',
      'package.json',
      'skills/pocket-folio/SKILL.md',
      'skills/pocket-folio/references/api.md',
    ].sort(),
  );
  await exec('npm', [
    'install',
    '--prefix',
    temporary,
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--offline',
    join(temporary, packed.filename),
  ]);
  const cli = join(temporary, 'node_modules/.bin/pocket-folio');
  const run = (args) =>
    exec(cli, args, {
      cwd: temporary,
      env: { ...process.env, PKMN_CONFIG_DIR: join(temporary, 'credentials') },
    });
  const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal((await run(['--version'])).stdout.trim(), metadata.version);
  assert.match((await run(['--help'])).stdout, /skill install/);
  const skill = (await run(['skill', 'show'])).stdout;
  assert.equal(skill, await readFile(join(packageRoot, 'skills/pocket-folio/SKILL.md'), 'utf8'));
  const directory = join(temporary, 'agent-skills');
  const installed = JSON.parse((await run(['skill', 'install', '--directory', directory])).stdout);
  assert.equal(await readFile(join(installed.path, 'SKILL.md'), 'utf8'), skill);
  assert.equal(
    (await run(['api'])).stdout,
    await readFile(join(installed.path, 'references/api.md'), 'utf8'),
  );
  await assert.rejects(run(['auth', 'status']), /Not connected/);
  await assert.rejects(run(['auth', 'login', '--origin', 'http://example.com']), /HTTPS origin/);
  if (process.argv.includes('--api')) {
    const result = await exec(process.execPath, ['scripts/api-e2e.mjs'], {
      cwd: root,
      env: { ...process.env, PKMN_TEST_CLI: cli },
      timeout: 180_000,
    });
    process.stdout.write(result.stdout);
  }
  process.stdout.write(
    `PASS: ${metadata.name}@${metadata.version}, ${packed.files.length} files, ${(packed.size / 1024).toFixed(1)} KiB packed; standalone executable, bundled docs, safe skill installation.\n`,
  );
} finally {
  await rm(temporary, { force: true, recursive: true });
}
