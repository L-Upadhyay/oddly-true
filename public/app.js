import {
  PERSONAS as personas,
  characterForAvatar,
  customCharacterForName,
  characterMatchForName,
  personaForAvatar
} from '/assets/personas.js';

const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const reactionTray = document.querySelector('#reactions');
const letters = ['A', 'B', 'C'];
const reactions = ['🤯', '😂', '👏', '😱', '👀', '🤔', '🫠'];
let theme;
try { theme = localStorage.getItem('oddly-true-theme'); } catch { /* private browsing can disable storage */ }
theme = theme === 'light' || theme === 'dark' ? theme : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;
document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#121b19' : '#f8f5f0';
let seat = null;
let state = null;
let stream = null;
let transport = 'events';
let pending = false;
let selectedAvatar = personas[Math.floor(Math.random() * personas.length)].avatar;
let identityMode = 'preset';
let customVariation = 0;
let wildCardSelected = false;
let lastQuestion = null;
let draftName = '';
let draftCode = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
let landingMode = draftCode ? 'friends' : null;
let connectionStatus = '';
let toastTimer;
let lastEffectKey = '';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function notify(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

function topbar(note = 'The real fact is the weirdest one.') {
  return `<header class="topbar"><a class="brand" href="/oddly-true/" ${state ? 'data-action="home"' : ''}><span class="brand-mark" aria-hidden="true">?</span> Oddly True</a><div class="topbar-right"><span class="top-note">${escapeHtml(note)}</span><button type="button" class="theme-toggle" data-action="theme" aria-label="Switch to ${theme === 'dark' ? 'light' : 'dark'} mode">${theme === 'dark' ? '☀ Light' : '☾ Dark'}</button></div></header>`;
}

function avatarArt(avatar, className = 'avatar-art') {
  const character = characterForAvatar(avatar);
  return `<img class="${className}" src="${escapeHtml(character.art)}" alt="" width="64" height="64" draggable="false">`;
}

function identityInline(player) {
  return `<span class="identity-inline">${avatarArt(player.avatar, 'inline-avatar')}${escapeHtml(player.name)}</span>`;
}

function characterArt(character) {
  return avatarArt(character.avatar, 'character-illustration');
}

function characterPreview() {
  const character = characterForAvatar(selectedAvatar);
  const persona = identityMode === 'preset' ? personaForAvatar(selectedAvatar) : null;
  const displayName = draftName.trim() || persona?.name || 'Your custom name';
  const match = customVariation === 0 ? characterMatchForName(draftName) : null;
  const matchLabel = match?.reason === 'creature' ? 'Creature match' : match?.reason === 'theme' ? 'Theme match' : 'Surprise character';
  return `<div class="character-preview ${identityMode === 'custom' ? 'is-custom' : ''}" data-motion="${persona?.motion || 'pop'}" role="group" aria-label="Selected character: ${escapeHtml(displayName)}, ${escapeHtml(character.label)}">
    <div class="character-stage" aria-hidden="true"><span class="character-figure">${characterArt(character)}</span>${persona ? `<span class="greeting-bubble">${escapeHtml(persona.greeting)}</span>` : ''}</div>
    <div class="character-preview-copy"><span class="preview-kicker">${identityMode === 'custom' ? 'Your custom character' : 'Your character'}</span><strong>${escapeHtml(displayName)}</strong><span class="preview-detail">${persona ? `Greeting: ${escapeHtml(persona.greeting)}` : `${matchLabel}: ${escapeHtml(character.label)}`}</span>${identityMode === 'custom' ? '<button type="button" class="text-button reroll-character" data-action="reroll-custom">Try another character</button>' : ''}</div>
  </div>`;
}

function playGreeting() {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    app.querySelector('.character-preview')?.classList.add('is-greeting');
  }
}

