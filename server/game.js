import { randomBytes, randomUUID } from 'node:crypto';
import { QUESTIONS } from './questions.js';
import { AVATARS } from '../shared/personas.js';

export const ROUND_SECONDS = 20;
export const VOTE_REVEAL_MS = 4200;
export const MAX_PLAYERS = 8;
export const MAX_ROUNDS = 10;
export const TEAMS = [
  { id: 'A', name: 'Truth Troop' },
  { id: 'B', name: 'Odd Squad' }
];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomBytes(4).readUInt32BE() % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cleanPlayer(input) {
  const name = String(input?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!name) throw new GameError('Add a name to join.');
  const avatar = AVATARS.includes(input?.avatar) ? input.avatar : '👽';
  return { name, avatar };
}

function teamScores(room, pointsFor) {
  return TEAMS.map(team => {
    const members = room.players.filter(player => player.teamId === team.id);
    const total = members.reduce((sum, player) => sum + pointsFor(player), 0);
    return { ...team, members: members.map(player => player.id), total, count: members.length,
      score: members.length ? total / members.length : 0 };
  });
}

// Compare averages without rounding displayed scores, including Wild Card fractions.
function compareTeamScores(a, b) {
  return a.total * b.count - b.total * a.count;
}

function playerStandings(players, points = new Map(), previous = null) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const previousRanks = new Map();
  if (previous) {
    const before = [...players].sort((a, b) => previous.get(b.id) - previous.get(a.id));
    before.forEach((player, index) => {
      previousRanks.set(player.id, before.findIndex(other => previous.get(other.id) === previous.get(player.id)) + 1);
    });
  }
  return sorted.map((player, index) => ({
    id: player.id, name: player.name, avatar: player.avatar, teamId: player.teamId,
    score: player.score, rank: sorted.findIndex(other => other.score === player.score) + 1,
    points: points.get(player.id) ?? 0,
    movement: previous ? previousRanks.get(player.id) - (sorted.findIndex(other => other.score === player.score) + 1) : 0
  }));
}

function teamStandings(room, pointsFor = player => player.score) {
  const teams = teamScores(room, pointsFor).sort((a, b) => compareTeamScores(b, a));
  return teams.map(team => ({
    ...team, rank: teams.findIndex(other => compareTeamScores(other, team) === 0) + 1
  }));
}

export class GameError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export class GameStore {
  constructor({ onChange = () => {}, roundMs = ROUND_SECONDS * 1000, voteMs = VOTE_REVEAL_MS, scheduleTimers = true } = {}) {
    this.rooms = new Map();
    this.onChange = onChange;
    this.roundMs = roundMs;
    this.voteMs = voteMs;
    this.scheduleTimers = scheduleTimers;
  }

  create(input) {
    const { name, avatar } = cleanPlayer(input);
    const kind = input?.kind === 'solo' ? 'solo' : 'friends';
    const soloRoundMode = kind === 'solo' ? input?.roundMode ?? 'custom' : 'ten';
    const soloRoundCount = kind === 'solo' ? input?.roundCount ?? 5 : MAX_ROUNDS;
    if (kind === 'solo' && !['ten', 'custom'].includes(soloRoundMode)) throw new GameError('Choose a Solo game length.');
    if (kind === 'solo' && (!Number.isInteger(soloRoundCount) || soloRoundCount < 1 || soloRoundCount > MAX_ROUNDS)) {
      throw new GameError(`Choose between 1 and ${MAX_ROUNDS} Solo rounds.`);
    }
    let code;
    do {
      const bytes = randomBytes(5);
      code = Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
    } while (this.rooms.has(code));
    const player = this.newPlayer(name, avatar);
    const room = {
      code, kind, hostId: player.id, players: [player], phase: 'lobby', rounds: [], roundCount: soloRoundCount,
      roundIndex: -1, answers: new Map(), voteCounts: null, deadline: null,
      roundMode: soloRoundMode, activeRoundMode: 'ten', playMode: 'solo', activePlayMode: 'solo',
      gameId: null, completedRounds: 0, timer: null, updatedAt: Date.now(),
      history: [], roundResult: null, finalResult: null, lastReaction: null
    };
    this.rooms.set(code, room);
    return { code, playerId: player.id, token: player.token };
  }

