import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { GameError, GameStore, MAX_PLAYERS, MAX_ROUNDS } from '../server/game.js';
import { QUESTIONS } from '../server/questions.js';
import {
  PERSONAS,
  CUSTOM_CHARACTERS,
  CHARACTERS,
  AVATARS,
  customCharacterForName,
  personaForAvatar
} from '../shared/personas.js';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('Solo plays five facts without a guest or vote wait, then replays; friends still require two', () => {
  const game = new GameStore({ scheduleTimers: false });
  const solo = game.create({ name: 'Solo Fox', avatar: '🦊', kind: 'solo' });
  const room = game.room(solo.code);
  assert.equal(game.snapshot(room, solo.playerId).kind, 'solo');
  assert.equal(game.snapshot(room, solo.playerId).totalRounds, 5);
  assert.throws(() => game.join(solo.code, { name: 'Guest' }), /Solo game/);
  assert.throws(() => game.setSettings(solo.code, solo.token, { playMode: 'teams' }), /five rounds/);
  game.start(solo.code, solo.token);
  for (let index = 0; index < 5; index++) {
    const correct = room.rounds[index].correct;
    const pick = index === 0 ? (correct + 1) % 3 : correct;
    game.answer(solo.code, solo.token, { choice: pick });
    const result = game.snapshot(room, solo.playerId);
    assert.equal(result.phase, 'reveal');
    assert.equal(result.question.correct, correct);
    assert.equal(result.round, index + 1);
    game.advance(solo.code, solo.token);
  }
  const final = game.snapshot(room, solo.playerId);
  assert.equal(final.phase, 'finished');
  assert.equal(final.finalResult.players[0].score, 40);
  assert.equal(final.finalResult.roundsPlayed, 5);
  game.start(solo.code, solo.token);
  assert.equal(game.snapshot(room, solo.playerId).phase, 'question');

  const friends = game.create({ name: 'Host' });
  assert.equal(game.snapshot(game.room(friends.code), friends.playerId).kind, 'friends');
  assert.throws(() => game.start(friends.code, friends.token), /at least 2 players/);
});

test('Solo can leave mid-game without leaving an active room behind', () => {
  const game = new GameStore({ scheduleTimers: false });
  const solo = game.create({ name: 'Solo Fox', kind: 'solo' });
  game.start(solo.code, solo.token);
  game.leave(solo.code, solo.token);
  assert.throws(() => game.room(solo.code), /Room not found/);

  const host = game.create({ name: 'Host' });
  const guest = game.join(host.code, { name: 'Guest' });
  game.start(host.code, host.token);
  assert.throws(() => game.leave(host.code, guest.token), /Leave between games/);
});

test('two players join, answer, see votes before truth, and score a Wild Card', async () => {
  const game = new GameStore({ roundMs: 1000, voteMs: 10 });
  const host = game.create({ name: 'Professor Pigeon', avatar: '🐧' });
  const guest = game.join(host.code, { name: 'Ghost', avatar: '👻' });
  game.start(host.code, host.token);
  const room = game.room(host.code);
  const answer = room.rounds[0].correct;
  const wrong = (answer + 1) % 3;
  const before = game.snapshot(room, host.playerId);
  assert.equal(before.question.correct, undefined);
  assert.equal(before.question.image, undefined);
  assert.equal(before.phase, 'question');
  game.answer(host.code, host.token, { choice: answer, wildCard: true });
  assert.throws(() => game.answer(host.code, host.token, { choice: answer }), GameError);
  game.answer(host.code, guest.token, { choice: wrong });
  const votes = game.snapshot(room, guest.playerId);
  assert.equal(votes.phase, 'votes');
  assert.equal(votes.question.correct, undefined);
  assert.equal(votes.question.image, undefined);
  assert.deepEqual(votes.question.votes.reduce((total, count) => total + count, 0), 2);
  await wait(25);
  const reveal = game.snapshot(room, host.playerId);
  assert.equal(reveal.phase, 'reveal');
  assert.equal(reveal.question.correct, answer);
  assert.deepEqual(reveal.question.image ?? null, room.rounds[0].image ?? null);
  assert.deepEqual(reveal.roundResult.winners.map(player => player.id), [host.playerId]);
  assert.equal(reveal.roundResult.points, 20);
  assert.equal(room.players[0].score, 20);
  assert.equal(room.players[1].score, 0);
  assert.throws(() => game.advance(host.code, guest.token), /Only the host/);
  game.advance(host.code, host.token);
  assert.equal(game.snapshot(room, host.playerId).round, 2);
  assert.throws(() => game.answer(host.code, host.token, { choice: 0, wildCard: true }), /already used/);
  game.clearTimer(room);
});

