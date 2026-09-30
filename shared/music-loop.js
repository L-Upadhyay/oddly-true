// Trim the source intro's silence and blend its boundary before repeating.
export const MUSIC_TRIM = { start: 0.211587, end: 34.9118, overlap: 0.08 };

export function makeMusicLoop(context, decoded) {
  const rate = decoded.sampleRate;
  const start = Math.round(MUSIC_TRIM.start * rate);
  const end = Math.min(decoded.length, Math.round(MUSIC_TRIM.end * rate));
  const blend = Math.round(MUSIC_TRIM.overlap * rate);
  const length = end - start - blend;
  if (length <= blend) throw new Error('Music recording is too short.');
  const loop = context.createBuffer(decoded.numberOfChannels, length, rate);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const input = decoded.getChannelData(channel);
    const output = loop.getChannelData(channel);
    const middle = length - blend;
    output.set(input.subarray(start + blend, end - blend), 0);
    for (let i = 0; i < blend; i++) {
      const mix = i / (blend - 1);
      output[middle + i] = input[end - blend + i] * (1 - mix) + input[start + i] * mix;
    }
  }
  return loop;
}