  newPlayer(name, avatar) {
    return { id: randomUUID(), token: randomBytes(24).toString('hex'), name, avatar, teamId: null, score: 0, usedWildCard: false };
  }

  join(code, input) {
    const room = this.room(code);
    if (room.kind === 'solo') throw new GameError('This is a Solo game. Create a room to play with friends.');
    if (room.phase !== 'lobby' && room.phase !== 'finished') throw new GameError('This game has already started.');
    if (room.players.length >= MAX_PLAYERS) throw new GameError('This room is full.');
    const { name, avatar } = cleanPlayer(input);
    const player = this.newPlayer(name, avatar);
    if (room.playMode === 'teams') {
      const counts = TEAMS.map(team => room.players.filter(member => member.teamId === team.id).length);
      player.teamId = counts[0] <= counts[1] ? 'A' : 'B';
    }
    room.players.push(player);
    this.changed(room);
    return { code: room.code, playerId: player.id, token: player.token };
  }

  room(code) {
    const room = this.rooms.get(String(code ?? '').trim().toUpperCase());
    if (!room) throw new GameError('Room not found. Check the code and try again.', 404);
    return room;
  }

  authenticate(code, token) {
    const room = this.room(code);
    const player = room.players.find(p => p.token === token);
    if (!player) throw new GameError('Your seat in this room was not found.', 403);
    return { room, player };
  }

  requireHost(room, player) {
    if (room.hostId !== player.id) throw new GameError('Only the host can do that.', 403);
  }

  setRoundCount(code, token, roundCount) {
    this.setSettings(code, token, { roundMode: 'custom', roundCount });
  }

  setSettings(code, token, { roundMode, roundCount, playMode } = {}) {
    const { room, player } = this.authenticate(code, token);
    this.requireHost(room, player);
    if (room.phase !== 'lobby' && room.phase !== 'finished') throw new GameError('Settings can only change between games.');
    if (room.kind === 'solo' && playMode !== undefined) throw new GameError('Solo games use individual scoring.');
    if (room.kind === 'solo' && roundMode === 'host') throw new GameError('Choose a Solo game length.');
    if (roundMode !== undefined && !['ten', 'custom', 'host'].includes(roundMode)) throw new GameError('Choose a game length.');
    if (playMode !== undefined && !['solo', 'teams'].includes(playMode)) throw new GameError('Choose individuals or teams.');
    if (roundCount !== undefined && (!Number.isInteger(roundCount) || roundCount < 1 || roundCount > MAX_ROUNDS)) {
      throw new GameError(`Choose between 1 and ${MAX_ROUNDS} rounds.`);
    }
    if (roundCount !== undefined) room.roundCount = roundCount;
    if (roundMode !== undefined) room.roundMode = roundMode;
    if (playMode !== undefined && room.playMode !== playMode) {
      room.playMode = playMode;
      if (playMode === 'teams') this.balanceTeams(room, true);
    }
    this.changed(room);
  }

  balanceTeams(room, reset = false) {
    if (reset) room.players.forEach((player, index) => { player.teamId = TEAMS[index % 2].id; });
    while (true) {
      const [a, b] = TEAMS.map(team => room.players.filter(player => player.teamId === team.id));
      if (Math.abs(a.length - b.length) <= 1) break;
      (a.length > b.length ? a : b).at(-1).teamId = a.length > b.length ? 'B' : 'A';
    }
  }

