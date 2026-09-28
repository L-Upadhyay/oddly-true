# Audio design and provenance

The landing jingle and gameplay cues are original patterns generated in `public/app.js` with Web Audio oscillators and gain envelopes. The composition and implementation are documented below.

## Landing jingle

- **Composition:** original eight-second repeating phrase, built for this game.
- **Tempo:** 120 beats per minute, with sixteen beat-length melody steps per phrase.
- **Melody:** triangle-wave plucks using these frequencies (Hz), in order: 523, 659, 784, 659, 587, 698, 523, 392, 523, 659, 880, 784, 698, 587, 659, 523. Each begins 0.5 seconds after the previous note, with an 0.08-second offset for a bouncy feel.
- **Bed:** four sine-wave bass notes at 131, 165, 147, and 196 Hz. A note begins every two seconds and lasts 2.08 seconds, crossing the next note and the eight-second loop boundary. The melody has deliberate short rhythmic spaces, but the track has no multi-second silent break.
- **Playback:** the Web Audio clock schedules overlapping bars ahead of time; a short interval fills its queue. Music stops when play begins or the Music control is switched off. The music bus is quieter than the answer effects.

Music and Sound both start enabled, and the theme starts light on each page load. Browser autoplay rules can leave audio suspended until the first pointer or key interaction. The Music control always reads “Music on” while enabled; clicking it immediately switches music off, even if it is the first interaction. Any other pointer or key interaction on the landing page starts enabled music. Clicking Music again switches it on and starts playback. The controls change the current visit only.

## Gameplay cues

Short oscillator patterns signal welcome, question, answer lock, correct and wrong answers, and final score feedback. The final Solo cue changes for scores of 70% or more, 20% or less, and the middle range. These patterns are also generated in `public/app.js`.

If a recorded sound is added later, document its creator, source URL, exact license, required attribution, and any edits here and in `THIRD_PARTY_NOTICES.md` before bundling it.
