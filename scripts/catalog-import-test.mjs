import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const directory = await mkdtemp(join(tmpdir(), 'folio-catalog-import-'));
const config = join(directory, 'wrangler.json');
const wrangler = fileURLToPath(
  new URL('./bin/wrangler.js', import.meta.resolve('wrangler/package.json')),
);
const sqlPath = join(root, '.void/catalog.sql');
const sql = await readFile(sqlPath, 'utf8');
const expectedCards = [...sql.matchAll(/^INSERT INTO catalog_card /gm)].length;
const expectedPrintings = [...sql.matchAll(/^INSERT INTO printing /gm)].length;
assert(expectedCards > 0 && expectedPrintings >= expectedCards);

function execute(args, capture = false) {
  const output = execFileSync(
    process.execPath,
    [
      wrangler,
      'd1',
      'execute',
      'DB',
      '--config',
      config,
      '--local',
      '--persist-to',
      join(directory, 'data'),
      ...args,
    ],
    {
      cwd: directory,
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
      stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'],
      timeout: 300_000,
    },
  );
  return capture ? JSON.parse(output.toString()).flatMap(({ results }) => results) : undefined;
}

try {
  await writeFile(
    config,
    JSON.stringify({
      compatibility_date: '2026-11-01',
      d1_databases: [
        {
          binding: 'DB',
          database_id: '00000000-0000-0000-0000-000000000001',
          database_name: 'catalog-import-test',
        },
      ],
      name: 'catalog-import-test',
    }),
  );
  const migrations = (await readdir(join(root, 'db/migrations')))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  const schema = await Promise.all(
    migrations.map((name) => readFile(join(root, 'db/migrations', name), 'utf8')),
  );
  const schemaPath = join(directory, 'schema.sql');
  await writeFile(schemaPath, schema.join('\n'));
  execute(['--file', schemaPath]);
  execute([
    '--command',
    `INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt) VALUES ('test','Test','catalog@example.com',1,0,0);
    INSERT INTO binder (userId,id,position,name,columns,rows,doubleSided,coverSetConfigured,slotCount,revision) VALUES ('test','binder',0,'Keep me',3,3,0,0,9,1);`,
  ]);

  // Exercise the full file twice: large imports must work and retries must preserve private data.
  execute(['--file', sqlPath]);
  const [before] = execute(
    [
      '--command',
      'SELECT (SELECT count(*) FROM catalog_card) AS cards, (SELECT count(*) FROM printing) AS printings;',
      '--json',
    ],
    true,
  );
  assert.deepEqual(before, { cards: expectedCards, printings: expectedPrintings });
  execute([
    '--command',
    "INSERT INTO card_ownership (userId,printingId,status,revision) SELECT 'test',id,'owned',1 FROM printing LIMIT 1;",
  ]);
  execute(['--file', sqlPath]);
  const [after] = execute(
    [
      '--command',
      `SELECT (SELECT count(*) FROM catalog_card) AS cards, (SELECT count(*) FROM printing) AS printings,
    (SELECT name FROM binder WHERE id='binder') AS binder,
    (SELECT status FROM card_ownership WHERE userId='test') AS status;`,
      '--json',
    ],
    true,
  );
  assert.deepEqual(after, {
    binder: 'Keep me',
    cards: expectedCards,
    printings: expectedPrintings,
    status: 'owned',
  });
  process.stdout.write(
    `PASS: ${Buffer.byteLength(sql)}-byte catalog file imported twice; ${expectedCards} cards, ${expectedPrintings} printings; binder and ownership preserved.\n`,
  );
} finally {
  await rm(directory, { force: true, recursive: true });
}