  swapTeams(code, token, firstId, secondId) {
    const { room, player } = this.authenticate(code, token);
    this.requireHost(room, player);
    if (room.phase !== 'lobby' || room.playMode !== 'teams') throw new GameError('Teams can be swapped in the lobby.');
    const first = room.players.find(member => member.id === firstId);
    const second = room.players.find(member => member.id === secondId);
    if (!first || !second || first.teamId === second.teamId) throw new GameError('Choose one player from each team.');
    [first.teamId, second.teamId] = [second.teamId, first.teamId];
    this.changed(room);
  }

  start(code, token) {
    const { room, player } = this.authenticate(code, token);
    this.requireHost(room, player);
    if (room.phase !== 'lobby' && room.phase !== 'finished') throw new GameError('The game is already running.');
    if (room.players.length < (room.kind === 'solo' ? 1 : 2)) throw new GameError('You need at least 2 players to start.');
    if (room.playMode === 'teams' && room.players.length < 4) throw new GameError('Teams need at least 4 players.');
    if (room.playMode === 'teams') this.balanceTeams(room);
    for (const p of room.players) { p.score = 0; p.usedWildCard = false; }
    room.activeRoundMode = room.roundMode;
    room.activePlayMode = room.playMode;
    room.gameId = randomUUID();
    room.completedRounds = 0;
    const count = room.roundMode === 'custom' ? room.roundCount : MAX_ROUNDS;
    room.rounds = shuffle(QUESTIONS).slice(0, count).map(question => {
      const order = shuffle([0, 1, 2]);
      return {
        ...question, choices: order.map(index => question.choices[index]),
        correct: order.indexOf(question.correct)
      };
    });
    room.roundIndex = -1;
    room.history = [];
    room.finalResult = null;
    room.lastReaction = null;
    this.nextRound(room);
  }

  nextRound(room) {
    this.clearTimer(room);
    room.roundIndex++;
    if (room.roundIndex >= room.rounds.length) {
      this.finishGame(room);
      return;
    }
    room.phase = 'question';
    room.answers = new Map();
    room.voteCounts = null;
    room.roundResult = null;
    room.deadline = Date.now() + this.roundMs;
    const index = room.roundIndex;
    if (this.scheduleTimers) room.timer = setTimeout(() => {
      if (room.phase === 'question' && room.roundIndex === index) this.showVotes(room);
    }, this.roundMs);
    this.changed(room);
  }

  answer(code, token, { choice, wildCard } = {}) {
    const { room, player } = this.authenticate(code, token);
    if (room.phase !== 'question' || Date.now() >= room.deadline) throw new GameError('That question has closed.');
    if (room.answers.has(player.id)) throw new GameError('Your answer is already locked in.');
    if (!Number.isInteger(choice) || choice < 0 || choice > 2) throw new GameError('Choose one of the three claims.');
    if (wildCard && player.usedWildCard) throw new GameError('You have already used your Wild Card.');
    room.answers.set(player.id, { choice, wildCard: Boolean(wildCard) });
    if (wildCard) player.usedWildCard = true;
    if (room.answers.size === room.players.length) this.showVotes(room);
    else this.changed(room);
  }

  showVotes(room) {
    if (room.phase !== 'question') return;
    this.clearTimer(room);
    room.phase = 'votes';
    room.deadline = Date.now() + this.voteMs;
    room.voteCounts = [0, 0, 0];
    for (const answer of room.answers.values()) room.voteCounts[answer.choice]++;
    if (room.kind === 'solo') { this.reveal(room); return; }
    const index = room.roundIndex;
    if (this.scheduleTimers) room.timer = setTimeout(() => {
      if (room.phase === 'votes' && room.roundIndex === index) this.reveal(room);
    }, this.voteMs);
    this.changed(room);
  }

