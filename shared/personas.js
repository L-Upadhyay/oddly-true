// Preset identities have linked names and one-time greetings.
// Custom identities use the same locally bundled Fluent Emoji artwork without a scripted greeting.
const art = asset => `/assets/characters/${asset}.svg`;

export const PERSONAS = [
  { name: 'Doctor Pigeon', label: 'Pigeon', avatar: '🐦', asset: 'pigeon', keywords: ['pigeon', 'bird'], greeting: 'Coo there, curious human!', motion: 'tilt' },
  { name: 'Lucky Lion', label: 'Lion', avatar: '🦁', asset: 'lion', keywords: ['lion'], greeting: 'Roar you doing?', motion: 'roar' },
  { name: 'Captain Fox', label: 'Fox', avatar: '🦊', asset: 'fox', keywords: ['fox'], greeting: 'Foxy to meet you!', motion: 'tilt' },
  { name: 'Cosmic Frog', label: 'Frog', avatar: '🐸', asset: 'frog', keywords: ['frog', 'toad'], greeting: 'Toad-ally cosmic!', motion: 'hop' },
  { name: 'Professor Octopus', label: 'Octopus', avatar: '🐙', asset: 'octopus', keywords: ['octopus'], greeting: 'Need a hand? Got eight!', motion: 'wiggle' },
  { name: 'Disco Ghost', label: 'Ghost', avatar: '👻', asset: 'ghost', keywords: ['ghost'], greeting: 'Boo-gie with me!', motion: 'float' },
  { name: 'Mysterious Owl', label: 'Owl', avatar: '🦉', asset: 'owl', keywords: ['owl'], greeting: 'Owl be seeing you!', motion: 'tilt' },
  { name: 'Detective Robot', label: 'Robot', avatar: '🤖', asset: 'robot', keywords: ['robot', 'bot'], greeting: 'I detect a new friend!', motion: 'scan' },
  { name: 'Dinner Dino', label: 'Dinosaur', avatar: '🦖', asset: 't-rex', keywords: ['dinosaur', 'dino', 't rex'], greeting: 'Dino-mite to meet you!', motion: 'stomp' },
  { name: 'Buzzy Bee', label: 'Bee', avatar: '🐝', asset: 'honeybee', keywords: ['bee', 'honeybee'], greeting: 'What’s the buzz, bud?', motion: 'buzz' },
  { name: 'Social Butterfly', label: 'Butterfly', avatar: '🦋', asset: 'butterfly', keywords: ['butterfly'], greeting: 'Let’s wing it together!', motion: 'flutter' },
  { name: 'Stellar Alien', label: 'Alien', avatar: '👽', asset: 'alien', keywords: ['alien'], greeting: 'Take me to your snacks!', motion: 'float' },
  { name: 'Glitter Unicorn', label: 'Unicorn', avatar: '🦄', asset: 'unicorn', keywords: ['unicorn'], greeting: 'Neigh-hello, sparkle pal!', motion: 'prance' },
  { name: 'Party Penguin', label: 'Penguin', avatar: '🐧', asset: 'penguin', keywords: ['penguin'], greeting: 'Let’s break the ice!', motion: 'waddle' }
].map(persona => ({ ...persona, art: art(persona.asset), preset: true }));

export const CUSTOM_CHARACTERS = [
  { label: 'Jellyfish', avatar: '🪼', asset: 'jellyfish', keywords: ['jellyfish', 'jelly'] },
  { label: 'Cat', avatar: '🐱', asset: 'cat-face', keywords: ['cat', 'kitten', 'kitty', 'feline'] },
  { label: 'Dog', avatar: '🐶', asset: 'dog-face', keywords: ['dog', 'puppy', 'pup', 'canine'] },
  { label: 'Rabbit', avatar: '🐰', asset: 'rabbit-face', keywords: ['rabbit', 'bunny', 'hare'] },
  { label: 'Panda', avatar: '🐼', asset: 'panda', keywords: ['panda'] },
  { label: 'Koala', avatar: '🐨', asset: 'koala', keywords: ['koala'] },
  { label: 'Monkey', avatar: '🐵', asset: 'monkey-face', keywords: ['monkey', 'ape'] },
  { label: 'Turtle', avatar: '🐢', asset: 'turtle', keywords: ['turtle', 'tortoise'] },
  { label: 'Snail', avatar: '🐌', asset: 'snail', keywords: ['snail'] },
  { label: 'Whale', avatar: '🐳', asset: 'spouting-whale', keywords: ['whale'] },
  { label: 'Dolphin', avatar: '🐬', asset: 'dolphin', keywords: ['dolphin'] },
  { label: 'Crab', avatar: '🦀', asset: 'crab', keywords: ['crab'] },
  { label: 'Lobster', avatar: '🦞', asset: 'lobster', keywords: ['lobster'] },
  { label: 'Shark', avatar: '🦈', asset: 'shark', keywords: ['shark'] },
  { label: 'Parrot', avatar: '🦜', asset: 'parrot', keywords: ['parrot'] },
  { label: 'Peacock', avatar: '🦚', asset: 'peacock', keywords: ['peacock'] },
  { label: 'Flamingo', avatar: '🦩', asset: 'flamingo', keywords: ['flamingo'] },
  { label: 'Dragon', avatar: '🐉', asset: 'dragon', keywords: ['dragon'] },
  { label: 'Hedgehog', avatar: '🦔', asset: 'hedgehog', keywords: ['hedgehog'] },
  { label: 'Raccoon', avatar: '🦝', asset: 'raccoon', keywords: ['raccoon'] },
  { label: 'Sloth', avatar: '🦥', asset: 'sloth', keywords: ['sloth'] },
  { label: 'Otter', avatar: '🦦', asset: 'otter', keywords: ['otter'] },
  { label: 'Seal', avatar: '🦭', asset: 'seal', keywords: ['seal'] },
  { label: 'Giraffe', avatar: '🦒', asset: 'giraffe', keywords: ['giraffe'] },
  { label: 'Elephant', avatar: '🐘', asset: 'elephant', keywords: ['elephant'] },
  { label: 'Llama', avatar: '🦙', asset: 'llama', keywords: ['llama', 'alpaca'] },
  { label: 'Hamster', avatar: '🐹', asset: 'hamster', keywords: ['hamster'] },
  { label: 'Mouse', avatar: '🐭', asset: 'mouse-face', keywords: ['mouse', 'mice'] },
  { label: 'Horse', avatar: '🐴', asset: 'horse-face', keywords: ['horse', 'pony', 'mare', 'stallion', 'seahorse'] },
  { label: 'Polar Bear', avatar: '🐻‍❄️', asset: 'polar-bear', keywords: ['polar bear'] },
  { label: 'Bear', avatar: '🐻', asset: 'bear', keywords: ['bear'] },
  { label: 'Wolf', avatar: '🐺', asset: 'wolf', keywords: ['wolf'] },
  { label: 'Bat', avatar: '🦇', asset: 'bat', keywords: ['bat'] },
  { label: 'Snake', avatar: '🐍', asset: 'snake', keywords: ['snake', 'serpent'] },
  { label: 'Lizard', avatar: '🦎', asset: 'lizard', keywords: ['lizard', 'gecko'] }
].map(character => ({ ...character, art: art(character.asset), preset: false }));

