import { opendir, lstat } from 'node:fs/promises';
import path from 'node:path';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.alac', '.wav', '.aif', '.aiff', '.aifc', '.ogg', '.oga', '.opus']);
export interface ScannedFile { absolutePath: string; relativePath: string; size: number; mtimeMs: number; extension: string }
export interface ScanSummary { directories: number; entries: number; audioFiles: number; nonAudioFiles: number; audioBytes: number; totalBytes: number }
export interface ScanResult { files: ScannedFile[]; skippedLinks: number; errors: Array<{ path: string; message: string }>; summary: ScanSummary }

export async function scanAudioFiles(root: string): Promise<ScanResult> {
  const files: ScannedFile[] = []; const errors: ScanResult['errors'] = []; let skippedLinks = 0;
  const summary: ScanSummary = { directories: 0, entries: 0, audioFiles: 0, nonAudioFiles: 0, audioBytes: 0, totalBytes: 0 };
  const visit = async (directory: string): Promise<void> => {
    let handle; summary.directories += 1;
    try { handle = await opendir(directory); } catch (error) { errors.push({ path: directory, message: error instanceof Error ? error.message : String(error) }); return; }
    for await (const entry of handle) {
      const absolutePath = path.join(directory, entry.name);
      summary.entries += 1;
      try {
        const stat = await lstat(absolutePath);
        if (stat.isSymbolicLink()) { skippedLinks += 1; continue; }
        if (stat.isDirectory()) { await visit(absolutePath); continue; }
        const extension = path.extname(entry.name).toLowerCase();
        if (stat.isFile()) {
          summary.totalBytes += stat.size;
          if (AUDIO_EXTENSIONS.has(extension)) { summary.audioFiles += 1; summary.audioBytes += stat.size; files.push({ absolutePath, relativePath: path.relative(root, absolutePath).split(path.sep).join('/'), size: stat.size, mtimeMs: stat.mtimeMs, extension }); }
          else summary.nonAudioFiles += 1;
        }
      } catch (error) { errors.push({ path: absolutePath, message: error instanceof Error ? error.message : String(error) }); }
    }
  };
  await visit(root); files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { files, skippedLinks, errors, summary };
}