  reveal(room) {
    if (room.phase !== 'votes') return;
    this.clearTimer(room);
    const correct = room.rounds[room.roundIndex].correct;
    const correctPlayers = [];
    const roundPoints = new Map();
    const previousScores = new Map(room.players.map(player => [player.id, player.score]));
    for (const player of room.players) {
      const answer = room.answers.get(player.id);
      if (!answer) continue;
      if (answer.choice === correct) {
        const points = answer.wildCard ? 20 : 10;
        player.score += points;
        roundPoints.set(player.id, points);
        correctPlayers.push(player.id);
      } else if (answer.wildCard) {
        player.score -= 5;
        roundPoints.set(player.id, -5);
      }
    }
    const winningPoints = Math.max(0, ...roundPoints.values());
    const winnerIds = winningPoints > 0
      ? room.players.filter(player => roundPoints.get(player.id) === winningPoints).map(player => player.id)
      : [];
    const teamRounds = teamScores(room, player => roundPoints.get(player.id) ?? 0);
    const bestTeam = teamRounds.reduce((best, team) => !best || compareTeamScores(team, best) > 0 ? team : best, null);
    const teamWinnerIds = bestTeam?.total > 0
      ? teamRounds.filter(team => compareTeamScores(team, bestTeam) === 0).map(team => team.id) : [];
    room.roundResult = { winnerIds, winningPoints, teamWinnerIds, roundPoints, previousScores };
    room.history.push({ correctPlayers });
    room.completedRounds++;
    room.phase = 'reveal';
    room.deadline = null;
    this.changed(room);
  }

  advance(code, token) {
    const { room, player } = this.authenticate(code, token);
    this.requireHost(room, player);
    if (room.phase !== 'reveal') throw new GameError('Wait for the answer reveal.');
    this.nextRound(room);
  }

  finish(code, token) {
    const { room, player } = this.authenticate(code, token);
    this.requireHost(room, player);
    if (room.phase !== 'reveal') throw new GameError('Finish after a reveal.');
    this.finishGame(room);
  }

  extend(code, token) {
    const { room, player } = this.authenticate(code, token);
    this.requireHost(room, player);
    if (room.phase !== 'finished') throw new GameError('Finish the game before continuing.');
    const seen = new Set(room.rounds.slice(0, room.completedRounds).map(question => question.id));
    const available = QUESTIONS.filter(question => !seen.has(question.id));
    if (!available.length) throw new GameError('You have seen every fact in this session. Start a new game to play again.');
    const more = shuffle(available).slice(0, 5).map(question => {
      const order = shuffle([0, 1, 2]);
      return { ...question, choices: order.map(index => question.choices[index]), correct: order.indexOf(question.correct) };
    });
    room.rounds = room.rounds.slice(0, room.completedRounds).concat(more);
    room.roundIndex = room.completedRounds - 1;
    room.finalResult = null;
    this.nextRound(room);
  }

  finishGame(room) {
    this.clearTimer(room);
    room.finalResult = {
      players: playerStandings(room.players),
      teams: room.activePlayMode === 'teams' ? teamStandings(room) : [],
      awards: this.awards(room),
      roundsPlayed: room.completedRounds,
      playMode: room.activePlayMode,
      gameId: room.gameId
    };
    room.phase = 'finished';
    room.deadline = null;
    this.changed(room);
  }

  leave(code, token) {
    const { room, player } = this.authenticate(code, token);
    if (room.kind !== 'solo' && room.phase !== 'lobby' && room.phase !== 'finished') throw new GameError('Leave between games.');
    room.players = room.players.filter(member => member.id !== player.id);
    if (!room.players.length) {
      this.clearTimer(room);
      this.changed(room);
      this.rooms.delete(room.code);
      return;
    }
    if (room.hostId === player.id) room.hostId = room.players[0].id;
    if (room.phase === 'lobby' && room.playMode === 'teams') this.balanceTeams(room);
    this.changed(room);
  }

  react(code, token, emoji) {
    const { room, player } = this.authenticate(code, token);
    if (room.phase !== 'reveal' && room.phase !== 'finished') throw new GameError('Reactions are for the reveal.');
    if (!['🤯', '😂', '👏', '😱', '👀', '🤔', '🫠'].includes(emoji)) throw new GameError('Choose a reaction.');
    room.lastReaction = { id: randomUUID(), avatar: player.avatar, name: player.name, emoji };
    this.changed(room);
  }

