import { execFile as nodeExecFile } from 'node:child_process';

const SCRIPT = 'POSIX path of (choose folder with prompt "Selecciona una carpeta para Music Library Organizer")';
type ExecFile = typeof nodeExecFile;

export function pickDirectoryMacOS(options: { execFile?: ExecFile } = {}): Promise<string> {
  const run = options.execFile ?? nodeExecFile;
  return new Promise((resolve, reject) => {
    run('/usr/bin/osascript', ['-e', SCRIPT], (error, stdout) => {
      if (error) { reject(error); return; }
      const selected = String(stdout).trim();
      if (!selected) { reject(Object.assign(new Error('No se seleccionó ninguna carpeta'), { code: 'CANCELLED' })); return; }
      resolve(selected);
    });
  });
}
