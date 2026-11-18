import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import type { Plugin } from 'vite-plus';
import { remoteCardAssetBaseURL } from '../src/card-assets';
import { lookup } from '../src/lookup';

const types = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

export function localCardAssets(): Plugin {
  return {
    apply: 'serve',
    configureServer(server) {
      const root = resolve(server.config.root, '.cache/card-assets/files');
      server.middlewares.use(async (request, response, next) => {
        let path;
        try {
          path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
        } catch {
          next();
          return;
        }
        if (!/^\/(cards|set-logos|energy|social)\/.+\.(jpg|png|svg|webp)$/.test(path)) {
          next();
          return;
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          response.writeHead(405, { Allow: 'GET, HEAD' }).end();
          return;
        }
        const file = resolve(root, `.${path}`);
        if (!file.startsWith(root + sep)) {
          response.writeHead(404).end();
          return;
        }
        try {
          const info = await stat(file);
          if (!info.isFile()) {
            response.writeHead(404).end();
            return;
          }
          response.writeHead(200, {
            'Cache-Control': 'no-cache',
            'Content-Length': info.size,
            'Content-Type': lookup(types, extname(file)) ?? 'application/octet-stream',
          });
          if (request.method === 'HEAD') {
            response.end();
          } else {
            const stream = createReadStream(file);
            stream.on('error', () => response.destroy());
            response.on('close', () => stream.destroy());
            stream.pipe(response);
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            next(error);
            return;
          }
          // Fresh clones work without downloading the entire image library.
          response.writeHead(302, { Location: `${remoteCardAssetBaseURL}${path}` }).end();
        }
      });
    },
    enforce: 'pre',
    name: 'local-card-assets',
  };
}