  snapshot(room, playerId) {
    const me = room.players.find(p => p.id === playerId);
    if (!me) throw new GameError('Your seat in this room was not found.', 403);
    const question = room.rounds[room.roundIndex];
    const revealed = room.phase === 'reveal';
    const votesVisible = room.phase === 'votes' || revealed;
    const scores = [...room.players].sort((a, b) => b.score - a.score).map(p => ({
      id: p.id, name: p.name, avatar: p.avatar, score: p.score, teamId: p.teamId,
      isHost: p.id === room.hostId
    }));
    const roundPoints = room.roundResult?.roundPoints ?? new Map();
    const roundTeams = revealed && room.activePlayMode === 'teams'
      ? teamStandings(room, member => roundPoints.get(member.id) ?? 0) : [];
    return {
      code: room.code, kind: room.kind ?? 'friends', phase: room.phase, hostId: room.hostId, you: playerId, gameId: room.gameId,
      players: scores, maxPlayers: MAX_PLAYERS, maxRounds: MAX_ROUNDS,
      round: room.phase === 'finished' ? room.completedRounds : Math.max(0, room.roundIndex + 1),
      totalRounds: room.phase === 'finished' ? room.completedRounds : room.phase === 'lobby'
        ? (room.roundMode === 'custom' ? room.roundCount : MAX_ROUNDS) : room.rounds.length,
      selectedRounds: room.roundCount, roundMode: room.roundMode, activeRoundMode: room.activeRoundMode,
      playMode: room.playMode, activePlayMode: room.activePlayMode,
      teams: room.playMode === 'teams' || (room.phase === 'finished' && room.activePlayMode === 'teams')
        ? teamStandings(room) : [],
      deadline: room.deadline, usedWildCard: me.usedWildCard,
      myAnswer: room.answers.get(playerId) ?? null,
      answeredCount: room.answers.size,
      roundResult: revealed ? {
        winners: room.players.filter(p => room.roundResult.winnerIds.includes(p.id)).map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
        points: room.roundResult.winningPoints,
        teamWinnerIds: room.roundResult.teamWinnerIds,
        teamRounds: roundTeams,
        leaderboard: playerStandings(room.players, roundPoints, room.roundResult.previousScores)
      } : null,
      question: question && room.phase !== 'finished' ? {
        id: question.id, topic: question.topic, choices: question.choices,
        ...(votesVisible ? { votes: room.voteCounts } : {}),
        ...(revealed ? { correct: question.correct, explanation: question.explanation, source: question.source, image: question.image ?? null } : {})
      } : null,
      awards: room.phase === 'finished' ? room.finalResult.awards : null,
      finalResult: room.phase === 'finished' ? room.finalResult : null,
      factsAvailable: room.phase === 'finished'
        ? QUESTIONS.length - new Set(room.rounds.slice(0, room.completedRounds).map(q => q.id)).size : 0,
      lastReaction: room.lastReaction
    };
  }

  awards(room) {
    const soloCounts = new Map(room.players.map(p => [p.id, 0]));
    for (const round of room.history) {
      if (round.correctPlayers.length === 1) {
        const id = round.correctPlayers[0];
        soloCounts.set(id, soloCounts.get(id) + 1);
      }
    }
    const highestSolo = Math.max(...soloCounts.values());
    const loneGeniuses = highestSolo > 0
      ? room.players.filter(p => soloCounts.get(p.id) === highestSolo).map(p => p.id) : [];
    const wildCards = room.players.filter(p => p.usedWildCard).map(p => p.id);
    return { loneGeniuses, wildCards };
  }

  clearTimer(room) {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
  }

  changed(room) {
    room.updatedAt = Date.now();
    this.onChange(room);
  }

  prune() {
    const threshold = Date.now() - 4 * 60 * 60 * 1000;
    for (const [code, room] of this.rooms) {
      if (room.updatedAt < threshold) {
        this.clearTimer(room);
        this.rooms.delete(code);
      }
    }
  }
}
