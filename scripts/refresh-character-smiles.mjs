// Small native-SVG expression edits; original Fluent artwork and licence stay intact.
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../public/assets/characters/', import.meta.url);
const smile = (x, y, w = 2, color = '#38273e') => `<path d="M${x-w} ${y} Q${x} ${y+w*1.5} ${x+w} ${y}" fill="none" stroke="${color}" stroke-width=".8" stroke-linecap="round"/>`;
const eyes = (x, y, gap = 2) => `<g fill="#302638"><ellipse cx="${x-gap}" cy="${y}" rx=".65" ry=".85"/><ellipse cx="${x+gap}" cy="${y}" rx=".65" ry=".85"/></g>`;
const expressions = {
  'bat': smile(19.5, 20, 1.1),
  'butterfly': '<ellipse cx="16" cy="11" rx="3.2" ry="4" fill="#ad80d5"/>' + eyes(16, 10, 1.25) + smile(16, 12, 1.1),
  'crab': smile(16, 18, 3),
  'dolphin': smile(8, 9.8, 1.7, '#125f85'),
  'dragon': smile(10, 10.5, 1.8, '#236348'),
  'elephant': smile(12, 16, 1.7, '#5a4a72'),
  'flamingo': smile(13.8, 6.2, 1.1, '#81365d'),
  'frog': smile(16, 23, 4),
  'giraffe': smile(9, 8, 1, '#764928'),
  'hedgehog': smile(7.5, 23.5, 1.2),
  'honeybee': '<ellipse cx="6" cy="18" rx="3.2" ry="4.5" fill="#725477"/>' + eyes(6, 16.4, 1.1) + smile(6, 19, 1.2, '#fff2cf'),
  'jellyfish': eyes(16, 11, 3) + smile(16, 15, 2.5),
  'koala': smile(16, 25, 2),
  'lizard': smile(14, 8.5, 1.5, '#205f42'),
  'llama': smile(8, 7.5, 1.1),
  'lobster': smile(16, 25, 2),
  'octopus': smile(16, 19, 3),
  'otter': smile(8, 15, 1.2),
  'owl': smile(16, 17, 2, '#ffe3bd'),
  'parrot': smile(12, 11, 1.3, '#6f342f'),
  'peacock': smile(17, 9, 1.2),
  'penguin': smile(16, 12.5, 1.8, '#854422'),
  'robot': '<rect x="11" y="22" width="10" height="5" rx="2.5" fill="#ccb4df"/>' + smile(16, 23, 3),
  'sloth': smile(8, 20, 1.5),
  'snail': smile(9, 16, 1.6, '#75432e'),
  'snake': smile(25, 9, 1.5, '#215942'),
  'spouting-whale': smile(9, 21, 2.2, '#265878'),
  't-rex': '<ellipse cx="11" cy="7" rx="1.8" ry="1.6" fill="#29c987"/><ellipse cx="11" cy="7" rx=".65" ry=".85" fill="#234d39"/>' + smile(8, 11, 2.2, '#215942'),
  'turtle': smile(5, 23, 1.5, '#386323')
};
for (const [asset, expression] of Object.entries(expressions)) {
  const path = new URL(`${asset}.svg`, dir);
  const original = readFileSync(path, 'utf8').replace(/<g id="oddly-true-smile">[\s\S]*?<\/g><!-- smile-end -->/g, '');
  writeFileSync(path, original.replace('</svg>', `<g id="oddly-true-smile">${expression}</g><!-- smile-end --></svg>`));
}
