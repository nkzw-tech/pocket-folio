import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const cache = resolve(root, '.cache/card-assets/files');
const entries = {};
for (const directory of ['cards', 'set-logos', 'energy', 'social']) {
  for (const file of await readdir(resolve(cache, directory), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!file.isFile() || !/\.(jpg|png|svg|webp)$/.test(file.name)) {
      continue;
    }
    const path = resolve(file.parentPath, file.name);
    const bytes = await readFile(path);
    entries[relative(cache, path).split(sep).join('/')] = {
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }
}
await mkdir(resolve(root, 'assets'), { recursive: true });
await writeFile(
  resolve(root, 'assets/card-images.json'),
  JSON.stringify(
    Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))),
    null,
    2,
  ) + '\n',
);
process.stdout.write(`Recorded ${Object.keys(entries).length} cached image checksums.\n`);