export const CHARACTERS = [...PERSONAS, ...CUSTOM_CHARACTERS];
export const AVATARS = CHARACTERS.map(character => character.avatar);

export function personaForAvatar(avatar) {
  return PERSONAS.find(persona => persona.avatar === avatar);
}

export function characterForAvatar(avatar) {
  return CHARACTERS.find(character => character.avatar === avatar)
    ?? PERSONAS.find(persona => persona.avatar === '👽')
    ?? PERSONAS[0];
}

function normalizedWords(value) {
  return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').trim();
}

function hasKeyword(name, keyword) {
  return keyword.includes(' ') ? name.includes(keyword) : name.split(/\s+/).includes(keyword);
}

function hashName(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Curated associations supplement literal creature names; this is not an AI service.
const THEMES = [
  ['dog-face', ['trust', 'trusted', 'trustworthy', 'loyal', 'loyalty', 'friend', 'friendship']],
  ['pigeon', ['sky', 'cloud', 'clouds', 'cloudy', 'flight', 'flying', 'peace']],
  ['lion', ['brave', 'bravery', 'courage', 'courageous', 'king', 'queen', 'royal']],
  ['owl', ['wise', 'wisdom', 'knowledge', 'study', 'scholar', 'book', 'books']],
  ['fox', ['clever', 'cunning', 'sly', 'trickster', 'sneaky']],
  ['butterfly', ['social', 'bloom', 'flower', 'flowers', 'spring', 'grace']],
  ['honeybee', ['busy', 'buzz', 'honey', 'teamwork', 'worker']],
  ['alien', ['space', 'cosmic', 'galaxy', 'galactic', 'star', 'stars', 'planet']],
  ['unicorn', ['magic', 'magical', 'sparkle', 'sparkles', 'glitter', 'rainbow']],
  ['robot', ['tech', 'technology', 'code', 'coding', 'computer', 'logic']],
  ['ghost', ['spooky', 'haunted', 'boo', 'phantom']],
  ['penguin', ['ice', 'icy', 'snow', 'snowy', 'winter', 'frost']],
  ['turtle', ['calm', 'patience', 'patient', 'steady', 'peaceful']],
  ['dolphin', ['ocean', 'sea', 'wave', 'waves', 'surf', 'splash']],
  ['sloth', ['sleep', 'sleepy', 'nap', 'lazy', 'relax', 'relaxed']],
  ['dragon', ['fire', 'flame', 'flames', 'fiery', 'blaze']],
  ['rabbit-face', ['fast', 'speed', 'quick', 'swift', 'bounce']]
];

export function characterMatchForName(name) {
  const normalized = normalizedWords(name);
  if (!normalized) return null;
  const literal = CHARACTERS.find(character => character.keywords.some(keyword => hasKeyword(normalized, keyword)));
  if (literal) return { character: literal, reason: 'creature' };
  const theme = THEMES.find(([, words]) => words.some(word => hasKeyword(normalized, word)));
  return theme ? { character: CHARACTERS.find(character => character.asset === theme[0]), reason: 'theme' } : null;
}

export function customCharacterForName(name, variation = 0) {
  const normalized = normalizedWords(name);
  const step = Math.max(0, Number(variation) || 0);
  const keywordMatch = characterMatchForName(normalized)?.character;
  if (keywordMatch && step === 0) return keywordMatch;
  const start = keywordMatch
    ? CHARACTERS.indexOf(keywordMatch)
    : hashName(normalized || 'oddly true') % CHARACTERS.length;
  return CHARACTERS[(start + step) % CHARACTERS.length];
}
