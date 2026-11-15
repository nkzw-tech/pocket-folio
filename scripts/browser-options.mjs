import { existsSync } from 'node:fs';
import process from 'node:process';

const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const browserOptions = {
  executablePath: process.env.CHROME_PATH ?? (existsSync(macChrome) ? macChrome : undefined),
};
