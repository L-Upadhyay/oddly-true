import test from 'node:test';
import assert from 'node:assert/strict';
import { playerExpression, soloScoreFeedback } from '../shared/avatar-feedback.js';
import { characterArtForAvatar, characterForAvatar } from '../shared/personas.js';

test('avatar feedback stays neutral until reveal and resets for a new round', () => {
  const roundResult = { leaderboard: [
    { id: 'correct', points: 10 }, { id: 'wild', points: 20 },
    { id: 'wrong', points: 0 }, { id: 'timeout', points: 0 }, { id: 'penalty', points: -5 }
  ] };
  for (const phase of ['lobby', 'question', 'votes']) {
    assert.equal(playerExpression({ phase, roundResult }, 'correct'), 'neutral');
    assert.equal(playerExpression({ phase, roundResult }, 'wrong'), 'neutral');
  }
  const reveal = { phase: 'reveal', roundResult };
  for (const id of ['correct', 'wild']) assert.equal(playerExpression(reveal, id), 'happy');
  for (const id of ['wrong', 'timeout', 'penalty']) assert.equal(playerExpression(reveal, id), 'disappointed');
  assert.equal(playerExpression(reveal, 'observer'), 'neutral');
  assert.equal(playerExpression({ phase: 'question', roundResult: null }, 'correct'), 'neutral');
  assert.equal(playerExpression(null, 'correct'), 'neutral');
});

test('Friends final expressions celebrate every tied winner and handle unsorted standings', () => {
  const snapshot = { kind: 'friends', phase: 'finished', finalResult: { players: [
    { id: 'third', score: 0 }, { id: 'one', score: 20 }, { id: 'two', score: 20 }
  ] } };
  assert.equal(playerExpression(snapshot, 'one'), 'happy');
  assert.equal(playerExpression(snapshot, 'two'), 'happy');
  assert.equal(playerExpression(snapshot, 'third'), 'disappointed');
  assert.equal(playerExpression(snapshot, 'observer'), 'neutral');
  snapshot.finalResult.players = [{ id: 'one', score: 0 }, { id: 'two', score: 0 }];
  assert.equal(playerExpression(snapshot, 'one'), 'happy');
  assert.equal(playerExpression(snapshot, 'two'), 'happy');
});

test('Solo final faces follow score feedback boundaries, penalties and extended sessions', () => {
  for (const [score, roundsPlayed, expected] of [
    [70, 10, 'happy'], [60, 10, 'neutral'], [30, 10, 'neutral'],
    [20, 10, 'disappointed'], [-5, 1, 'disappointed'], [20, 1, 'happy'],
    [70, 15, 'neutral'], [0, 0, 'disappointed']
  ]) {
    const finalResult = { roundsPlayed, players: [{ id: 'me', score }] };
    assert.equal(soloScoreFeedback(finalResult, 'me').expression, expected);
    assert.equal(playerExpression({ kind: 'solo', phase: 'finished', finalResult }, 'me'), expected);
  }
});

test('expression artwork uses supported variants and falls back for other characters', () => {
  for (const avatar of ['🐦', '🦁']) {
    for (const expression of ['neutral', 'happy', 'disappointed']) {
      assert.equal(characterArtForAvatar(avatar, expression), characterForAvatar(avatar).expressions[expression]);
    }
    assert.equal(characterArtForAvatar(avatar, 'unexpected'), characterForAvatar(avatar).art);
  }
  assert.equal(characterArtForAvatar('🦊', 'happy'), characterForAvatar('🦊').art);
});
