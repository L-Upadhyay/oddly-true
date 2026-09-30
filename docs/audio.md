# Audio design and provenance

## Background music

- **Track:** Intro Start Game Loop
- **Creator:** Tozan
- **Source:** https://opengameart.org/content/intro-start-game-loop
- **Download:** https://opengameart.org/sites/default/files/jungled.mp3
- **Listed license:** CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/
- **Verified:** 2026-09-30. Creator credit is retained here and in THIRD_PARTY_NOTICES.md.
- **Bundled file:** public/assets/audio/intro-start-game-loop.mp3, unchanged source recording, 600,188 bytes.
- **SHA-256:** 84774478ac46afecd3a3fbed5fd3a74e2f24872331eec44fb944f6d337f77967

The source MP3 lasts about 37.49 seconds. Decoded audio analysis found opening silence through 0.211587 seconds and a quiet tail starting at 34.9118 seconds. `shared/music-loop.js` keeps that interval and overlaps the final 80 milliseconds with its opening using a linear crossfade. This produces approximately 34.62 seconds of continuously repeating audio without the original multi-second tail. The MP3 is not re-encoded; the loop edits happen after decoding, once per page visit.

A Web Audio BufferSource repeats the prepared buffer using the audio clock, avoiding JavaScript timer gaps and repeated downloads. A separate music gain of 0.13 keeps it quiet beneath answer cues. Turning Music off cancels a pending download/start and stops active playback. The decoded buffer is cached for that visit; loading errors can be retried by turning Music off and on.

Music continues across the landing page, Solo, and Friends screens. Music and Sound both start enabled, and the theme starts light on each page load. Browser autoplay rules can leave audio suspended until the first pointer or key interaction. Clicking Music immediately switches it off, even as the first interaction; another interaction starts it if still enabled. The controls apply to the current visit.

## Gameplay cues

Short original oscillator patterns in `public/app.js` signal welcome, question, answer lock, correct and wrong answers, and final score feedback. These remain separate from the recorded background music. Final Solo cues differ for scores of 70% or more, 20% or less, and the middle range.

The earlier original eight-second oscillator jingle has been replaced by the selected recording. Its implementation remains recorded in Git history.
