import { build } from 'esbuild';
import { mkdir, rm, cp, copyFile, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await mkdir('dist/client/oddly-true', { recursive: true });
await mkdir('dist/client/assets', { recursive: true });
await copyFile('public/index.html', 'dist/client/oddly-true/index.html');
await cp('public/assets', 'dist/client/assets', { recursive: true });
for (const file of ['app.js', 'styles.css', 'theme.css']) await copyFile('public/' + file, 'dist/client/assets/' + file);
await copyFile('shared/music-loop.js', 'dist/client/assets/music-loop.js');
await copyFile('shared/avatar-feedback.js', 'dist/client/assets/avatar-feedback.js');
await copyFile('shared/personas.js', 'dist/client/assets/personas.js');
await build({ entryPoints: ['server/worker.js'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'neutral', external: ['node:crypto'], target: 'es2022' });
await writeFile('dist/server/wrangler.json', JSON.stringify({
  name: 'oddly-true', main: 'index.js', compatibility_date: '2026-09-01', compatibility_flags: ['nodejs_compat'],
  assets: { directory: '../client', binding: 'ASSETS', run_worker_first: true },
  d1_databases: [{ binding: 'DB', database_name: 'oddly-true', database_id: 'local', migrations_dir: '../../drizzle' }]
}, null, 2));
