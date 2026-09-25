import { HostedGame } from './hosted.js';
import { GameError } from './game.js';

const json = (data, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});

async function input(request) {
  if (Number(request.headers.get('content-length')) > 16384) throw new GameError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16384) { await reader.cancel(); throw new GameError('Request is too large.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return size ? JSON.parse(new TextDecoder().decode(bytes)) : {}; }
  catch { throw new GameError('Invalid request.'); }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/' || url.pathname === '/oddly-true') return Response.redirect(url.origin + '/oddly-true/', 302);
      if (url.pathname === '/health') return json({ ok: true });
      if (url.pathname === '/api/config') return json({ transport: 'poll', interval: 900 });
      if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
      if (request.method === 'POST' && request.headers.get('origin') && request.headers.get('origin') !== url.origin) {
        return json({ error: 'Please use the game page to play.' }, 403);
      }
      const game = new HostedGame(env.DB);
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        const seat = await game.create(await input(request));
        ctx.waitUntil(game.prune());
        return json(seat, 201);
      }
      const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{5})\/(join|settings|swap|start|answer|advance|finish|leave|react|state)$/i);
      if (!match) return json({ error: 'Page not found.' }, 404);
      const [, code, action] = match;
      if (request.method !== (action === 'state' ? 'GET' : 'POST')) return json({ error: 'Method not allowed.' }, 405);
      const token = action === 'state' ? url.searchParams.get('token') : request.headers.get('x-player-token');
      return json(await game.execute(code, token, action, action === 'state' ? {} : await input(request)), action === 'join' ? 201 : 200);
    } catch (error) {
      if (!(error instanceof GameError)) console.error('Game request failed', error);
      return json({ error: error instanceof GameError ? error.message : 'The game is temporarily unavailable. Please try again.' }, error.status ?? 503);
    }
  }
};
