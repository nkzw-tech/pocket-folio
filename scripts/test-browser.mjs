import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const base = 'http://127.0.0.1:5217';
const api = process.argv.includes('--api');
if (process.argv.slice(2).some((arg) => arg !== '--api')) {
  throw new Error('Usage: node scripts/test-browser.mjs [--api]');
}
let server;
let log;
const logPath = join(tmpdir(), `pocket-folio-test-server-${process.pid}.log`);
let active;

function stop() {
  active?.kill('SIGTERM');
  if (server?.pid && server.exitCode === null) {
    // The dev command has child processes. Stop only the group we started.
    try {
      process.kill(-server.pid, 'SIGTERM');
    } catch (error) {
      if (error.code !== 'ESRCH') {
        throw error;
      }
    }
  }
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    stop();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}
async function ready() {
  let response;
  try {
    response = await globalThis.fetch(`${base}/agent/SKILL.md`, {
      redirect: 'error',
      signal: globalThis.AbortSignal.timeout(2000),
    });
  } catch {
    return false;
  }
  if (!response.ok || !(await response.text()).includes('name: pocket-folio')) {
    throw new Error(`Another or unhealthy service is listening at ${base}.`);
  }
  return true;
}
async function run(file, args = []) {
  await new Promise((resolve_, reject) => {
    active = spawn(process.execPath, [file, ...args], {
      cwd: root,
      env: { ...process.env, BINDER_BASE_URL: base },
      stdio: 'inherit',
      timeout: api ? 240_000 : 60_000,
    });
    active.once('error', reject);
    active.once('exit', (code, signal) => {
      active = undefined;
      if (code === 0) {
        resolve_();
      } else {
        reject(new Error(`${file} failed (${signal ?? code}).`));
      }
    });
  });
}
try {
  if (!(await ready())) {
    // Dev output can include account recovery tokens. Keep it in a private log.
    log = await open(logPath, 'wx', 0o600);
    server = spawn('vp', ['-C', '.', 'dev'], {
      cwd: root,
      detached: true,
      stdio: ['ignore', log.fd, log.fd],
    });
    let startError;
    server.once('error', (error) => {
      startError = error;
    });
    let started = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (startError || server.exitCode !== null) {
        throw new Error(
          `Could not start the local app. Check ${logPath}. Run vpr dev:setup if this checkout is new.`,
        );
      }
      if (await ready()) {
        started = true;
        break;
      }
      await setTimeout(500);
    }
    if (!started) {
      throw new Error(`Local app did not become ready. Check ${logPath}.`);
    }
  }
  const started = globalThis.performance.now();
  if (api) {
    await run('scripts/agent-package-test.mjs', ['--api']);
  } else {
    await run('scripts/browser-smoke.mjs');
  }
  process.stdout.write(
    `\n${api ? 'API integration' : 'Browser smoke'} passed in ${((globalThis.performance.now() - started) / 1000).toFixed(1)}s.\n`,
  );
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
} finally {
  stop();
  await log?.close();
}
