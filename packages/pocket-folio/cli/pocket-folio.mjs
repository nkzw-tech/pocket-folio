#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { installSkill, readSkill, readAPI } from './skill.mjs';
const packageInfo = JSON.parse(
  await readFile(new globalThis.URL('../package.json', import.meta.url), 'utf8'),
);
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  if (index >= 0 && (!argv[index + 1] || argv[index + 1].startsWith('--'))) {
    throw new Error(`Missing value for ${name}.`);
  }
  return index < 0 ? fallback : argv[index + 1];
};
const directory = process.env.PKMN_CONFIG_DIR ?? join(homedir(), '.config', 'pkmn');
const configPath = join(directory, 'config.json');
const service =
  'tech.nakazawa.pkmn.' + createHash('sha256').update(directory).digest('hex').slice(0, 16);
async function child(command, args, input) {
  return new Promise((resolve, reject) => {
    const process_ = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    process_.stdout.on('data', (chunk) => {
      output += chunk;
    });
    process_.stderr.resume();
    process_.on('error', () => reject(new Error('Secure credential storage is unavailable.')));
    process_.on('close', (code) =>
      code === 0
        ? resolve(output)
        : reject(
            new Error('Secure credential operation failed. Sign in again, or check your keychain.'),
          ),
    );
    process_.stdin.end(input);
  });
}
function origin(value) {
  const url = new globalThis.URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
  ) {
    throw new Error('Use an HTTPS origin, or HTTP localhost for development.');
  }
  return url.origin;
}
async function credential(action, target, value) {
  if (process.platform === 'darwin') {
    const source = join(import.meta.dirname, 'keychain.swift');
    const digest = createHash('sha256')
      .update(await readFile(source))
      .digest('hex')
      .slice(0, 12);
    const helper = join(directory, `keychain-${digest}`);
    try {
      await readFile(helper);
    } catch {
      await mkdir(directory, { mode: 0o700, recursive: true });
      await child('xcrun', ['swiftc', source, '-o', helper]);
    }
    return child(helper, [action, service, target], value);
  }
  if (process.platform === 'linux') {
    const args =
      action === 'set'
        ? ['store', '--label=Pokémon Binder API key']
        : action === 'get'
          ? ['lookup']
          : ['clear'];
    return child('secret-tool', [...args, 'service', service, 'origin', target], value);
  }
  throw new Error(
    'This CLI requires macOS Keychain or Linux Secret Service. It never saves plaintext keys.',
  );
}
async function hiddenKey() {
  if (argv.includes('--stdin')) {
    let value = '';
    for await (const chunk of process.stdin) {
      value += chunk;
      if (value.length > 512) {
        throw new Error('Invalid key.');
      }
    }
    return value.trim();
  }
  if (!process.stdin.isTTY) {
    throw new Error('Use an interactive terminal, or --stdin with a secure pipe.');
  }
  process.stderr.write('API key (hidden): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', receive);
      process.stderr.write('\n');
    };
    const receive = (chunk) => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') {
          finish();
          reject(new Error('Cancelled.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          finish();
          resolve(value.trim());
          return;
        }
        if (character === '\u007f') {
          value = value.slice(0, -1);
        } else if (value.length < 512) {
          value += character;
        }
      }
    };
    process.stdin.on('data', receive);
  });
}
async function call(target, key, path, body) {
  const response = await globalThis.fetch(`${target}/api/v1/${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    method: body ? 'POST' : 'GET',
    redirect: 'error',
    signal: globalThis.AbortSignal.timeout(30_000),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${response.status}: ${data.error ?? 'Request failed'}`);
  }
  return data;
}
const print = (data) => process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
try {
  if (!argv.length || argv.includes('--help')) {
    process.stdout.write(
      `pocket-folio auth login [--origin https://folio.nakazawa.tech] [--stdin]\npocket-folio auth status | logout\npocket-folio catalog search QUERY [--set SET] [--language LANG] [--offset N]\npocket-folio collection\npocket-folio changes preview COMMANDS.json --out PLAN.json\npocket-folio changes apply PLAN.json\npocket-folio skill install --agent codex|claude [--replace]\npocket-folio skill install --directory PATH [--replace]\npocket-folio skill show\npocket-folio api\npocket-folio --version\n\nCommands are an array of collection mutations. Preview writes a plan with stable IDs;\napply sends that exact plan. Retry the same plan after a network failure.\nAPI keys are stored in the OS credential store, never in this config directory.\n`,
    );
  } else if (argv[0] === '--version') {
    process.stdout.write(`${packageInfo.version}\n`);
  } else if (argv[0] === 'skill' && argv[1] === 'show') {
    process.stdout.write(await readSkill());
  } else if (argv[0] === 'api') {
    process.stdout.write(await readAPI());
  } else if (argv[0] === 'skill' && argv[1] === 'install') {
    print(
      await installSkill({
        agent: option('--agent'),
        directory: option('--directory'),
        replace: argv.includes('--replace'),
      }),
    );
  } else if (argv[0] === 'auth' && argv[1] === 'login') {
    const target = origin(option('--origin', 'https://folio.nakazawa.tech'));
    const key = await hiddenKey();
    if (!/^pkmn_[A-Za-z0-9_-]+$/.test(key)) {
      throw new Error('Invalid key format.');
    }
    await call(target, key, 'collection');
    await credential('set', target, key);
    await mkdir(directory, { mode: 0o700, recursive: true });
    await writeFile(configPath, JSON.stringify({ origin: target }), { mode: 0o600 });
    print({ connected: target });
  } else {
    const configuration = JSON.parse(
      await readFile(configPath, 'utf8').catch(() => {
        throw new Error('Not connected. Run pocket-folio auth login in your terminal.');
      }),
    );
    const target = origin(configuration.origin);
    if (argv[0] === 'auth' && argv[1] === 'logout') {
      await credential('delete', target);
      print({ signedOut: target });
    } else {
      const key = (await credential('get', target)).trim();
      if (argv[0] === 'collection' || (argv[0] === 'auth' && argv[1] === 'status')) {
        const state = await call(target, key, 'collection');
        print(
          argv[0] === 'collection'
            ? state
            : { accountId: state.accountId, keyId: state.keyId, origin: target },
        );
      } else if (argv[0] === 'catalog' && argv[1] === 'search') {
        const params = new globalThis.URLSearchParams({
          offset: option('--offset', '0'),
          q: argv[2] ?? '',
        });
        for (const name of ['set', 'language']) {
          const value = option(`--${name}`);
          if (value) {
            params.set(name, value);
          }
        }
        print(await call(target, key, `catalog?${params}`));
      } else if (argv[0] === 'changes' && argv[1] === 'preview') {
        const commands = JSON.parse(await readFile(argv[2], 'utf8'));
        if (!Array.isArray(commands) || !commands.length) {
          throw new Error('Expected a nonempty command array.');
        }
        const out = option('--out');
        if (!out) {
          throw new Error('Choose a plan file with --out.');
        }
        const state = await call(target, key, 'collection');
        const operations = commands.map((command) => ({ command, id: randomUUID() }));
        const preview = await call(target, key, 'changes', {
          dryRun: true,
          expectedRevision: state.revision,
          operations,
        });
        const plan = {
          accountId: state.accountId,
          expectedRevision: preview.revision,
          keyId: state.keyId,
          operations,
          origin: target,
        };
        await writeFile(out, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        print({ plan: out, ...preview });
      } else if (argv[0] === 'changes' && argv[1] === 'apply') {
        const plan = JSON.parse(await readFile(argv[2], 'utf8'));
        const state = await call(target, key, 'collection');
        if (
          plan.origin !== target ||
          plan.accountId !== state.accountId ||
          plan.keyId !== state.keyId
        ) {
          throw new Error('Plan belongs to another origin, account or key. Preview again.');
        }
        print(
          await call(target, key, 'changes', {
            expectedRevision: plan.expectedRevision,
            operations: plan.operations,
          }),
        );
      } else {
        throw new Error('Unknown command. Run pocket-folio --help.');
      }
    }
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : 'Request failed'}\n`);
  process.exitCode = 1;
}