function landing() {
  const customCharacter = identityMode === 'custom'
    ? characterForAvatar(selectedAvatar)
    : customCharacterForName(draftName, customVariation);
  return `${topbar()}
    <div class="landing">
      <section class="landing-copy">
        <div class="eyebrow">Play Solo or with 2–8 friends</div>
        <h1>Sounds fake.<br><em>Oddly true.</em></h1>
        <p>Three bizarre claims. Only one actually happened. Trust your gut, bring your people if you like, and prepare to be confidently wrong.</p>
        <section class="rules-details" aria-labelledby="how-to-play"><h2 id="how-to-play">How to play</h2><ol><li>Pick the one true claim from three before the 20-second timer ends.</li><li>Correct: +10 points. Wrong or timeout: 0. Your one Wild Card earns +20 if right or −5 if wrong.</li><li>Play five facts alone, or invite friends. With friends, the host advances; the highest individual or team score wins. Ties share the win.</li></ol></section>
        <div class="rule-line"><span>Alone or together</span><span>20 seconds each</span><span>+10 for a true fact</span><span>One Wild Card</span></div>
      </section>
      <section class="panel setup-panel" aria-label="Choose a game and identity">
        <h2>How do you want to play?</h2>
        <div class="play-paths" role="group" aria-label="Choose how to play">
          <button class="${landingMode === 'solo' ? 'primary' : 'secondary'}" type="button" data-action="choose-solo" aria-pressed="${landingMode === 'solo'}">Play Solo <small>Five quick rounds, just you</small></button>
          <button class="${landingMode === 'friends' ? 'primary' : 'secondary'}" type="button" data-action="choose-friends" aria-pressed="${landingMode === 'friends'}">Play with Friends <small>2–8 people, on separate devices</small></button>
        </div>
        <h3 class="identity-title">Pick your identity</h3>
        <label class="field" for="player-name">Your name</label>
        <input id="player-name" class="text-input" maxlength="24" autocomplete="nickname" placeholder="Professor Pigeon" value="${escapeHtml(draftName)}">
        <div class="preset-heading"><span class="field">Choose a character</span><button type="button" class="text-button" data-action="random-persona">Surprise me</button></div>
        <div class="persona-grid" role="group" aria-label="Choose a character and suggested name">${personas.map((persona, index) => `<button type="button" class="persona-option" data-action="persona" data-persona="${index}" aria-pressed="${identityMode === 'preset' && persona.avatar === selectedAvatar}"><span class="persona-avatar" aria-hidden="true">${avatarArt(persona.avatar, 'persona-art')}</span><span class="persona-name">${escapeHtml(persona.name)}</span></button>`).join('')}</div>
        <button type="button" class="custom-persona-option" data-action="custom-persona" aria-pressed="${identityMode === 'custom'}"><span class="custom-persona-art" aria-hidden="true">${avatarArt(customCharacter.avatar, 'persona-art')}</span><span><strong>Create your own</strong><small>Type any name and we’ll match an illustrated character.</small></span><span class="custom-arrow" aria-hidden="true">→</span></button>
        <div class="form-row">
          ${characterPreview()}
          <p class="identity-hint">${identityMode === 'custom' ? 'Try an animal or a theme: Jellyfish Queen, Trust (dog), or Sky (pigeon). We match familiar words; other names get a repeatable surprise. You can always try another character.' : 'Choose a preset to fill in its linked name, or select Create your own for a custom match.'}</p>
        </div>
        ${landingMode === 'solo' ? `<button class="primary full" type="button" data-action="create-solo" ${pending ? 'disabled' : ''}>Start Solo game</button>` : ''}
        ${landingMode === 'friends' ? `<div class="friends-actions"><button class="primary full" type="button" data-action="create" ${pending ? 'disabled' : ''}>Create a room</button>
          <div class="divider">or join your friends</div>
          <label class="field" for="room-input">Room code</label>
          <div class="join-row"><input id="room-input" class="text-input" maxlength="5" autocapitalize="characters" autocomplete="off" placeholder="ABCDE" value="${escapeHtml(draftCode)}"><button class="secondary" type="button" data-action="join" ${pending ? 'disabled' : ''}>Join room</button></div></div>` : ''}
      </section>
    </div>`;
}

function roomHeader() {
  if (state.kind === 'solo') return '';
  return `<div class="room-header">
    <button class="room-code" type="button" data-action="copy-code" title="Copy room code" aria-label="Copy room code ${escapeHtml(state.code)}"><small>Room</small>${escapeHtml(state.code)} <span aria-hidden="true">⧉</span></button>
    <div class="room-actions"><button class="secondary" type="button" data-action="copy-link">Copy invite link</button></div>
  </div>`;
}

function playerName(player) {
  return `${escapeHtml(player.name)}${player.isHost ? ' <span class="host-tag">(Host)</span>' : ''}`;
}

