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
let theme = 'light';
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
let soloLength = 'five';
let soloCustomRounds = 5;
let soloAutoNext = false;
try { soloAutoNext = localStorage.getItem('oddly-true-solo-auto-next') === 'on'; } catch { /* use this visit's setting */ }
const SOLO_REVEAL_MS = 15000;
let soloAutoKey = null;
let soloAutoRemaining = SOLO_REVEAL_MS;
let soloAutoDeadline = 0;
let soloAutoPaused = false;
let connectionStatus = '';
let toastTimer;
let lastEffectKey = '';
let welcomeTimer;
let soundEnabled = true;
let musicEnabled = true;
let audioContext;
let masterVolume;
let musicVolume;
let musicTimer;
let musicSession = 0;
let musicStarting = false;
const musicVoices = new Set();

function ensureAudioContext() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    if (!audioContext) {
      audioContext = new Audio();
      masterVolume = audioContext.createGain();
      masterVolume.gain.value = 0.45;
      masterVolume.connect(audioContext.destination);
    }
    return audioContext;
  } catch { return null; }
}

async function audioReady() {
  try {
    const context = ensureAudioContext();
    if (!context) return null;
    if (audioContext.state === 'suspended') await audioContext.resume();
    return audioContext.state === 'running' ? audioContext : null;
  } catch { return null; }
}

async function playSound(cue) {
  if (!soundEnabled) return;
  const context = await audioReady();
  if (!context || !soundEnabled) return;
  // Original short Web Audio cues.
  const notes = {
    welcome: [[523, 0, .10], [659, .10, .15]],
    question: [[392, 0, .09], [523, .09, .12]],
    lock: [[660, 0, .07]],
    correct: [[523, 0, .11], [659, .10, .11], [784, .20, .22]],
    wrong: [[440, 0, .14], [349, .14, .20]],
    steady: [[440, 0, .11], [523, .12, .18]],
    softLanding: [[392, 0, .12], [330, .14, .22]],
    celebrate: [[523, 0, .10], [659, .11, .10], [784, .22, .11], [1047, .34, .36]]
  }[cue] ?? [];
  for (const [frequency, offset, duration] of notes) {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = context.currentTime + offset;
    oscillator.type = cue === 'wrong' || cue === 'softLanding' ? 'sine' : 'triangle';
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(cue === 'wrong' || cue === 'softLanding' ? .10 : .16, start + .018);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope).connect(masterVolume);
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
  }
}

function stopMusic() {
  musicSession++;
  musicStarting = false;
  clearInterval(musicTimer);
  musicTimer = null;
  for (const voice of musicVoices) {
    try { voice.stop(); } catch { /* the note may have ended already */ }
  }
  musicVoices.clear();
}

async function startMusic(fromGesture = false) {
  if (!musicEnabled || state || musicTimer || musicStarting) return;
  const context = ensureAudioContext();
  if (!context || (context.state !== 'running' && !fromGesture)) return;
  const session = musicSession;
  musicStarting = true;
  try {
    if (context.state === 'suspended') await context.resume();
    if (context.state !== 'running' || session !== musicSession || !musicEnabled || state) return;
    if (!musicVolume) {
      musicVolume = context.createGain();
      musicVolume.gain.value = .13; // Softer than the answer cues.
      musicVolume.connect(context.destination);
    }
    const note = (frequency, start, duration, level, type = 'triangle') => {
      const voice = context.createOscillator();
      const envelope = context.createGain();
      voice.type = type;
      voice.frequency.value = frequency;
      envelope.gain.setValueAtTime(.0001, start);
      envelope.gain.linearRampToValueAtTime(level, start + Math.min(.06, duration / 3));
      envelope.gain.setValueAtTime(level * .72, start + duration - .09);
      envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
      voice.connect(envelope).connect(musicVolume);
      musicVoices.add(voice);
      voice.onended = () => musicVoices.delete(voice);
      voice.start(start);
      voice.stop(start + duration + .01);
    };
    // Original eight-second phrase. The bass crosses each bar boundary,
    // while the plucked melody adds the playful, slightly odd bounce.
    const melody = [523, 659, 784, 659, 587, 698, 523, 392, 523, 659, 880, 784, 698, 587, 659, 523];
    const bass = [131, 165, 147, 196];
    const scheduleBar = start => {
      bass.forEach((frequency, step) => note(frequency, start + step * 2, 2.08, .10, 'sine'));
      melody.forEach((frequency, step) => note(frequency, start + step * .5 + .08, step % 4 === 3 ? .39 : .27, .11));
    };
    let nextBar = context.currentTime + .06;
    const scheduleAhead = () => {
      if (session !== musicSession || !musicEnabled || state) return;
      if (nextBar < context.currentTime - .2) nextBar = context.currentTime + .06;
      while (nextBar < context.currentTime + 8.2) {
        scheduleBar(nextBar);
        nextBar += 8;
      }
    };
    scheduleAhead();
    musicTimer = setInterval(scheduleAhead, 250);
    updateMusicButton();
  } catch { /* The browser may wait for another interaction to allow audio. */ }
  finally { if (session === musicSession) musicStarting = false; }
}

