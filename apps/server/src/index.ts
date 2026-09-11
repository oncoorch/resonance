import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { buildApp } from './app.js';
import { resolveServerConfig } from './config.js';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';

const config = resolveServerConfig();
await mkdir(path.dirname(config.dbPath), { recursive: true, mode: 0o700 });
const app = await buildApp(config);
const webRoot = path.resolve('dist/web');
if (config.nodeEnv === 'production' && existsSync(path.join(webRoot, 'index.html'))) {
  await app.register(fastifyStatic, { root: webRoot, wildcard: false, setHeaders: (response, filePath) => { response.header('Cache-Control', path.basename(filePath) === 'index.html' ? 'no-store' : 'public, max-age=31536000, immutable'); } });
}
await app.listen({ host: config.host, port: config.port });
process.stdout.write(`Music Library Organizer: http://${config.host}:${config.port}/\n`);

const shutdown = async () => { await app.close(); process.exit(0); };
process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
