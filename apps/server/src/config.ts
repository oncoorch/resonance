import { homedir } from 'node:os';
import path from 'node:path';


export interface ServerConfig {
  host: '127.0.0.1'; port: number; dbPath: string; nodeEnv: string;
  allowedOrigins: string[]; allowedHosts: string[];
  allowPathInputForTests: boolean;
}

export function resolveServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const parsedPort = Number(env.PORT ?? 4888); const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 4888;
  const host = '127.0.0.1' as const;
  return {
    host, port, nodeEnv: env.NODE_ENV ?? 'development',
    dbPath: env.MLO_DB_PATH ?? path.join(homedir(), 'Library', 'Application Support', 'MusicLibraryOrganizer', 'catalog.db'),

    allowedOrigins: (env.MLO_ALLOWED_ORIGINS ?? `http://${host}:4173,http://${host}:5173,http://${host}:${port},http://resonance.local:${port}`).split(',').map((value) => value.trim()).filter(Boolean),
    allowedHosts: [`${host}:${port}`, `localhost:${port}`, `resonance.local:${port}`],
    allowPathInputForTests: env.NODE_ENV === 'test' && env.ALLOW_PATH_INPUT_FOR_TESTS === '1',
  };
}
