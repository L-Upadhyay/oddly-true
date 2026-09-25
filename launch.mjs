import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || '3000';
const url = `http://localhost:${port}/oddly-true/`;
const server = spawn(process.execPath, [join(directory, 'server/index.js')], {
  cwd: directory,
  env: process.env,
  stdio: ['inherit', 'pipe', 'inherit']
});

let opened = false;
server.stdout.on('data', data => {
  const output = data.toString();
  process.stdout.write(output);
  if (opened || !output.includes('Oddly True running at') || process.env.ODDLY_TRUE_NO_OPEN === '1') return;
  opened = true;
  try {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const browser = spawn(command, args, { stdio: 'ignore', detached: true });
    browser.on('error', () => console.log(`Open ${url} in your browser.`));
    browser.unref();
  } catch {
    console.log(`Open ${url} in your browser.`);
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('exit', code => process.exit(code ?? 0));
