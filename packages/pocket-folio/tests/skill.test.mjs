import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { installSkill, readAPI, readSkill } from '../cli/skill.mjs';

test('installs a self-contained skill, preserves edits, and backs up explicit replacements', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pocket-folio-skill-'));
  try {
    const directory = join(root, 'skills');
    const installed = await installSkill({ directory });
    assert.equal(installed.status, 'installed');
    assert.equal(await readFile(join(installed.path, 'SKILL.md'), 'utf8'), await readSkill());
    assert.equal(
      await readFile(join(installed.path, 'references/api.md'), 'utf8'),
      await readAPI(),
    );
    assert.equal((await installSkill({ directory })).status, 'unchanged');
    await writeFile(join(installed.path, 'SKILL.md'), 'My custom skill');
    await writeFile(join(installed.path, 'custom.txt'), 'Keep this');
    await assert.rejects(installSkill({ directory }), /--replace/);
    assert.equal(await readFile(join(installed.path, 'SKILL.md'), 'utf8'), 'My custom skill');
    const replaced = await installSkill({ directory, replace: true });
    assert.equal(await readFile(join(replaced.backup, 'custom.txt'), 'utf8'), 'Keep this');
    assert.equal(await readFile(join(replaced.backup, 'SKILL.md'), 'utf8'), 'My custom skill');
    assert.equal(await readFile(join(installed.path, 'SKILL.md'), 'utf8'), await readSkill());
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test('requires an explicit destination and rejects conflicting or unknown agent options', async () => {
  await assert.rejects(installSkill({}), /Choose/);
  await assert.rejects(installSkill({ agent: 'unknown' }), /Choose/);
  await assert.rejects(installSkill({ agent: 'codex', directory: '/unused' }), /Choose/);
});

test('does not overwrite a symlink destination', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pocket-folio-symlink-'));
  try {
    const file = join(root, 'custom');
    await writeFile(file, 'Keep this');
    await symlink(file, join(root, 'pocket-folio'));
    await assert.rejects(installSkill({ directory: root, replace: true }), /symlink/);
    assert.equal(await readFile(file, 'utf8'), 'Keep this');
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
