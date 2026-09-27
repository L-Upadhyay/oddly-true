import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HostedGame, decodeRoom, encodeRoom } from '../server/hosted.js';
import worker from '../server/worker.js';

const sqlite = await import('node:sqlite').catch(() => null);
function database() {
  const sql = new sqlite.DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../drizzle/0000_fat_cable.sql', import.meta.url), 'utf8'));
  return {
    sql,
    prepare(query) {
      let args = [];
      return {
        bind(...values) { args = values; return this; },
        async first() { return sql.prepare(query).get(...args) ?? null; },
        async run() { return { meta: { changes: Number(sql.prepare(query).run(...args).changes) } }; }
      };
    }
  };
}

test('hosted rooms preserve simultaneous joins and answers across server instances', { skip: !sqlite }, async () => {
  const db = database();
  try {
    const host = await new HostedGame(db).create({ name: 'Host', avatar: '🐦' });
    const guests = await Promise.all(Array.from({ length: 7 }, (_, i) => new HostedGame(db).execute(host.code, null, 'join', { name: 'Guest ' + i })));
    const act = (seat, action, body) => new HostedGame(db).execute(host.code, seat.token, action, body);
    await assert.rejects(new HostedGame(db).execute(host.code, null, 'join', { name: 'Ninth' }), /full/);
    await assert.rejects(act(guests[0], 'start'), /Only the host/);
    await act(host, 'settings', { roundMode: 'host' });
    await act(host, 'start');
    const room = decodeRoom(db.sql.prepare('SELECT state FROM rooms WHERE code = ?').get(host.code).state);
    const correct = room.rounds[0].correct;
    await Promise.all([host, ...guests].map(seat => act(seat, 'answer', { choice: correct })));
    let state = await act(host, 'state');
    assert.equal(state.answeredCount, 8);
    assert.equal(state.phase, 'votes');
    assert.equal(state.question.correct, undefined);
    const waiting = decodeRoom(db.sql.prepare('SELECT state FROM rooms WHERE code = ?').get(host.code).state);
    waiting.deadline = Date.now() - 1;
    db.sql.prepare('UPDATE rooms SET state = ? WHERE code = ?').run(encodeRoom(waiting), host.code);
    const reveals = await Promise.all([host, ...guests].map(seat => act(seat, 'state')));
    for (const reveal of reveals) {
      assert.equal(reveal.phase, 'reveal');
      assert.ok(reveal.players.every(player => player.score === 10 && !player.token));
    }
    state = await act(host, 'finish');
    assert.equal(state.phase, 'finished');
    assert.equal(state.finalResult.roundsPlayed, 1);
    assert.ok(state.finalResult.players.every(player => player.score === 10));
  } finally { db.sql.close(); }
});

test('hosted API authenticates seats, rejects foreign writes, and expires rooms', { skip: !sqlite }, async () => {
  const db = database();
  const jobs = [];
  const fetch = (path, options = {}) => worker.fetch(new Request('https://example.com' + path, options), { DB: db }, { waitUntil(job) { jobs.push(job); } });
  try {
    const response = await fetch('/api/rooms', { method: 'POST', body: JSON.stringify({ name: 'Host' }) });
    assert.equal(response.status, 201);
    const seat = await response.json();
    assert.equal((await fetch('/api/config').then(r => r.json())).transport, 'poll');
    assert.equal((await fetch('/api/rooms/' + seat.code + '/state?token=bad')).status, 403);
    const unauthorized = await fetch('/api/rooms/' + seat.code + '/start', { method: 'POST', headers: { origin: 'https://other.example', 'x-player-token': seat.token }, body: '{}' });
    assert.equal(unauthorized.status, 403);
    db.sql.prepare('UPDATE rooms SET expires_at = 0').run();
    assert.equal((await fetch('/api/rooms/' + seat.code + '/state?token=' + seat.token)).status, 404);
    await Promise.all(jobs);
    await new HostedGame(db).prune();
    assert.equal(db.sql.prepare('SELECT count(*) AS count FROM rooms').get().count, 0);
  } finally { db.sql.close(); }
});

test('hosted Solo extension persists its score and next question', { skip: !sqlite }, async () => {
  const db = database();
  try {
    const hosted = new HostedGame(db);
    const seat = await hosted.create({ name: 'Solo Fox', kind: 'solo', roundCount: 1 });
    const act = (action, body) => new HostedGame(db).execute(seat.code, seat.token, action, body);
    await act('start');
    const room = decodeRoom(db.sql.prepare('SELECT state FROM rooms WHERE code = ?').get(seat.code).state);
    const firstId = room.rounds[0].id;
    await act('answer', { choice: room.rounds[0].correct });
    const score = await act('advance');
    assert.equal(score.phase, 'finished');
    assert.ok(score.soloFactsAvailable >= 5);
    const continued = await act('extend-solo');
    assert.equal(continued.phase, 'question');
    assert.equal(continued.round, 2);
    assert.equal(continued.totalRounds, 6);
    assert.equal(continued.players[0].score, 10);
    assert.notEqual(continued.question.id, firstId);
    assert.equal((await act('state')).question.id, continued.question.id);
  } finally { db.sql.close(); }
});
