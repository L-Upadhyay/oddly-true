import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { GameError, GameStore } from './game.js';
import { CHARACTERS } from '../shared/personas.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const sharedDir = fileURLToPath(new URL('../shared/', import.meta.url));
const characterDir = fileURLToPath(new URL('../public/assets/characters/', import.meta.url));
const streams = new Map();
const game = new GameStore({ onChange: broadcast });
const assets = new Map([
  ['/oddly-true/', ['index.html', 'text/html; charset=utf-8']],
  ['/assets/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/assets/theme.css', ['theme.css', 'text/css; charset=utf-8']],
  ['/assets/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/assets/music-loop.js', ['music-loop.js', 'text/javascript; charset=utf-8', sharedDir]],
  ['/assets/audio/intro-start-game-loop.mp3', ['assets/audio/intro-start-game-loop.mp3', 'audio/mpeg']],
  ['/assets/personas.js', ['personas.js', 'text/javascript; charset=utf-8', sharedDir]],
  ['/assets/sea-otter.jpg', ['assets/sea-otter.jpg', 'image/jpeg']],
  ['/assets/octopus.jpg', ['assets/octopus.jpg', 'image/jpeg']],
  ['/assets/seahorse.jpg', ['assets/seahorse.jpg', 'image/jpeg']],
  ['/assets/wombat.jpg', ['assets/wombat.jpg', 'image/jpeg']],
  ['/assets/venus.jpg', ['assets/venus.jpg', 'image/jpeg']],
  ['/assets/unicorn.jpg', ['assets/unicorn.jpg', 'image/jpeg']],
  ['/assets/frog.jpg', ['assets/frog.jpg', 'image/jpeg']],
  ['/assets/jellyfish.jpg', ['assets/jellyfish.jpg', 'image/jpeg']],
  ['/assets/titan.jpg', ['assets/titan.jpg', 'image/jpeg']],
  ['/assets/blood-falls.jpg', ['assets/blood-falls.jpg', 'image/jpeg']]
]);
for (const character of CHARACTERS) {
  assets.set(character.art, [`${character.asset}.svg`, 'image/svg+xml; charset=utf-8', characterDir]);
}
assets.set('/assets/characters/LICENSE.txt', ['LICENSE.txt', 'text/plain; charset=utf-8', characterDir]);

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 16_384) throw new GameError('Request is too large.', 413);
  }
  try { return body ? JSON.parse(body) : {}; }
  catch { throw new GameError('Invalid request.'); }
}

function broadcast(room) {
  const listeners = streams.get(room.code);
  if (!listeners) return;
  for (const [playerId, connections] of listeners) {
    if (!room.players.some(player => player.id === playerId)) {
      for (const response of connections) {
        response.write('event: seat-left\ndata: {}\n\n');
        response.end();
      }
      listeners.delete(playerId);
      continue;
    }
    const data = `data: ${JSON.stringify(game.snapshot(room, playerId))}\n\n`;
    for (const response of connections) response.write(data);
  }
}

function events(req, res, room, player) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(`retry: 1500\ndata: ${JSON.stringify(game.snapshot(room, player.id))}\n\n`);
  if (!streams.has(room.code)) streams.set(room.code, new Map());
  const listeners = streams.get(room.code);
  if (!listeners.has(player.id)) listeners.set(player.id, new Set());
  listeners.get(player.id).add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    listeners.get(player.id)?.delete(res);
    if (listeners.get(player.id)?.size === 0) listeners.delete(player.id);
    if (listeners.size === 0) streams.delete(room.code);
  });
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/oddly-true')) {
    res.writeHead(302, { Location: '/oddly-true/' });
    res.end();
    return;
  }
  if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
  if (req.method === 'GET' && url.pathname === '/api/config') return json(res, 200, { transport: 'events' });
  if (req.method === 'GET' && assets.has(url.pathname)) {
    const [filename, type, directory = publicDir] = assets.get(url.pathname);
    const content = await readFile(join(directory, filename));
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(content);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/rooms') {
    return json(res, 201, game.create(await readJson(req)));
  }

  const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{5})\/(join|settings|start|answer|advance|finish|extend|leave|react|state|events)$/i);
  if (!match) return json(res, 404, { error: 'Page not found.' });
  const [, code, action] = match;
  if (req.method === 'POST' && action === 'join') return json(res, 201, game.join(code, await readJson(req)));

  const token = action === 'events' || action === 'state'
    ? url.searchParams.get('token') : req.headers['x-player-token'];
  const { room, player } = game.authenticate(code, token);

  if (req.method === 'GET' && action === 'events') return events(req, res, room, player);
  if (req.method === 'GET' && action === 'state') return json(res, 200, game.snapshot(room, player.id));
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });

  switch (action) {
    case 'settings': game.setSettings(code, token, await readJson(req)); break;
    case 'start': game.start(code, token); break;
    case 'answer': game.answer(code, token, await readJson(req)); break;
    case 'advance': game.advance(code, token); break;
    case 'finish': game.finish(code, token); break;
    case 'extend': game.extend(code, token); break;
    case 'leave': game.leave(code, token); return json(res, 200, { left: true });
    case 'react': game.react(code, token, (await readJson(req)).emoji); break;
    default: return json(res, 405, { error: 'Method not allowed.' });
  }
  return json(res, 200, game.snapshot(room, player.id));
}

const server = createServer((req, res) => {
  route(req, res).catch(error => {
    if (res.headersSent) return res.end();
    if (!(error instanceof GameError)) console.error(error);
    json(res, error.status ?? 500, { error: error instanceof GameError ? error.message : 'Something went wrong.' });
  });
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => {
  const listeningPort = server.address().port;
  console.log(`Oddly True running at http://localhost:${listeningPort}/oddly-true/`);
  if (host === '0.0.0.0') {
    try {
      const addresses = Object.values(networkInterfaces()).flat().filter(address =>
        address?.family === 'IPv4' && !address.internal
      );
      for (const address of addresses) {
        console.log(`For another device on this network: http://${address.address}:${listeningPort}/oddly-true/`);
      }
    } catch {
      console.log('For another device, use this computer’s LAN IP address in place of localhost.');
    }
  }
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE') console.error(`Port ${port} is already in use. Stop the other server or choose another PORT.`);
  else console.error(error);
  process.exit(1);
});

const cleanup = setInterval(() => game.prune(), 60 * 60 * 1000);
cleanup.unref();
