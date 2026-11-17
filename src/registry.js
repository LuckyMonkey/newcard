import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyRegistry } from './core.js';

export const defaultDataFile = path.resolve(process.env.NEWCARD_DATA_FILE || 'data/registry.json');

export async function loadRegistry(file = defaultDataFile) {
  try {
    const result = JSON.parse(await readFile(file, 'utf8'));
    if (result.version !== 1 || !Array.isArray(result.bindings) || !Array.isArray(result.objects)) {
      throw new Error('unsupported registry format');
    }
    return result;
  } catch (error) {
    if (error.code === 'ENOENT') return emptyRegistry();
    throw error;
  }
}

// Local-only demo persistence. No multi-process transactions or concurrency guarantee.
export async function saveRegistry(registry, file = defaultDataFile) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(registry, null, 2)}\n`, { mode: 0o600 });
    await rename(temp, file);
  } finally {
    await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
}