test('preset and custom characters are unique, illustrated, and matched by name', () => {
  assert.equal(PERSONAS.length, 14);
  assert.equal(CUSTOM_CHARACTERS.length, 35);
  assert.equal(CHARACTERS.length, AVATARS.length);
  assert.equal(new Set(AVATARS).size, AVATARS.length);
  assert.equal(new Set(PERSONAS.map(persona => persona.name)).size, PERSONAS.length);
  const motions = new Set(['tilt', 'roar', 'hop', 'wiggle', 'float', 'scan', 'stomp', 'buzz', 'flutter', 'prance', 'waddle', 'pop']);
  for (const persona of PERSONAS) {
    assert.ok(persona.name);
    assert.ok(persona.greeting?.length, `${persona.name} needs a greeting`);
    assert.ok(motions.has(persona.motion), `${persona.name} needs a supported motion`);
  }
  for (const character of CHARACTERS) {
    assert.ok(character.label);
    assert.ok(existsSync(new URL(`../public${character.art}`, import.meta.url)), `${character.label} needs bundled art`);
  }
  assert.equal(personaForAvatar('🦖').name, 'Dinner Dino');
  assert.equal(personaForAvatar('🦋').name, 'Social Butterfly');
  assert.equal(personaForAvatar('🦄').name, 'Glitter Unicorn');
  assert.equal(personaForAvatar('🤖').name, 'Detective Robot');
  assert.equal(personaForAvatar('🐝').name, 'Buzzy Bee');
  assert.equal(personaForAvatar('🐧').name, 'Party Penguin');
  assert.equal(personaForAvatar('🍄'), undefined);
  assert.equal(customCharacterForName('Jellyfish Queen').label, 'Jellyfish');
  assert.equal(customCharacterForName('Seahorse Sam').label, 'Horse');
  assert.equal(customCharacterForName('Butterfly Boss').label, 'Butterfly');
  assert.equal(customCharacterForName('Trust').label, 'Dog');
  assert.equal(customCharacterForName('Sky').label, 'Pigeon');
  assert.equal(customCharacterForName('loyal friend').label, 'Dog');
  assert.equal(customCharacterForName('Sky Fox').label, 'Fox');
  assert.equal(customCharacterForName(' TRUST! ').label, 'Dog');
  assert.notEqual(customCharacterForName('Trust', 1).avatar, customCharacterForName('Trust').avatar);
  assert.equal(customCharacterForName('Polar Bear Professor').label, 'Polar Bear');
  assert.equal(customCharacterForName('Completely Original').avatar, customCharacterForName('Completely Original').avatar);
  assert.notEqual(customCharacterForName('Completely Original', 1).avatar, customCharacterForName('Completely Original').avatar);
});

test('host can choose the length, round winners can tie, and nobody can win a missed round', async () => {
  const game = new GameStore({ roundMs: 1000, voteMs: 2 });
  const host = game.create({ name: 'Doctor Pigeon', avatar: '🐦' });
  const guest = game.join(host.code, { name: 'Lucky Lion', avatar: '🦁' });
  assert.equal(game.snapshot(game.room(host.code), host.playerId).totalRounds, MAX_ROUNDS);
  assert.throws(() => game.setRoundCount(host.code, guest.token, 2), /Only the host/);
  assert.throws(() => game.setRoundCount(host.code, host.token, 0), /between 1 and/);
  assert.throws(() => game.setRoundCount(host.code, host.token, 11), /between 1 and/);
  assert.throws(() => game.setRoundCount(host.code, host.token, 2.5), /between 1 and/);
  game.setRoundCount(host.code, host.token, 2);
  game.start(host.code, host.token);
  const room = game.room(host.code);
  assert.equal(room.rounds.length, 2);
  assert.throws(() => game.setRoundCount(host.code, host.token, 3), /between games/);

  const correct = room.rounds[0].correct;
  game.answer(host.code, host.token, { choice: correct });
  game.answer(host.code, guest.token, { choice: correct });
  await wait(12);
  const tie = game.snapshot(room, host.playerId);
  assert.equal(tie.phase, 'reveal');
  assert.equal(tie.roundResult.points, 10);
  assert.deepEqual(new Set(tie.roundResult.winners.map(player => player.id)), new Set([host.playerId, guest.playerId]));
  game.advance(host.code, host.token);

  const wrong = (room.rounds[1].correct + 1) % 3;
  game.answer(host.code, host.token, { choice: wrong });
  game.answer(host.code, guest.token, { choice: wrong });
  await wait(12);
  assert.deepEqual(game.snapshot(room, guest.playerId).roundResult.winners, []);
  assert.equal(game.snapshot(room, guest.playerId).roundResult.points, 0);
  game.advance(host.code, host.token);
  assert.equal(room.phase, 'finished');
  assert.equal(game.snapshot(room, guest.playerId).totalRounds, 2);
  assert.deepEqual(room.players.map(player => player.score), [10, 10]);

  game.setRoundCount(host.code, host.token, 1);
  assert.equal(game.snapshot(room, host.playerId).totalRounds, 2);
  assert.equal(game.snapshot(room, host.playerId).selectedRounds, 1);
  game.start(host.code, host.token);
  assert.equal(room.rounds.length, 1);
  game.clearTimer(room);
});

