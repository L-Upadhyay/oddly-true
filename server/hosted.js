import { GameError, GameStore } from './game.js';

const ROOM_TTL = 4 * 60 * 60 * 1000;
export const encodeRoom = room => JSON.stringify(room, (key, value) =>
  key === 'timer' ? null : value instanceof Map ? { $map: [...value] } : value);
export const decodeRoom = json => JSON.parse(json, (key, value) =>
  value && Array.isArray(value.$map) ? new Map(value.$map) : value);

// Each request starts from durable room state. A revision check makes simultaneous
// answers/joins atomic, even when requests run on different servers.
export class HostedGame {
  constructor(db) { this.db = db; }

  async create(input) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const game = new GameStore({ scheduleTimers: false });
      const seat = game.create(input);
      const room = game.room(seat.code);
      const result = await this.db.prepare('INSERT OR IGNORE INTO rooms (code, state, revision, expires_at) VALUES (?, ?, 0, ?)')
        .bind(room.code, encodeRoom(room), Date.now() + ROOM_TTL).run();
      if (result.meta.changes) return seat;
    }
    throw new GameError('Could not make a room. Please try again.', 503);
  }

  async execute(code, token, action, body = {}) {
    code = code.toUpperCase();
    for (let attempt = 0; attempt < 12; attempt++) {
      const row = await this.db.prepare('SELECT state, revision FROM rooms WHERE code = ? AND expires_at > ?')
        .bind(code, Date.now()).first();
      if (!row) throw new GameError('Room not found or expired. Create a new room.', 404);
      const room = decodeRoom(row.state);
      let changed = false;
      const game = new GameStore({ scheduleTimers: false, onChange: () => { changed = true; } });
      game.rooms.set(code, room);
      const player = action === 'join' ? null : game.authenticate(code, token).player;
      // Absolute deadlines survive refreshes and deployments; score only once.
      if (room.phase === 'question' && room.deadline <= Date.now()) {
        const questionDeadline = room.deadline;
        game.showVotes(room);
        if (room.phase === 'votes') room.deadline = questionDeadline + game.voteMs;
      }
      if (room.phase === 'votes' && room.deadline <= Date.now()) game.reveal(room);
      let response;
      switch (action) {
        case 'join': response = game.join(code, body); break;
        case 'state': break;
        case 'settings': game.setSettings(code, token, body); break;
        case 'swap': game.swapTeams(code, token, body.firstId, body.secondId); break;
        case 'start': game.start(code, token); break;
        case 'answer': game.answer(code, token, body); break;
        case 'advance': game.advance(code, token); break;
        case 'finish': game.finish(code, token); break;
        case 'extend': game.extend(code, token); break;
        case 'react': game.react(code, token, body.emoji); break;
        case 'leave': game.leave(code, token); response = { left: true }; break;
        default: throw new GameError('Action not found.', 404);
      }
      if (changed) {
        const result = game.rooms.has(code)
          ? await this.db.prepare('UPDATE rooms SET state = ?, revision = revision + 1, expires_at = ? WHERE code = ? AND revision = ?')
            .bind(encodeRoom(room), Date.now() + ROOM_TTL, code, row.revision).run()
          : await this.db.prepare('DELETE FROM rooms WHERE code = ? AND revision = ?').bind(code, row.revision).run();
        if (!result.meta.changes) continue;
      }
      return response ?? { ...game.snapshot(room, player.id), revision: row.revision + (changed ? 1 : 0) };
    }
    throw new GameError('The room is busy. Please try again.', 409);
  }

  async prune() {
    await this.db.prepare('DELETE FROM rooms WHERE expires_at <= ?').bind(Date.now()).run();
  }
}
