export function soloScoreFeedback(result, playerId) {
  const score = result.players.find(player => player.id === playerId)?.score ?? 0;
  // Match existing score feedback, including the Wild Card bonus/penalty.
  const percent = score / Math.max(1, result.roundsPlayed * 10) * 100;
  if (percent >= 70) return { expression: 'happy', cue: 'celebrate', message: 'Brilliant run! You spotted so many truths.' };
  if (percent <= 20) return { expression: 'disappointed', cue: 'softLanding', message: 'Those facts were tricky. Take a breath and try another set!' };
  return { expression: 'neutral', cue: 'steady', message: 'Nice work! A few more truths are waiting for you.' };
}

// Derive from the current snapshot rather than storing a mood across rounds.
// Answers must remain private until the reveal, including during vote suspense.
export function playerExpression(snapshot, playerId) {
  if (snapshot?.phase === 'reveal') {
    const player = snapshot.roundResult?.leaderboard.find(player => player.id === playerId);
    return player ? (player.points > 0 ? 'happy' : 'disappointed') : 'neutral';
  }
  if (snapshot?.phase === 'finished' && snapshot.finalResult) {
    const result = snapshot.finalResult;
    const player = result.players.find(player => player.id === playerId);
    if (!player) return 'neutral';
    if (snapshot.kind === 'solo') return soloScoreFeedback(result, playerId).expression;
    const best = Math.max(...result.players.map(player => player.score));
    return player.score === best ? 'happy' : 'disappointed';
  }
  return 'neutral';
}