test('every live question has a source and bundled credited image', () => {
  assert.ok(QUESTIONS.length > MAX_ROUNDS);
  assert.equal(new Set(QUESTIONS.map(question => question.id)).size, QUESTIONS.length);
  for (const question of QUESTIONS) {
    assert.ok(question.source.url.startsWith('https://'), `${question.id}: source`);
    assert.equal(question.choices.length, 3, `${question.id}: choices`);
    assert.ok([0, 1, 2].includes(question.correct), `${question.id}: answer`);
    assert.ok(question.image?.credit && question.image.creditUrl && question.image.license && question.image.licenseUrl, `${question.id}: image credit`);
    assert.ok(existsSync(new URL(`../public${question.image.path}`, import.meta.url)), `${question.id}: image file`);
  }
});

test('a missed Wild Card costs five points and the game finishes after ten rounds', async () => {
  const game = new GameStore({ roundMs: 1000, voteMs: 1 });
  const host = game.create({ name: 'Fox' });
  const guest = game.join(host.code, { name: 'Frog' });
  game.start(host.code, host.token);
  const room = game.room(host.code);
  for (let round = 0; round < 10; round++) {
    const correct = room.rounds[round].correct;
    game.answer(host.code, host.token, { choice: (correct + 1) % 3, wildCard: round === 0 });
    game.answer(host.code, guest.token, { choice: correct });
    await wait(10);
    assert.equal(room.phase, 'reveal');
    game.advance(host.code, host.token);
  }
  assert.equal(room.phase, 'finished');
  assert.equal(room.players[0].score, -5);
  assert.equal(room.players[1].score, 100);
  assert.equal(game.snapshot(room, guest.playerId).awards.loneGeniuses[0], guest.playerId);
});

test('rooms enforce player limit and reject joining after start', () => {
  const game = new GameStore();
  const host = game.create({ name: 'One' });
  for (let i = 1; i < MAX_PLAYERS; i++) game.join(host.code, { name: `Player ${i}` });
  assert.throws(() => game.join(host.code, { name: 'Too many' }), /full/);
  game.start(host.code, host.token);
  assert.throws(() => game.join(host.code, { name: 'Late' }), /already started/);
  game.clearTimer(game.room(host.code));
});

test('Host decides can finish after a reveal, and fixed games end at their chosen limit', () => {
  const game = new GameStore({ roundMs: 1000, voteMs: 1000 });
  const host = game.create({ name: 'Host' });
  const guest = game.join(host.code, { name: 'Guest' });
  game.setSettings(host.code, host.token, { roundMode: 'host' });
  game.start(host.code, host.token);
  const room = game.room(host.code);
  assert.equal(room.rounds.length, MAX_ROUNDS);
  assert.throws(() => game.finish(host.code, host.token), /after a reveal/);
  game.answer(host.code, host.token, { choice: room.rounds[0].correct });
  game.answer(host.code, guest.token, { choice: (room.rounds[0].correct + 1) % 3 });
  game.reveal(room);
  assert.throws(() => game.finish(host.code, guest.token), /Only the host/);
  game.finish(host.code, host.token);
  const done = game.snapshot(room, host.playerId);
  assert.equal(done.phase, 'finished');
  assert.equal(done.totalRounds, 1);
  assert.equal(done.finalResult.roundsPlayed, 1);

  game.setSettings(host.code, host.token, { roundMode: 'custom', roundCount: 2 });
  game.start(host.code, host.token);
  assert.equal(room.rounds.length, 2);
  for (let index = 0; index < 2; index++) {
    game.answer(host.code, host.token, { choice: room.rounds[index].correct });
    game.answer(host.code, guest.token, { choice: room.rounds[index].correct });
    game.reveal(room);
    assert.throws(() => game.finish(host.code, host.token), /Host decides/);
    game.advance(host.code, host.token);
  }
  assert.equal(game.snapshot(room, guest.playerId).finalResult.roundsPlayed, 2);
});