function points(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function teamName(id) {
  return state.teams.find(team => team.id === id)?.name ?? (id === 'A' ? 'Truth Troop' : 'Odd Squad');
}

function sidebar() {
  const teams = state.phase === 'finished' ? state.activePlayMode === 'teams' : state.playMode === 'teams';
  const teamRows = state.phase === 'finished' ? state.finalResult.teams : state.teams;
  return `<aside class="panel score-side" aria-label="Scores">${teams && state.phase !== 'lobby' ? `<h3>Teams <span class="muted small">average</span></h3><div class="score-list">${teamRows.map(team => `<div class="player-row team-${team.id.toLowerCase()}"><span class="team-dot" aria-hidden="true"></span><span class="player-name">${escapeHtml(team.name)}</span><span class="player-points">${points(team.score)}</span></div>`).join('')}</div>` : ''}
    <h3>Players <span class="muted small">${state.players.length}/8</span></h3>
    <div class="score-list">${state.players.map(player => `<div class="player-row"><span class="player-avatar" aria-hidden="true">${avatarArt(player.avatar, 'player-avatar-art')}</span><span class="player-name">${playerName(player)}${player.id === state.you ? ' <span class="you-tag">(You)</span>' : ''}${teams && player.teamId ? `<span class="team-tag team-${player.teamId.toLowerCase()}">${escapeHtml(teamName(player.teamId))}</span>` : ''}</span><span class="player-points">${state.phase === 'lobby' ? '—' : player.score}</span></div>`).join('')}</div>
    ${connectionStatus ? `<p class="status-note">${escapeHtml(connectionStatus)}</p>` : ''}
  </aside>`;
}

function roundSettings() {
  return `<fieldset class="settings-group"><legend>How many rounds?</legend><div class="option-row">
    <label class="mode-option"><input type="radio" name="round-mode" value="ten" ${state.roundMode === 'ten' ? 'checked' : ''} ${pending ? 'disabled' : ''}><span>10 rounds</span></label>
    <label class="mode-option"><input type="radio" name="round-mode" value="custom" ${state.roundMode === 'custom' ? 'checked' : ''} ${pending ? 'disabled' : ''}><span>Custom number</span></label>
    <label class="mode-option"><input type="radio" name="round-mode" value="host" ${state.roundMode === 'host' ? 'checked' : ''} ${pending ? 'disabled' : ''}><span>Host decides</span></label>
  </div>${state.roundMode === 'custom' ? `<label class="field" for="round-count">Rounds (1–${state.maxRounds})</label><input id="round-count" class="text-input number-input" type="number" min="1" max="${state.maxRounds}" step="1" inputmode="numeric" value="${state.selectedRounds}" ${pending ? 'disabled' : ''}>` : ''}
  <p class="muted small">${state.roundMode === 'host' ? 'After each reveal, the host can continue or finish. Up to 10 rounds.' : 'One fact per round. The game ends after the chosen number.'}</p></fieldset>`;
}

function teamSettings() {
  return `<fieldset class="settings-group"><legend>Play style</legend><div class="option-row">
    <label class="mode-option"><input type="radio" name="play-mode" value="solo" ${state.playMode === 'solo' ? 'checked' : ''} ${pending ? 'disabled' : ''}><span>Individuals</span></label>
    <label class="mode-option"><input type="radio" name="play-mode" value="teams" ${state.playMode === 'teams' ? 'checked' : ''} ${pending ? 'disabled' : ''}><span>Teams · 4–8</span></label>
  </div><p class="muted small">${state.playMode === 'teams' ? 'Everyone answers independently. Team score is the average of its members’ points. Each person has their own Wild Card.' : 'The highest personal score wins.'}</p></fieldset>`;
}

function teamLobby() {
  if (state.playMode !== 'teams') return `<div class="lobby-players">${state.players.map(player => `<span class="lobby-player"><span class="lobby-avatar" aria-hidden="true">${avatarArt(player.avatar, 'lobby-avatar-art')}</span>${escapeHtml(player.name)}</span>`).join('')}</div>`;
  const [a, b] = ['A', 'B'].map(id => state.players.filter(player => player.teamId === id));
  return `<div class="team-lobby">${[a, b].map((members, index) => `<div class="team-card team-${index ? 'b' : 'a'}"><h3><span class="team-dot" aria-hidden="true"></span>${index ? 'Odd Squad' : 'Truth Troop'}</h3><div class="team-members">${members.map(player => identityInline(player)).join('') || '<span class="muted">Waiting for players</span>'}</div></div>`).join('')}</div>
    ${state.hostId === state.you && a.length && b.length ? `<div class="swap-controls"><span class="field">Swap teammates</span><div><select id="team-a-swap" class="text-input" aria-label="Truth Troop player">${a.map(player => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join('')}</select><select id="team-b-swap" class="text-input" aria-label="Odd Squad player">${b.map(player => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join('')}</select><button class="secondary" type="button" data-action="swap" ${pending ? 'disabled' : ''}>Swap</button></div></div>` : ''}`;
}

function lobby() {
  const isHost = state.hostId === state.you;
  const requiredPlayers = state.playMode === 'teams' ? 4 : 2;
  const ready = state.players.length >= requiredPlayers;
  const lobbyStatus = !ready ? 'Waiting for players' : isHost ? 'Ready to start' : 'Waiting for host';
  return `<div class="stage-head"><span class="eyebrow">The lobby</span><span class="pill">${lobbyStatus}</span></div>
    <div class="lobby-intro"><h2>Gather your fellow fact detectives.</h2>
      <ul class="lobby-guide" aria-label="How this game works">
        <li><span class="guide-icon" aria-hidden="true">↗</span><div><strong>Invite your friends</strong><span>Share the room code or link. Everyone plays on their own device.</span></div></li>
        <li><span class="guide-icon" aria-hidden="true">?</span><div><strong>Spot the truth</strong><span>Pick the one real claim from three in <b>20 seconds</b>.</span></div></li>
        <li><span class="guide-icon" aria-hidden="true">+10</span><div><strong>Score your points</strong><span>Correct: <b>+10</b>. Wrong or timeout: <b>0</b>. One Wild Card: <b>+20</b> if right, <b>−5</b> if wrong.</span></div></li>
        <li><span class="guide-icon" aria-hidden="true">✦</span><div><strong>See the reveal</strong><span>Votes appear first, then the truth and leaderboard. The host starts the next round.</span></div></li>
      </ul>
    </div>
    ${teamLobby()}
    ${isHost ? `${roundSettings()}${teamSettings()}` : `<p class="muted">${state.roundMode === 'host' ? 'Host decides when to finish, up to 10 rounds' : `${state.totalRounds} ${state.totalRounds === 1 ? 'round' : 'rounds'}`} · ${state.playMode === 'teams' ? 'Teams by average score' : 'Individuals by total points'}. The host sets the rules.</p>`}
    <div class="lobby-footer">${isHost ? `<button class="primary" type="button" data-action="start" ${!ready || pending ? 'disabled' : ''}>Start the game</button><p class="muted small">${!ready ? `Waiting for ${requiredPlayers} players.` : state.roundMode === 'host' ? 'Finish after any reveal, at most 10 rounds.' : `${state.totalRounds} ${state.totalRounds === 1 ? 'round' : 'rounds'} · plan for ${Math.ceil(state.totalRounds / 2)}+ ${state.totalRounds <= 2 ? 'minute' : 'minutes'}; host sets the pace.`}</p>` : `<p class="muted">${ready ? 'Waiting for the host to start…' : 'Waiting for more players…'}</p>`}</div>`;
}

function choiceList() {
  const question = state.question;
  const locked = Boolean(state.myAnswer);
  const visible = (state.phase === 'votes' || state.phase === 'reveal') && state.kind !== 'solo';
  return `<div class="choices" role="group" aria-label="Three claims">
    ${question.choices.map((choice, index) => {
      const selected = state.myAnswer?.choice === index;
      const correct = state.phase === 'reveal' && question.correct === index;
      const wrongPicked = state.phase === 'reveal' && selected && !correct;
      const share = visible && state.answeredCount ? Math.round(question.votes[index] / state.answeredCount * 100) : 0;
      return `<button class="choice ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrongPicked ? 'wrong-picked' : ''}" type="button" data-action="answer" data-choice="${index}" ${state.phase !== 'question' || locked || pending ? 'disabled' : ''} aria-label="${letters[index]}: ${escapeHtml(choice)}${selected ? ', your pick' : ''}${correct ? ', correct answer' : ''}${visible ? `, ${question.votes[index]} votes` : ''}">
        ${visible ? `<span class="vote-bar" style="width:${share}%" aria-hidden="true"></span>` : ''}
        <span class="choice-letter">${correct ? '✓' : letters[index]}</span><span class="choice-text">${escapeHtml(choice)}</span>${visible ? `<span class="choice-meta">${selected ? '<span class="your-pick">Your pick</span>' : ''}<span class="choice-votes">${question.votes[index]} ${question.votes[index] === 1 ? 'vote' : 'votes'}</span></span>` : ''}
      </button>`;
    }).join('')}
  </div>`;
}

function roundWinner() {
  const { winners, points: winningPoints, teamWinnerIds, teamRounds } = state.roundResult;
  if (state.activePlayMode === 'teams') {
    if (!teamWinnerIds.length) return '<div class="round-winner"><span>Round result</span><strong>No team won this round.</strong><small>Neither team earned a positive average.</small></div>';
    const names = teamWinnerIds.map(id => escapeHtml(teamName(id))).join(' & ');
    const best = teamRounds.find(team => teamWinnerIds.includes(team.id));
    return `<div class="round-winner"><span>${teamWinnerIds.length === 1 ? 'Team round winner' : 'Team round winners · tied'}</span><strong>${names}</strong><small>+${points(best.score)} average points this round</small></div>`;
  }
  if (!winners.length) return '<div class="round-winner"><span>Round result</span><strong>Nobody got this one!</strong><small>The fact wins this round.</small></div>';
  const names = winners.map(identityInline).join(' <span aria-hidden="true">·</span> ');
  return `<div class="round-winner"><span>${winners.length === 1 ? 'Round winner' : 'Round winners · tied'}</span><strong>${names}</strong><small>+${winningPoints} points this round</small></div>`;
}

function leaderboardRows(rows, showRound = false) {
  return `<div class="leaderboard-list">${rows.map(player => `<div class="leaderboard-row ${player.id === state.you ? 'is-you' : ''}">
    <span class="rank">${player.rank}.</span><span class="player-avatar" aria-hidden="true">${avatarArt(player.avatar, 'player-avatar-art')}</span>
    <span class="leaderboard-name">${escapeHtml(player.name)}${player.id === state.you ? ' <small>(You)</small>' : ''}${state.activePlayMode === 'teams' && player.teamId ? `<small>${escapeHtml(teamName(player.teamId))}</small>` : ''}</span>
    ${showRound ? `<span class="round-delta ${player.points < 0 ? 'negative' : ''}">${player.points > 0 ? '+' : ''}${player.points} this round${player.movement > 0 ? ` · ↑${player.movement}` : player.movement < 0 ? ` · ↓${-player.movement}` : ''}</span>` : ''}
    <strong>${points(player.score)}</strong></div>`).join('')}</div>`;
}

function teamLeaderboard(teams, showRound = false) {
  return `<div class="team-board">${teams.map(team => `<div class="team-board-row team-${team.id.toLowerCase()}"><span class="rank">${team.rank}.</span><span class="team-dot" aria-hidden="true"></span><strong>${escapeHtml(team.name)}</strong><span>${showRound ? `${team.score > 0 ? '+' : ''}${points(team.score)} this round · ` : ''}${points(showRound ? state.teams.find(item => item.id === team.id).score : team.score)} average</span></div>`).join('')}</div>`;
}

function roundLeaderboard() {
  return `<section class="leaderboard" aria-label="Leaderboard after round ${state.round}"><h3>Leaderboard · Round ${state.round}</h3>
    ${state.activePlayMode === 'teams' ? teamLeaderboard(state.roundResult.teamRounds, true) : ''}
    <h4>${state.activePlayMode === 'teams' ? 'Individual scores' : 'Scores'}</h4>${leaderboardRows(state.roundResult.leaderboard, true)}</section>`;
}

function reactionButtons(label) {
  return `<div class="reaction-buttons" role="group" aria-label="${label}">${reactions.map(emoji => `<button type="button" data-action="react" data-emoji="${emoji}" aria-label="React ${emoji}">${emoji}</button>`).join('')}</div>`;
}

function outcomeText() {
  if (state.activePlayMode === 'teams') {
    const winners = state.roundResult.teamWinnerIds;
    if (!winners.length) return 'No team winner this round. The next fact is still up for grabs.';
    return winners.includes(state.players.find(player => player.id === state.you)?.teamId)
      ? 'Your team took the round! Your own points are shown above.'
      : 'The other team took this round. The next fact is still up for grabs.';
  }
  if (!state.roundResult.winners.length) return 'Nobody won this round. The next fact is still up for grabs.';
  return state.roundResult.winners.some(player => player.id === state.you)
    ? 'You took the round!'
    : 'The next fact is still up for grabs.';
}

function questionStage() {
  const phase = state.phase;
  const me = state.myAnswer;
  let bottom = '';
  if (phase === 'question') {
    bottom = `<div class="timer-row"><span>${me ? 'Answer locked in' : 'Make your pick'}</span><span class="timer-value" id="timer-value">20s</span></div><div class="timer-track" aria-hidden="true"><span id="timer-fill" style="width:100%"></span></div>
      ${!me && !state.usedWildCard ? `<button type="button" class="wild-card" data-action="wild" aria-pressed="${wildCardSelected}"><span class="wild-icon">✦</span><span><strong>Use your Wild Card${wildCardSelected ? ' · on' : ''}</strong><small>Once per game: +20 if right, −5 if wrong.</small></span></button>` : ''}
      <p class="status-note">${me ? `${me.wildCard ? 'Wild Card played. ' : ''}Waiting for the others… ${state.answeredCount}/${state.players.length} locked in.` : 'Choose one claim. Your answer locks immediately.'}</p>`;
  } else if (phase === 'votes') {
    bottom = `<div class="vote-wait"><span class="big-symbol" aria-hidden="true">👀</span><h3>The room has spoken.</h3><p class="muted">The truth drops in <strong id="reveal-countdown">5</strong>…</p></div>`;
  } else {
    const points = me ? (me.choice === state.question.correct ? (me.wildCard ? 20 : 10) : (me.wildCard ? -5 : 0)) : 0;
    const label = !me ? 'Time ran out · 0 points' : points > 0 ? `You got it · +${points} points` : points < 0 ? 'Wild Card missed · −5 points' : 'The fact fooled you · 0 points';
    const picture = state.question.image ? `<figure class="fact-image"><img class="${state.question.image.fit === 'contain' ? 'fact-image-contain' : ''}" src="${escapeHtml(state.question.image.path)}" alt="${escapeHtml(state.question.image.alt)}" loading="eager"><figcaption>Image: <a href="${escapeHtml(state.question.image.creditUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(state.question.image.credit)}</a> · <a href="${escapeHtml(state.question.image.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(state.question.image.license)}</a></figcaption></figure>` : factArt(state.question);
    bottom = `<div class="result-banner ${points <= 0 ? 'miss' : ''}" role="status">${label}</div>
      <div class="reveal-box">${picture}<div class="fact-copy"><strong>Oddly true.</strong><p>${escapeHtml(state.question.explanation)}</p><a href="${escapeHtml(state.question.source.url)}" target="_blank" rel="noopener noreferrer">Check the fact · ${escapeHtml(state.question.source.label)} ↗</a></div></div>
      ${state.kind === 'solo' ? `<div class="round-finish"><p class="outcome-note" role="status">${points > 0 ? 'You spotted the truth!' : 'The next fact is your fresh chance.'}</p><button class="primary" type="button" data-action="advance" ${pending ? 'disabled' : ''}>${state.round === state.totalRounds ? 'See your score' : 'Next fact'}</button></div>` : `<div class="round-finish"><div>${roundWinner()}<p class="outcome-note ${state.activePlayMode === 'teams' ? (state.roundResult.teamWinnerIds.includes(state.players.find(player => player.id === state.you)?.teamId) ? 'won' : 'gentle-miss') : (state.roundResult.winners.some(player => player.id === state.you) ? 'won' : 'gentle-miss')}" role="status">${outcomeText()}</p></div>
      ${state.hostId === state.you ? `<div class="continue-actions"><button class="primary" type="button" data-action="advance" ${pending ? 'disabled' : ''}>${state.round === state.totalRounds ? 'See final scores' : 'Next round'}</button>${state.activeRoundMode === 'host' && state.round < state.totalRounds ? `<button class="secondary" type="button" data-action="finish" ${pending ? 'disabled' : ''}>Finish game</button>` : ''}</div>` : '<p class="muted small next-status">Waiting for the host to start the next round…</p>'}</div>`}`;
  }
  return `<div class="stage-head"><span class="progress-label">${state.kind === 'solo' ? 'SOLO · FACT' : 'ROUND'} ${state.round} / ${state.activeRoundMode === 'host' ? 'up to ' : ''}${state.totalRounds}</span><span class="pill">${escapeHtml(state.question.topic)}</span></div>
    <div class="stage-question"><div class="eyebrow">Which claim is real?</div><h2>Only one of these is oddly true.</h2></div>
    ${choiceList()}${bottom}`;
}

function factArt(question) {
  const subject = `${question.topic} ${question.id}`.toLowerCase();
  const theme = /saturn|mars|moon|star|planet|space|solar|galax|comet|cosmic|asteroid|neptune|uranus|mercury|jupiter|pluto|black.hole|pulsar|astron|venus|titan|io-/.test(subject) ? 'space'
    : /animal|bird|fish|frog|whale|octopus|mole|shrimp|spider|crab|beetle|penguin|toad|dolphin|ant-|bat-|lizard|platypus|seahorse|jellyfish/.test(subject) ? 'animal'
    : /history|ancient|invent|roman|viking|machine|archae|artifact|civilization|patent/.test(subject) ? 'history'
    : /food|taste|coffee|chocolate|honey|ketchup|fruit|body|brain|human|medicine|sugar|cheese|bread/.test(subject) ? 'food'
    : 'earth';
  const symbol = { space: '✦', animal: '🐾', history: '⌛', food: '✿', earth: '🌿' }[theme];
  return `<div class="fact-art fact-art-${theme}" role="img" aria-label="Illustration for ${escapeHtml(question.topic)}"><span class="fact-art-symbol" aria-hidden="true">${symbol}</span><span class="fact-art-topic" aria-hidden="true">${escapeHtml(question.topic)}</span></div>`;
}

function finished() {
  const result = state.finalResult;
  if (state.kind === 'solo') {
    const score = result.players.find(player => player.id === state.you)?.score ?? 0;
    return `<div class="eyebrow">Solo complete · ${result.roundsPlayed} facts</div><h2>Your final score</h2>
      <div class="winner solo-score"><span class="winner-icon" aria-hidden="true">✦</span><div><strong>${points(score)} points</strong><span>${score > 0 ? 'Nicely spotted. How many can you get next time?' : 'The facts were tricky. Give it another try!'}</span></div></div>
      <button class="primary" type="button" data-action="start" ${pending ? 'disabled' : ''}>Play Solo again</button>
      <button class="secondary home-button" type="button" data-action="home" ${pending ? 'disabled' : ''}>Choose another mode</button>`;
  }
  const teams = result.playMode === 'teams';
  const best = teams ? result.teams[0].score : result.players[0].score;
  const winners = (teams ? result.teams : result.players).filter(entry => entry.score === best);
  const winnerText = teams ? winners.map(team => escapeHtml(team.name)).join(' & ')
    : winners.map(identityInline).join(' <span aria-hidden="true">&amp;</span> ');
  const lone = result.players.filter(player => result.awards.loneGeniuses.includes(player.id));
  const isWinner = teams ? winners.some(team => team.members.includes(state.you)) : winners.some(player => player.id === state.you);
  return `<div class="eyebrow">Game over · ${result.roundsPlayed} ${result.roundsPlayed === 1 ? 'round' : 'rounds'}</div><h2>${teams ? 'Overall team' : 'Overall'} ${winners.length === 1 ? 'winner' : 'winners · tied'}</h2>
    <div class="winner"><span class="winner-icon" aria-hidden="true">🏆</span><div><strong>${winnerText}</strong><span>${points(best)} ${teams ? 'average points' : 'points'}</span></div></div>
    <p class="outcome-note ${isWinner ? 'won' : 'gentle-miss'}" role="status">${isWinner ? (teams ? 'Your team won the game!' : 'You won the game!') : result.players.some(player => player.id === state.you) ? 'Thanks for playing. A new game is one click away.' : 'You joined for the next game.'}</p>
    <section class="leaderboard" aria-label="Final leaderboard"><h3>Final leaderboard</h3>${teams ? teamLeaderboard(result.teams) : ''}<h4>${teams ? 'Individual scores' : 'Scores'}</h4>${leaderboardRows(result.players)}</section>
    <div class="awards">${lone.map(player => `<span class="award">🧠 Lone Genius · ${escapeHtml(player.name)}</span>`).join('')}${result.players.filter(player => result.awards.wildCards.includes(player.id)).map(player => `<span class="award">✦ Daring Guesser · ${escapeHtml(player.name)}</span>`).join('')}</div>
    ${state.hostId === state.you ? `${roundSettings()}${teamSettings()}<button class="primary" type="button" data-action="start" ${state.playMode === 'teams' && state.players.length < 4 || pending ? 'disabled' : ''}>Play again</button>` : '<p class="muted small">The host can start another game in this room.</p>'}
    <button class="secondary home-button" type="button" data-action="home" ${pending ? 'disabled' : ''}>Back to home</button>
    ${reactionButtons('Celebrate')}`;
}

function render() {
  app.classList.toggle('room-shell', Boolean(state));
  if (!state) { app.innerHTML = landing(); return; }
  const stage = state.phase === 'lobby' ? lobby() : state.phase === 'finished' ? finished() : questionStage();
  const side = state.kind === 'solo' ? '' : state.phase === 'reveal'
    ? `<aside class="reveal-side" aria-label="Round standings and reactions">${roundLeaderboard()}<section class="panel reaction-panel"><h3>React to this fact</h3><p class="muted small">Let the room know what you think.</p>${reactionButtons('React to the reveal')}</section>${connectionStatus ? `<p class="status-note">${escapeHtml(connectionStatus)}</p>` : ''}</aside>`
    : sidebar();
  app.innerHTML = `${topbar('The real fact is the weirdest one.')}${roomHeader()}<div class="game-grid ${state.kind === 'solo' ? 'solo-grid' : state.phase === 'reveal' ? 'reveal-grid' : ''}"><section class="panel stage" aria-live="polite">${stage}</section>${side}</div>`;
  updateTimer();
}

function updateTimer() {
  if (state?.phase === 'votes') {
    const countdown = document.querySelector('#reveal-countdown');
    if (countdown) countdown.textContent = String(Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000)));
    return;
  }
  if (state?.phase !== 'question') return;
  const remaining = Math.max(0, state.deadline - Date.now());
  const value = document.querySelector('#timer-value');
  const fill = document.querySelector('#timer-fill');
  if (value) value.textContent = `${Math.ceil(remaining / 1000)}s`;
  if (fill) fill.style.width = `${Math.min(100, remaining / 200)}%`;
}
setInterval(updateTimer, 100);

function showReaction(reaction) {
  const pop = document.createElement('div');
  pop.className = 'reaction-pop';
  pop.innerHTML = `${avatarArt(reaction.avatar, 'reaction-avatar-art')}<span>${escapeHtml(reaction.name)} ${escapeHtml(reaction.emoji)}</span>`;
  reactionTray.append(pop);
  setTimeout(() => pop.remove(), 2800);
}

function showOutcomeEffect(next) {
  if (next.kind === 'solo') return;
  if (next.phase !== 'reveal' && next.phase !== 'finished') return;
  const key = `${next.gameId}:${next.phase}:${next.round}`;
  if (key === lastEffectKey) return;
  lastEffectKey = key;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const teamMode = next.activePlayMode === 'teams';
  const won = next.phase === 'reveal'
    ? teamMode
      ? next.roundResult.teamWinnerIds.includes(next.players.find(player => player.id === next.you)?.teamId)
      : next.roundResult.winners.some(player => player.id === next.you)
    : teamMode
      ? next.finalResult.teams[0].members.includes(next.you) || next.finalResult.teams.filter(team => team.rank === 1).some(team => team.members.includes(next.you))
      : next.finalResult.players.some(player => player.rank === 1 && player.id === next.you);
  if (!won) {
    document.querySelector('.outcome-note')?.classList.add('settle');
    return;
  }
  const layer = document.createElement('div');
  layer.className = 'celebration';
  layer.setAttribute('aria-hidden', 'true');
  for (let index = 0; index < 22; index++) {
    const piece = document.createElement('span');
    piece.style.setProperty('--x', `${(index * 43 + 11) % 100}%`);
    piece.style.setProperty('--delay', `${(index % 7) * 0.07}s`);
    piece.style.setProperty('--drift', `${(index % 2 ? 1 : -1) * (24 + index * 3)}px`);
    piece.style.setProperty('--color', ['#a7e878', '#f9d37d', '#f4a4bd', '#a7c7fa'][index % 4]);
    layer.append(piece);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 1900);
}

function receive(next) {
  if (state?.code === next.code && next.revision != null && state.revision != null && next.revision <= state.revision) return;
  if (state && next.lastReaction && next.lastReaction.id !== state.lastReaction?.id) showReaction(next.lastReaction);
  if (next.phase === 'question' && next.question?.id !== lastQuestion) {
    wildCardSelected = false;
    lastQuestion = next.question?.id;
  }
  state = next;
  render();
  showOutcomeEffect(next);
}

async function request(path, body = null, token = null) {
  const response = await fetch(path, {
    method: body === null ? 'GET' : 'POST',
    headers: { ...(body !== null ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'X-Player-Token': token } : {}) },
    ...(body !== null ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error || 'Request failed.'); error.status = response.status; throw error; }
  return result;
}

function connect() {
  stream?.close();
  if (transport === 'poll') {
    let closed = false; let timer;
    const currentSeat = seat;
    stream = { close() { closed = true; clearTimeout(timer); } };
    const poll = async () => {
      if (closed) return;
      try {
        const next = await request(`/api/rooms/${currentSeat.code}/state?token=${encodeURIComponent(currentSeat.token)}`);
        if (closed) return;
        if (connectionStatus) { connectionStatus = ''; render(); }
        receive(next);
      } catch (error) {
        if (closed) return;
        if (error.status === 403 || error.status === 404) { resetHome(); notify(error.message); return; }
        if (!connectionStatus) { connectionStatus = 'Reconnecting to the room…'; render(); }
      }
      if (!closed) timer = setTimeout(poll, connectionStatus ? 2000 : 900);
    };
    poll();
    return;
  }
  stream = new EventSource(`/api/rooms/${seat.code}/events?token=${encodeURIComponent(seat.token)}`);
  stream.onmessage = event => receive(JSON.parse(event.data));
  stream.addEventListener('seat-left', () => resetHome());
  stream.onopen = () => { if (connectionStatus) { connectionStatus = ''; render(); } };
  stream.onerror = () => { if (seat) { connectionStatus = 'Reconnecting to the room…'; render(); } };
}

function resetHome() {
  stream?.close();
  stream = null;
  seat = null;
  state = null;
  pending = false;
  lastQuestion = null;
  lastEffectKey = '';
  connectionStatus = '';
  draftCode = '';
  landingMode = null;
  reactionTray.replaceChildren();
  sessionStorage.removeItem('oddly-true-seat');
  history.replaceState(null, '', '/oddly-true/');
  render();
}

async function leaveRoom() {
  if (pending || !seat) return;
  pending = true;
  render();
  try {
    await request(`/api/rooms/${seat.code}/leave`, {}, seat.token);
    resetHome();
  } catch (error) {
    if (/room not found|seat in this room was not found/i.test(error.message)) resetHome();
    else notify(error.message);
  } finally {
    pending = false;
    render();
  }
}

async function enterRoom(nextSeat, startSolo = false) {
  seat = nextSeat;
  sessionStorage.setItem('oddly-true-seat', JSON.stringify(seat));
  receive(startSolo ? await request(`/api/rooms/${seat.code}/start`, {}, seat.token) : await request(`/api/rooms/${seat.code}/state?token=${encodeURIComponent(seat.token)}`));
  history.replaceState(null, '', state.kind === 'solo' ? '/oddly-true/' : `/oddly-true/?room=${seat.code}`);
  connect();
}

async function action(name, body = {}) {
  if (pending) return;
  pending = true;
  render();
  try {
    const next = await request(`/api/rooms/${seat.code}/${name}`, body, seat.token);
    receive(next);
  } catch (error) { notify(error.message); }
  finally { pending = false; render(); }
}

app.addEventListener('input', event => {
  if (event.target.id === 'player-name') {
    draftName = event.target.value;
    if (identityMode === 'custom') {
      const selectionStart = event.target.selectionStart;
      const selectionEnd = event.target.selectionEnd;
      customVariation = 0;
      selectedAvatar = customCharacterForName(draftName, customVariation).avatar;
      render();
      const nameInput = app.querySelector('#player-name');
      nameInput?.focus({ preventScroll: true });
      nameInput?.setSelectionRange(selectionStart, selectionEnd);
      return;
    }
    const previewName = app.querySelector('.character-preview-copy strong');
    if (previewName) previewName.textContent = draftName.trim() || personaForAvatar(selectedAvatar).name;
  }
  if (event.target.id === 'room-input') draftCode = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

app.addEventListener('change', async event => {
  if (event.target.name === 'round-mode') await action('settings', { roundMode: event.target.value });
  if (event.target.name === 'play-mode') await action('settings', { playMode: event.target.value });
  if (event.target.id === 'round-count') {
    const count = Number(event.target.value);
    if (!Number.isInteger(count) || count < 1 || count > state.maxRounds) {
      notify(`Choose a whole number from 1 to ${state.maxRounds}.`);
      render();
    } else await action('settings', { roundMode: 'custom', roundCount: count });
  }
});

app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const kind = button.dataset.action;
  if (kind === 'choose-solo' || kind === 'choose-friends') {
    landingMode = kind === 'choose-solo' ? 'solo' : 'friends';
    render();
    return;
  }
  if (kind === 'home') {
    event.preventDefault();
    if (state.phase === 'lobby' || state.phase === 'finished') await leaveRoom();
    else notify('Finish the current game before leaving the room.');
    return;
  }
  if (kind === 'theme') {
    theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('oddly-true-theme', theme); } catch { /* keep the choice for this visit */ }
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#121b19' : '#f8f5f0';
    render();
    return;
  }
  if (kind === 'persona' || kind === 'random-persona') {
    const persona = kind === 'persona' ? personas[Number(button.dataset.persona)] : personas[Math.floor(Math.random() * personas.length)];
    identityMode = 'preset';
    customVariation = 0;
    draftName = persona.name;
    selectedAvatar = persona.avatar;
    render();
    const nextButton = kind === 'persona' ? app.querySelector(`[data-action="persona"][data-persona="${button.dataset.persona}"]`) : app.querySelector('[data-action="random-persona"]');
    nextButton?.focus({ preventScroll: true });
    playGreeting();
    return;
  }
  if (kind === 'custom-persona') {
    identityMode = 'custom';
    customVariation = 0;
    selectedAvatar = customCharacterForName(draftName, customVariation).avatar;
    render();
    app.querySelector('#player-name')?.focus({ preventScroll: true });
    return;
  }
  if (kind === 'reroll-custom') {
    customVariation += 1;
    selectedAvatar = customCharacterForName(draftName, customVariation).avatar;
    render();
    app.querySelector('[data-action="reroll-custom"]')?.focus({ preventScroll: true });
    return;
  }
  if (kind === 'create' || kind === 'join' || kind === 'create-solo') {
    if (!draftName.trim()) { notify('Add a name first.'); document.querySelector('#player-name')?.focus(); return; }
    if (kind === 'join' && draftCode.trim().length !== 5) { notify('Enter the 5-character room code.'); return; }
    pending = true; render();
    try {
      const path = kind === 'join' ? `/api/rooms/${draftCode.trim()}/join` : '/api/rooms';
      await enterRoom(await request(path, { name: draftName, avatar: selectedAvatar, ...(kind === 'create-solo' ? { kind: 'solo' } : {}) }), kind === 'create-solo');
    } catch (error) { notify(error.message); }
    finally { pending = false; render(); }
    return;
  }
  if (kind === 'copy-code' || kind === 'copy-link') {
    const copyingCode = kind === 'copy-code';
    const value = copyingCode ? state.code : `${location.origin}/oddly-true/?room=${state.code}`;
    try { await navigator.clipboard.writeText(value); notify(`${copyingCode ? 'Room code' : 'Invite link'} copied.`); }
    catch { window.prompt(`Copy this ${copyingCode ? 'room code' : 'invite link'}:`, value); }
    return;
  }
  if (kind === 'wild') { wildCardSelected = !wildCardSelected; render(); return; }
  if (kind === 'swap') {
    await action('swap', { firstId: document.querySelector('#team-a-swap')?.value, secondId: document.querySelector('#team-b-swap')?.value });
    return;
  }
  if (kind === 'answer') { await action('answer', { choice: Number(button.dataset.choice), wildCard: wildCardSelected }); return; }
  if (kind === 'react') { await action('react', { emoji: button.dataset.emoji }); return; }
  if (kind === 'start' || kind === 'advance' || kind === 'finish') await action(kind);
});

async function initialize() {
  try { transport = (await request('/api/config')).transport === 'poll' ? 'poll' : 'events'; } catch { /* local servers use live events */ }
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem('oddly-true-seat')); } catch { /* ignore */ }
  if (saved?.code && saved?.token && (!draftCode || draftCode === saved.code)) {
    try { await enterRoom(saved); return; }
    catch { sessionStorage.removeItem('oddly-true-seat'); seat = null; }
  }
  render();
}
initialize();
