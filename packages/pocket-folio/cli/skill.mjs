import { randomUUID } from 'node:crypto';
import { mkdir, readFile, lstat, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const source = new globalThis.URL('../skills/pocket-folio/', import.meta.url);
const files = ['SKILL.md', 'references/api.md'];
export const readSkill = () => readFile(new globalThis.URL('SKILL.md', source), 'utf8');
export const readAPI = () => readFile(new globalThis.URL('references/api.md', source), 'utf8');

export async function installSkill({ agent, directory, replace = false }) {
  if (Boolean(agent) === Boolean(directory) || (agent && !['codex', 'claude'].includes(agent))) {
    throw new Error('Choose --agent codex, --agent claude, or --directory PATH.');
  }
  const parent = directory
    ? resolve(directory)
    : join(homedir(), agent === 'codex' ? '.agents' : '.claude', 'skills');
  const target = join(parent, 'pocket-folio');
  const contents = await Promise.all(
    files.map((file) => readFile(new globalThis.URL(file, source), 'utf8')),
  );
  const existing = await lstat(target).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return null;
  });
  let backup;
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink()) {
      throw new Error('The skill destination must be a directory, not a file or symlink.');
    }
    const current = await Promise.all(
      files.map((file) => readFile(join(target, file), 'utf8').catch(() => null)),
    );
    if (current.every((value, index) => value === contents[index])) {
      return { path: target, status: 'unchanged' };
    }
    if (!replace) {
      throw new Error(
        'A different skill is already installed. Use --replace to back it up and install this version.',
      );
    }
    // Keep backups outside the skills directory so agents do not load both versions.
    const backupRoot = join(parent, '..', 'pocket-folio-skill-backups');
    await mkdir(backupRoot, { recursive: true });
    backup = join(backupRoot, randomUUID());
    await rename(target, backup);
  }
  await mkdir(parent, { recursive: true });
  await mkdir(target);
  await mkdir(join(target, 'references'));
  for (const [index, file] of files.entries()) {
    await writeFile(join(target, file), contents[index], { flag: 'wx' });
  }
  const result = { path: target, status: 'installed' };
  if (backup) {
    result.backup = backup;
  }
  return result;
}
