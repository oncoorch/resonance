import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const exec = promisify(execFile);

type Check = { name: string; status: 'ok' | 'missing' | 'optional-missing'; detail?: string };
export async function diagnose(options: { env?: NodeJS.ProcessEnv; commandExists?: (name: string) => Promise<boolean> } = {}): Promise<{ ok: boolean; checks: Check[] }> {
  const env = options.env ?? process.env;
  const exists = options.commandExists ?? (async (name: string) => { try { await exec('/usr/bin/which', [name]); return true; } catch { return false; } });
  const checks: Check[] = [
    { name: 'Node >= 22', status: Number(process.versions.node.split('.')[0]) >= 22 ? 'ok' : 'missing', detail: process.versions.node },
    { name: 'macOS/Chrome', status: process.platform === 'darwin' ? 'ok' : 'optional-missing', detail: process.platform },
    { name: 'uv', status: await exists('uv') ? 'ok' : 'optional-missing', detail: 'solo para escritura opcional de tags' },
    { name: 'OpenAI', status: env.OPENAI_API_KEY ? 'ok' : 'optional-missing', detail: env.OPENAI_API_KEY ? 'configurada' : 'modo offline disponible' },
    { name: 'MusicBrainz contacto', status: env.MUSICBRAINZ_CONTACT ? 'ok' : 'optional-missing', detail: env.MUSICBRAINZ_CONTACT ? 'configurado' : 'proveedor desactivado' },
  ];
  return { ok: checks.every((check) => check.status !== 'missing'), checks };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  diagnose().then((report) => { console.log(JSON.stringify(report, null, 2)); process.exitCode = report.ok ? 0 : 1; });
}