window.addEventListener('pagehide', stopMusic);
// A browser may suspend Web Audio until its first user gesture.
for (const gesture of ['pointerdown', 'keydown']) {
  document.addEventListener(gesture, event => {
    if (musicEnabled && !state && !event.target.closest?.('[data-action="music"]')) void startMusic(true);
  }, { capture: true });
}

function soloScoreFeedback(result, playerId) {
  const score = result.players.find(player => player.id === playerId)?.score ?? 0;
  // Ten points per played fact is the baseline. A Wild Card can lift the score above 100%.
  const percent = score / Math.max(1, result.roundsPlayed * 10) * 100;
  if (percent >= 70) return { cue: 'celebrate', message: 'Brilliant run! You spotted so many truths.' };
  if (percent <= 20) return { cue: 'softLanding', message: 'Those facts were tricky. Take a breath and try another set!' };
  return { cue: 'steady', message: 'Nice work! A few more truths are waiting for you.' };
}

function soundForTransition(previous, next) {
  if (!previous || previous.code !== next.code) return;
  const answerLocked = !previous.myAnswer && next.myAnswer && previous.round === next.round;
  if (answerLocked) void playSound('lock');
  if (next.phase === 'question' && (previous.phase !== 'question' || previous.round !== next.round || previous.gameId !== next.gameId)) {
    void playSound('question');
  } else if (next.phase === 'reveal' && (previous.phase !== 'reveal' || previous.round !== next.round)) {
    const cue = next.myAnswer?.choice === next.question.correct ? 'correct' : 'wrong';
    if (answerLocked) setTimeout(() => { void playSound(cue); }, 140);
    else void playSound(cue);
  } else if (next.phase === 'finished' && previous.phase !== 'finished') {
    if (next.kind === 'solo') { void playSound(soloScoreFeedback(next.finalResult, next.you).cue); return; }
    const result = next.finalResult;
    const won = result.playMode === 'teams'
      ? result.teams.some(team => team.rank === 1 && team.members.includes(next.you))
      : result.players.some(player => player.rank === 1 && player.id === next.you);
    if (won) void playSound('celebrate');
  }
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function notify(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
    toast.textContent = '';
  }, 3500);
}

function clearToast() {
  clearTimeout(toastTimer);
  toast.classList.remove('visible');
  toast.textContent = '';
}

function welcome(message, avatar = selectedAvatar) {
  document.querySelector('.welcome-overlay')?.remove();
  clearTimeout(welcomeTimer);
  const card = document.createElement('div');
  card.className = 'welcome-overlay';
  card.setAttribute('role', 'status');
  card.innerHTML = `<span class="welcome-figure" aria-hidden="true">${avatarArt(avatar, 'welcome-avatar')}</span><span class="welcome-bubble">${escapeHtml(message)}</span>`;
  document.body.append(card);
  welcomeTimer = setTimeout(() => card.remove(), 3300);
}