test('teams stay balanced, score by average, and celebrate members even when personally wrong', () => {
  const game = new GameStore({ roundMs: 1000, voteMs: 1000 });
  const host = game.create({ name: 'A1' });
  const b1 = game.join(host.code, { name: 'B1' });
  const a2 = game.join(host.code, { name: 'A2' });
  const b2 = game.join(host.code, { name: 'B2' });
  game.setSettings(host.code, host.token, { playMode: 'teams', roundMode: 'custom', roundCount: 3 });
  const room = game.room(host.code);
  assert.deepEqual(room.players.map(player => player.teamId), ['A', 'B', 'A', 'B']);
  game.swapTeams(host.code, host.token, host.playerId, b1.playerId);
  assert.deepEqual(room.players.map(player => player.teamId), ['B', 'A', 'A', 'B']);
  game.swapTeams(host.code, host.token, host.playerId, b1.playerId);
  assert.throws(() => game.swapTeams(host.code, b1.token, host.playerId, b1.playerId), /Only the host/);
  game.start(host.code, host.token);
  const first = room.rounds[0].correct;
  game.answer(host.code, host.token, { choice: first, wildCard: true });
  game.answer(host.code, a2.token, { choice: (first + 1) % 3, wildCard: true });
  game.answer(host.code, b1.token, { choice: first });
  game.answer(host.code, b2.token, { choice: (first + 1) % 3 });
  game.reveal(room);
  const reveal = game.snapshot(room, a2.playerId);
  assert.deepEqual(reveal.roundResult.teamWinnerIds, ['A']);
  assert.equal(reveal.roundResult.teamRounds.find(team => team.id === 'A').score, 7.5);
  assert.equal(reveal.roundResult.teamRounds.find(team => team.id === 'B').score, 5);
  assert.equal(reveal.roundResult.leaderboard.find(player => player.id === a2.playerId).points, -5);
  assert.equal(reveal.teams.find(team => team.id === 'A').score, 7.5);
  assert.equal(reveal.roundResult.leaderboard[0].id, host.playerId);
  game.advance(host.code, host.token);

  const second = room.rounds[1].correct;
  game.answer(host.code, host.token, { choice: (second + 1) % 3 });
  game.answer(host.code, a2.token, { choice: second });
  game.answer(host.code, b1.token, { choice: second });
  game.answer(host.code, b2.token, { choice: (second + 1) % 3 });
  game.reveal(room);
  assert.deepEqual(new Set(game.snapshot(room, host.playerId).roundResult.teamWinnerIds), new Set(['A', 'B']));
  game.advance(host.code, host.token);

  const third = (room.rounds[2].correct + 1) % 3;
  for (const seat of [host, b1, a2, b2]) game.answer(host.code, seat.token, { choice: third });
  game.reveal(room);
  assert.deepEqual(game.snapshot(room, host.playerId).roundResult.teamWinnerIds, []);
  game.advance(host.code, host.token);
  const final = game.snapshot(room, host.playerId).finalResult;
  assert.equal(final.teams[0].id, 'A');
  assert.equal(final.teams[0].score, 12.5);
  assert.equal(final.teams[1].score, 10);
  assert.equal(final.players.find(player => player.id === a2.playerId).score, 5);
});

test('leaving after a game preserves the final board and passes host control', () => {
  const game = new GameStore({ roundMs: 1000, voteMs: 1000 });
  const host = game.create({ name: 'Host' });
  const guest = game.join(host.code, { name: 'Guest' });
  game.setRoundCount(host.code, host.token, 1);
  game.start(host.code, host.token);
  const room = game.room(host.code);
  const correct = room.rounds[0].correct;
  game.answer(host.code, host.token, { choice: correct });
  game.answer(host.code, guest.token, { choice: correct });
  game.reveal(room);
  game.react(host.code, guest.token, '🤔');
  assert.equal(game.snapshot(room, host.playerId).lastReaction.emoji, '🤔');
  game.advance(host.code, host.token);
  game.react(host.code, host.token, '🫠');
  assert.throws(() => game.react(host.code, host.token, '🔥'), /Choose a reaction/);
  game.leave(host.code, host.token);
  const remaining = game.snapshot(room, guest.playerId);
  assert.equal(remaining.hostId, guest.playerId);
  assert.equal(remaining.players.length, 1);
  assert.equal(remaining.finalResult.players.length, 2);
  assert.equal(remaining.finalResult.players[0].rank, 1);
  game.join(host.code, { name: 'Newcomer' });
  game.setRoundCount(host.code, guest.token, 1);
  game.start(host.code, guest.token);
  game.clearTimer(room);
});
