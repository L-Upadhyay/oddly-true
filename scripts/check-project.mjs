import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : /\.(mjs|js)$/.test(path) ? [path] : [];
  });
}
const source = ['server', 'shared', 'public', 'scripts', 'test'].flatMap(files).concat('launch.mjs');
for (const path of source) {
  const result = spawnSync(process.execPath, ['--check', path], { stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(1);
}
console.log('JavaScript syntax checked in ' + source.length + ' files.');