function topbar(note = 'The real fact is the weirdest one.', isLanding = false) {
  const musicWaiting = musicEnabled && !musicTimer;
  return `<header class="topbar${isLanding ? ' landing-topbar' : ''}"><a class="brand" href="/oddly-true/" ${state ? 'data-action="home"' : ''}><span class="brand-mark" aria-hidden="true">?</span> Oddly True</a><div class="topbar-right"><span class="top-note">${escapeHtml(note)}</span><button type="button" class="theme-toggle sound-toggle" data-action="sound" aria-label="Turn sound effects ${soundEnabled ? 'off' : 'on'}" aria-pressed="${soundEnabled}">${soundEnabled ? '♫ Sound on' : '♫ Sound off'}</button>${isLanding ? `<button type="button" class="theme-toggle music-button" data-action="music" aria-pressed="${musicEnabled}" aria-label="${musicWaiting ? 'Play background music' : `Turn background music ${musicEnabled ? 'off' : 'on'}`}">${musicWaiting ? '♪ Play music' : musicEnabled ? '♪ Music on' : '♪ Music off'}</button>` : ''}<button type="button" class="theme-toggle" data-action="theme" aria-label="Switch to ${theme === 'dark' ? 'light' : 'dark'} mode">${theme === 'dark' ? '☀ Light' : '☾ Dark'}</button></div></header>`;
}

