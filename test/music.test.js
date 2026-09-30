import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMusicLoop, MUSIC_TRIM } from '../shared/music-loop.js';

test('music loop trims silence and joins smoothly at common decoding rates', () => {
  for (const rate of [44100, 48000]) {
    const channels = [0, 1].map(channel => Float32Array.from({ length: rate * 38 }, (_, i) => Math.sin(i / 100 + channel)));
    const decoded = { sampleRate: rate, length: channels[0].length, numberOfChannels: 2, getChannelData: i => channels[i] };
    const context = { createBuffer: (count, length, sampleRate) => {
      const data = Array.from({ length: count }, () => new Float32Array(length));
      return { length, sampleRate, numberOfChannels: count, getChannelData: i => data[i] };
    } };
    const loop = makeMusicLoop(context, decoded);
    assert.ok(Math.abs(loop.length / rate - 34.620213) < 1 / rate);
    const start = Math.round(MUSIC_TRIM.start * rate);
    const blend = Math.round(MUSIC_TRIM.overlap * rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = loop.getChannelData(channel);
      assert.equal(data[0], channels[channel][start + blend]);
      assert.equal(data[data.length - 1], channels[channel][start + blend - 1]);
      assert.ok(Math.abs(data[0] - data[data.length - 1]) < .011, 'Boundary retains adjacent original samples');
      assert.ok(data.every(Number.isFinite));
    }
  }
});
