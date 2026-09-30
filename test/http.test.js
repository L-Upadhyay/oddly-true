import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { QUESTIONS } from '../server/questions.js';

test('HTTP and live events connect separate players in one room', async t => {
  const server = spawn(process.execPath, ['server/index.js'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => server.kill());
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Server did not start.')), 5000);
    server.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/localhost:(\d+)\/oddly-true/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
    });
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Server exited before ready: ${code}`)));
  });
  const base = `http://127.0.0.1:${port}`;
  const music = await fetch(`${base}/assets/audio/intro-start-game-loop.mp3`);
  assert.equal(music.status, 200);
  assert.match(music.headers.get('content-type'), /audio\/mpeg/);
  assert.equal((await music.arrayBuffer()).byteLength, 600188);
  const loopModule = await fetch(`${base}/assets/music-loop.js`);
  assert.equal(loopModule.status, 200);
  assert.match(await loopModule.text(), /export function makeMusicLoop/);
  for (const question of QUESTIONS) {
    const image = await fetch(`${base}${question.image.path}`);
    assert.equal(image.status, 200, `Image unavailable: ${question.id}`);
    assert.match(image.headers.get('content-type'), /image\/jpeg/);
    const expected = await readFile(new URL(`../public${question.image.path}`, import.meta.url));
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), expected, `Wrong image bytes: ${question.id}`);
  }
  for (const path of ['/assets/questions/not-a-question.jpg', '/server/questions.js']) {
    assert.equal((await fetch(`${base}${path}`)).status, 404);
  }
  const post = async (path, body, seat) => {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(seat ? { 'x-player-token': seat.token } : {}) },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    assert.equal(response.ok, true, `${path}: ${JSON.stringify(result)}`);
    return result;
  };
  const getState = async seat => {
    const response = await fetch(`${base}/api/rooms/${seat.code}/state?token=${seat.token}`);
    assert.equal(response.ok, true);
    return response.json();
  };

  const host = await post('/api/rooms', { name: 'Host', avatar: '🐦' });
  const guests = await Promise.all(['Guest One', 'Guest Two', 'Guest Three'].map(name =>
    post(`/api/rooms/${host.code}/join`, { name })
  ));
  await post(`/api/rooms/${host.code}/settings`, { roundMode: 'host' }, host);
  const lobby = await getState(guests[0]);
  assert.equal(lobby.players.length, 4);
  const nextHostId = lobby.players.find(player => player.id !== host.playerId).id;
  await post(`/api/rooms/${host.code}/start`, {}, host);

  const controller = new AbortController();
  t.after(() => controller.abort());
  const feed = await fetch(`${base}/api/rooms/${host.code}/events?token=${guests[0].token}`, {
    signal: controller.signal
  });
  assert.match(feed.headers.get('content-type'), /text\/event-stream/);
  const reader = feed.body.getReader();
  for (const seat of [host, ...guests]) await post(`/api/rooms/${host.code}/answer`, { choice: 0 }, seat);
  let events = '';
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    while (!events.includes('"phase":"votes"')) {
      const { value, done } = await reader.read();
      assert.equal(done, false, 'Live connection ended before vote update.');
      events += new TextDecoder().decode(value);
    }
  } finally {
    clearTimeout(timeout);
    await reader.cancel();
  }

  await new Promise(resolve => setTimeout(resolve, 4400));
  const reveal = await getState(guests[1]);
  assert.equal(reveal.phase, 'reveal');
  assert.equal(reveal.roundResult.leaderboard.length, 4);
  await post(`/api/rooms/${host.code}/react`, { emoji: '🤯' }, guests[1]);
  await post(`/api/rooms/${host.code}/finish`, {}, host);
  const final = await getState(guests[0]);
  assert.equal(final.finalResult.roundsPlayed, 1);
  assert.equal(final.finalResult.players.length, 4);
  await post(`/api/rooms/${host.code}/leave`, {}, host);
  const transferred = await getState(guests[0]);
  assert.equal(transferred.hostId, nextHostId);
  assert.equal(transferred.finalResult.players.length, 4);
  const newcomer = await post(`/api/rooms/${host.code}/join`, { name: 'Newcomer' });
  assert.equal((await getState(newcomer)).phase, 'finished');
});