function updateMusicButton() {
  const button = app.querySelector('[data-action="music"]');
  if (!button) return;
  button.textContent = '♪ Music on';
  button.setAttribute('aria-label', 'Turn background music off');
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
  const featured = [0, 1, 2, 3, 4, 5];
  const selectedIndex = personas.findIndex(persona => persona.avatar === selectedAvatar);
  if (identityMode === 'preset' && selectedIndex >= featured.length) featured[5] = selectedIndex;
  const more = personas.map((_, index) => index).filter(index => !featured.includes(index));
  const personaButton = index => {
    const persona = personas[index];
    return `<button type="button" class="persona-option" data-action="persona" data-persona="${index}" aria-pressed="${identityMode === 'preset' && persona.avatar === selectedAvatar}"><span class="persona-avatar" aria-hidden="true">${avatarArt(persona.avatar, 'persona-art')}</span><span class="persona-name">${escapeHtml(persona.name)}</span></button>`;
  };
  return `${topbar('The real fact is the weirdest one.', true)}
    <div class="landing">
      <section class="landing-copy">
        <div class="eyebrow">Play with friends or go Solo</div>
        <h1>Sounds fake.<br><em>Oddly true.</em></h1>
        <p>Three bizarre claims. Only one actually happened. Trust your gut, bring your people if you like, and prepare to be confidently wrong.</p>
        <section class="rules-details" aria-labelledby="how-to-play"><h2 id="how-to-play">How to play</h2><ol><li>Three bizarre claims. Pick the one that’s true.</li><li>A correct answer earns 10 points. A wrong answer or timeout earns 0.</li><li>Go Solo or play live with 2 to 8 friends. With friends, the highest score wins; ties share the win.</li></ol><p class="wild-card-note"><span aria-hidden="true">✦</span> <strong>Wild Card:</strong> Once per game, earn 20 points if right or lose 5 points if wrong.</p></section>
        <div class="rule-line"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 19v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 2 4v1"/></svg>Solo or friends</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>20 seconds</span><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h10v8a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4m-4 4v3m-4 2h8"/></svg>10 points for a correct pick</span></div>
      </section>
      <section class="panel setup-panel" aria-label="Choose a game and identity">
        <h2>How do you want to play?</h2>
        <div class="play-paths" role="group" aria-label="Choose how to play">
          <button class="${landingMode === 'friends' ? 'primary' : 'secondary'}" type="button" data-action="choose-friends" aria-pressed="${landingMode === 'friends'}">Play with Friends <small>2 to 8 players, live on separate devices</small></button>
          <button class="${landingMode === 'solo' ? 'primary' : 'secondary'}" type="button" data-action="choose-solo" aria-pressed="${landingMode === 'solo'}">Play Solo <small>Just you, at your pace</small></button>
        </div>
        <p class="entry-note">No login. Pick a name and character. Play right away.</p>
        ${landingMode === 'solo' ? `<div class="solo-length" role="group" aria-label="Solo game length"><span class="field">How many Solo facts?</span><div class="solo-length-options">
          <button type="button" class="solo-length-choice" data-action="solo-length" data-length="five" aria-pressed="${soloLength === 'five'}">Quick · 5</button>
          <button type="button" class="solo-length-choice" data-action="solo-length" data-length="ten" aria-pressed="${soloLength === 'ten'}">Full · 10</button>
          <button type="button" class="solo-length-choice" data-action="solo-length" data-length="custom" aria-pressed="${soloLength === 'custom'}">Custom</button></div>
          ${soloLength === 'custom' ? `<label class="field" for="solo-round-count">Choose 1–10 facts</label><input id="solo-round-count" class="text-input number-input" type="number" min="1" max="10" step="1" inputmode="numeric" value="${soloCustomRounds}">` : ''}
          <button class="solo-auto-choice" type="button" data-action="solo-auto-choice" aria-pressed="${soloAutoNext}"><strong>Auto next ${soloAutoNext ? 'on' : 'off'}</strong><span>Optional · 15 seconds to read each reveal, with Pause and Next now.</span></button>
          <p class="muted small">You can finish early after any fact is revealed.</p></div>` : ''}
        <h3 class="identity-title">Pick your identity</h3>
        <label class="field" for="player-name">Your name</label>
        <input id="player-name" class="text-input" maxlength="24" autocomplete="nickname" placeholder="Professor Pigeon" value="${escapeHtml(draftName)}">
        <div class="preset-heading"><span class="field">Choose a character</span><button type="button" class="text-button" data-action="random-persona">Surprise me</button></div>
        <div class="persona-grid" role="group" aria-label="Featured characters">${featured.map(personaButton).join('')}</div>
        <details class="more-personas"><summary>See ${more.length} more characters</summary><div class="persona-grid" role="group" aria-label="More characters">${more.map(personaButton).join('')}</div></details>
        <button type="button" class="custom-persona-option" data-action="custom-persona" aria-pressed="${identityMode === 'custom'}"><span class="custom-persona-art" aria-hidden="true">${avatarArt(customCharacter.avatar, 'persona-art')}</span><span><strong>Create your own</strong><small>Type any name and we’ll match an illustrated character.</small></span><span class="custom-arrow" aria-hidden="true">→</span></button>
        <div class="form-row">
          ${characterPreview()}
          <p class="identity-hint">${identityMode === 'custom' ? 'Try an animal or a theme: Jellyfish Queen, Trust (dog), or Sky (pigeon). We match familiar words; other names get a repeatable surprise. You can always try another character.' : 'Choose a preset to fill in its linked name, or select Create your own for a custom match.'}</p>
        </div>
        ${landingMode === 'solo' ? `<button class="primary full" type="button" data-action="create-solo" ${pending ? 'disabled' : ''}>Start ${soloLength === 'five' ? '5' : soloLength === 'ten' ? '10' : soloCustomRounds}-fact Solo game</button>` : ''}
        ${landingMode === 'friends' ? `<div class="friends-actions"><button class="primary full" type="button" data-action="create" ${pending ? 'disabled' : ''}>Create a room</button>
          <div class="divider">or join your friends</div>
          <label class="field" for="room-input">Room code</label>
          <div class="join-row"><input id="room-input" class="text-input" maxlength="5" autocapitalize="characters" autocomplete="off" placeholder="ABCDE" value="${escapeHtml(draftCode)}"><button class="secondary" type="button" data-action="join" ${pending ? 'disabled' : ''}>Join room</button></div></div>` : ''}
      </section>
    </div><footer class="site-footer"><span><strong>Oddly True</strong> · Strange facts, good company.</span><span><a href="#how-to-play">How to play</a> · Sources and image credits appear after each fact.</span></footer>`;
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
  <p class="muted small">${state.roundMode === 'host' ? 'After each reveal, the host can continue or finish. Up to 10 rounds.' : 'One fact per round. The host can finish early after a reveal.'}</p></fieldset>`;
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
  const me = state.myAnswer;
  const gotIt = me?.choice === state.question.correct;
  const nextChance = state.round === state.totalRounds ? 'Final scores are next.' : 'The next fact is a fresh chance.';
  if (state.activePlayMode === 'teams') {
    const winners = state.roundResult.teamWinnerIds;
    if (!winners.length) return gotIt ? 'You found the truth. Neither team earned a positive average this round.' : `Neither team took this round. ${nextChance}`;
    return winners.includes(state.players.find(player => player.id === state.you)?.teamId)
      ? (winners.length > 1 ? 'Your team tied for the round! Your points are shown above.' : 'Your team took the round! Your points are shown above.')
      : gotIt ? 'You found the truth, even though the other team took the round.' : `The other team took this one. ${nextChance}`;
  }
  if (!state.roundResult.winners.length) return state.round === state.totalRounds ? 'That fact fooled everyone. Final scores are next.' : 'That fact fooled everyone. Ready for the next one?';
  return state.roundResult.winners.some(player => player.id === state.you)
    ? state.roundResult.winners.length > 1 ? 'You tied for the round! Nicely spotted.' : 'You took the round! Nicely spotted.'
    : gotIt ? 'You got it right! A Wild Card took the round.' : `This one got you. ${nextChance}`;
}

function soloRevealActions(points) {
  const auto = soloAutoNext ? `<div class="solo-auto-status"><span id="solo-auto-countdown">${soloAutoPaused ? 'Paused' : 'Next in 15s'}</span><button class="text-button" type="button" data-action="solo-auto-pause" ${pending ? 'disabled' : ''}>${soloAutoPaused ? 'Resume' : 'Pause'}</button></div>` : '';
  return `<div class="round-finish"><p class="outcome-note ${points > 0 ? 'won' : 'gentle-miss'}" role="status">${points > 0 ? 'Nice catch! You spotted the truth.' : state.round === state.totalRounds ? 'This one was sneaky. See how you did.' : 'This one was sneaky. The next fact is a fresh chance.'}</p>${auto}<div class="continue-actions"><button class="primary" type="button" data-action="advance" ${pending ? 'disabled' : ''}>${state.round === state.totalRounds ? (soloAutoNext ? 'See score now' : 'See your score') : (soloAutoNext ? 'Next now' : 'Next fact')}</button>${state.round < state.totalRounds ? `<button class="secondary" type="button" data-action="finish" ${pending ? 'disabled' : ''}>Finish early</button>` : ''}</div></div>`;
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
      ${state.kind === 'solo' ? soloRevealActions(points) : `<div class="round-finish"><div>${roundWinner()}<p class="outcome-note ${state.activePlayMode === 'teams' ? (state.roundResult.teamWinnerIds.includes(state.players.find(player => player.id === state.you)?.teamId) ? 'won' : 'gentle-miss') : (state.roundResult.winners.some(player => player.id === state.you) ? 'won' : 'gentle-miss')}" role="status">${outcomeText()}</p></div>
      ${state.hostId === state.you ? `<div class="continue-actions"><button class="primary" type="button" data-action="advance" ${pending ? 'disabled' : ''}>${state.round === state.totalRounds ? 'See final scores' : 'Next round'}</button>${state.round < state.totalRounds ? `<button class="secondary" type="button" data-action="finish" ${pending ? 'disabled' : ''}>Finish early</button>` : ''}</div>` : `<p class="muted small next-status">${state.round === state.totalRounds ? 'Waiting for the host to show final scores…' : 'Waiting for the host to start the next round…'}</p>`}</div>`}`;
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
    return `<div class="eyebrow">Solo complete · ${result.roundsPlayed} ${result.roundsPlayed === 1 ? 'fact' : 'facts'}</div><h2>Your final score</h2>
      <div class="winner solo-score"><span class="winner-icon" aria-hidden="true">✦</span><div><strong>${points(score)} points</strong><span>${soloScoreFeedback(result, state.you).message}</span></div></div>
      <p class="muted small">${state.factsAvailable ? `Want to keep your score going? Continue with ${Math.min(5, state.factsAvailable)} new ${state.factsAvailable === 1 ? 'fact' : 'facts'}.` : 'You have seen every fact in this session. Start fresh to play again.'}</p>
      <div class="solo-result-actions ${state.factsAvailable ? '' : 'solo-result-actions-two'}">${state.factsAvailable ? `<button class="primary" type="button" data-action="extend" ${pending ? 'disabled' : ''}>Keep playing · ${Math.min(5, state.factsAvailable)} more</button>` : ''}<button class="${state.factsAvailable ? 'secondary' : 'primary'}" type="button" data-action="start" ${pending ? 'disabled' : ''}>Play Solo again</button><button class="secondary" type="button" data-action="home" ${pending ? 'disabled' : ''}>Choose another mode</button></div>`;
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
    <p class="outcome-note ${isWinner ? 'won' : 'gentle-miss'}" role="status">${isWinner ? winners.length > 1 ? (teams ? 'Congratulations! Your team tied for first place!' : 'Congratulations! You tied for first place!') : (teams ? 'Congratulations! Your team won the game!' : 'Congratulations! You won the game!') : result.players.some(player => player.id === state.you) ? 'Well played! This one went to the winner above. Ready for a rematch?' : 'You joined for the next game.'}</p>
    <section class="leaderboard" aria-label="Final leaderboard"><h3>Final leaderboard</h3>${teams ? teamLeaderboard(result.teams) : ''}<h4>${teams ? 'Individual scores' : 'Scores'}</h4>${leaderboardRows(result.players)}</section>
    <div class="awards">${lone.map(player => `<span class="award">🧠 Lone Genius · ${escapeHtml(player.name)}</span>`).join('')}${result.players.filter(player => result.awards.wildCards.includes(player.id)).map(player => `<span class="award">✦ Daring Guesser · ${escapeHtml(player.name)}</span>`).join('')}</div>
    ${state.hostId === state.you ? `${state.factsAvailable ? `<p class="muted small">Keep the scores and play ${Math.min(5, state.factsAvailable)} new ${state.factsAvailable === 1 ? 'round' : 'rounds'} with this group.</p><button class="primary" type="button" data-action="extend" ${pending ? 'disabled' : ''}>Keep playing · ${Math.min(5, state.factsAvailable)} more</button>` : '<p class="muted small">You have seen every fact in this session. Start a new game to play again.</p>'}${roundSettings()}${teamSettings()}<button class="secondary" type="button" data-action="start" ${state.playMode === 'teams' && state.players.length < 4 || pending ? 'disabled' : ''}>Play again from zero</button>` : '<p class="muted small">The host can continue with more rounds or start a new game.</p>'}
    <button class="secondary home-button" type="button" data-action="home" ${pending ? 'disabled' : ''}>Back to home</button>
    ${reactionButtons('Celebrate')}`;
}

function syncSoloAutoTimer() {
  if (!soloAutoNext || state?.kind !== 'solo' || state.phase !== 'reveal') {
    soloAutoKey = null;
    return;
  }
  const key = `${state.gameId}:${state.round}`;
  if (soloAutoKey === key) return;
  soloAutoKey = key;
  soloAutoRemaining = SOLO_REVEAL_MS;
  soloAutoPaused = document.hidden;
  soloAutoDeadline = Date.now() + soloAutoRemaining;
}

function pauseSoloAutoTimer() {
  if (!soloAutoKey || soloAutoPaused) return;
  soloAutoRemaining = Math.max(0, soloAutoDeadline - Date.now());
  soloAutoPaused = true;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && soloAutoKey && !soloAutoPaused) {
    pauseSoloAutoTimer();
    render();
  }
});

function render() {
  syncSoloAutoTimer();
  app.classList.toggle('room-shell', Boolean(state));
  if (!state) { app.innerHTML = landing(); if (musicEnabled) void startMusic(); return; }
  stopMusic();
  const stage = state.phase === 'lobby' ? lobby() : state.phase === 'finished' ? finished() : questionStage();
  const side = state.kind === 'solo' ? '' : state.phase === 'reveal'
    ? `<aside class="reveal-side" aria-label="Round standings and reactions">${roundLeaderboard()}<section class="panel reaction-panel"><h3>React to this fact</h3><p class="muted small">Let the room know what you think.</p>${reactionButtons('React to the reveal')}</section>${connectionStatus ? `<p class="status-note">${escapeHtml(connectionStatus)}</p>` : ''}</aside>`
    : sidebar();
  app.innerHTML = `${topbar('The real fact is the weirdest one.')}${roomHeader()}<div class="game-grid ${state.kind === 'solo' ? 'solo-grid' : state.phase === 'reveal' ? 'reveal-grid' : ''}"><section class="panel stage" aria-live="polite">${stage}</section>${side}</div>`;
  updateTimer();
}

function updateTimer() {
  if (state?.kind === 'solo' && state.phase === 'reveal' && soloAutoNext) {
    const remaining = soloAutoPaused ? soloAutoRemaining : Math.max(0, soloAutoDeadline - Date.now());
    const countdown = document.querySelector('#solo-auto-countdown');
    if (countdown) countdown.textContent = `${soloAutoPaused ? 'Paused · ' : state.round === state.totalRounds ? 'Score in ' : 'Next fact in '}${Math.ceil(remaining / 1000)}s`;
    if (!soloAutoPaused && remaining <= 0 && !pending && !document.hidden) {
      soloAutoRemaining = 0;
      soloAutoPaused = true;
      void action('advance');
    }
    return;
  }
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
  const previous = state;
  if (state && next.lastReaction && next.lastReaction.id !== state.lastReaction?.id) showReaction(next.lastReaction);
  if (next.phase === 'question' && next.question?.id !== lastQuestion) {
    wildCardSelected = false;
    lastQuestion = next.question?.id;
  }
  state = next;
  render();
  showOutcomeEffect(next);
  soundForTransition(previous, next);
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
  if (event.target.id === 'solo-round-count') soloCustomRounds = Number(event.target.value);
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
  if (event.target.id === 'solo-round-count' && (!Number.isInteger(soloCustomRounds) || soloCustomRounds < 1 || soloCustomRounds > 10)) {
    notify('Choose a whole number from 1 to 10.');
  }
});

app.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const kind = button.dataset.action;
  if (kind === 'sound') {
    soundEnabled = !soundEnabled;
    if (masterVolume) masterVolume.gain.value = soundEnabled ? .45 : 0;
    if (soundEnabled) void playSound('welcome');
    render();
    return;
  }
  if (kind === 'music') {
    if (musicEnabled && !musicTimer) {
      void startMusic(true);
      return;
    }
    musicEnabled = !musicEnabled;
    if (!musicEnabled) stopMusic();
    render();
    if (musicEnabled) void startMusic(true);
    return;
  }
  void audioReady();
  if (kind === 'choose-solo' || kind === 'choose-friends') {
    landingMode = kind === 'choose-solo' ? 'solo' : 'friends';
    render();
    return;
  }
  if (kind === 'solo-length') { soloLength = button.dataset.length; render(); return; }
  if (kind === 'solo-auto-choice') {
    soloAutoNext = !soloAutoNext;
    try { localStorage.setItem('oddly-true-solo-auto-next', soloAutoNext ? 'on' : 'off'); } catch { /* keep this visit's setting */ }
    render();
    return;
  }
  if (kind === 'solo-auto-pause') {
    if (soloAutoPaused) {
      soloAutoPaused = false;
      soloAutoDeadline = Date.now() + soloAutoRemaining;
    } else pauseSoloAutoTimer();
    render();
    return;
  }
  if (kind === 'home') {
    event.preventDefault();
    if (state.kind === 'solo' || state.phase === 'lobby' || state.phase === 'finished') await leaveRoom();
    else notify('Finish the current game before leaving the room.');
    return;
  }
  if (kind === 'theme') {
    theme = theme === 'dark' ? 'light' : 'dark';
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
    if (kind === 'create-solo' && soloLength === 'custom' && (!Number.isInteger(soloCustomRounds) || soloCustomRounds < 1 || soloCustomRounds > 10)) { notify('Choose a whole number from 1 to 10.'); return; }
    pending = true; render();
    try {
      const path = kind === 'join' ? `/api/rooms/${draftCode.trim()}/join` : '/api/rooms';
      await enterRoom(await request(path, { name: draftName, avatar: selectedAvatar, ...(kind === 'create-solo' ? { kind: 'solo', roundMode: soloLength === 'ten' ? 'ten' : 'custom', roundCount: soloLength === 'custom' ? soloCustomRounds : 5 } : {}) }), kind === 'create-solo');
      clearToast();
      const me = state.players.find(player => player.id === state.you);
      welcome(`Welcome, ${me.name}!`, me.avatar);
      void playSound(kind === 'create-solo' ? 'question' : 'welcome');
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
  if (kind === 'start' || kind === 'advance' || kind === 'finish' || kind === 'extend') await action(kind);
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
  welcome('Welcome to Oddly True!');
}
initialize();
