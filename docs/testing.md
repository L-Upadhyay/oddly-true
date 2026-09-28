# Testing and submission walkthrough

With Node.js 24, run `npm ci`, `npm run check`, `npm test`, and `npm run build`. Optional `npm run test:coverage` prints a coverage report; no percentage threshold is claimed.

## Automated scope

The test suite covers Solo round choices, early finish and replay; multiplayer rules, scores, Wild Cards, ties, timeouts, character/assets, capacity, team averages, host finish/transfer, real local HTTP/SSE, eight concurrent hosted players, persisted room reconstruction and exactly-once reveal scoring. Hosted API tests check seat authentication, foreign-origin mutations and expired rooms.

Hosted persistence tests adapt SQLite to the D1 prepared-statement interface. They verify our SQL/concurrency logic, not production load or network latency. CI uses Node 24 so hosted tests run rather than being skipped on an older runtime.

The coverage report describes instrumented server/shared modules; it does not measure browser interactions or the separately spawned local server. Submission preparation was verified with Node 24: clean install, syntax checks, all 12 tests without skips, and production build passed.

## Manual acceptance

These are steps to perform, **not a claim that every combination has passed**. Record device/browser, date, result and issue link during the submission playtest.

| Check | Expected result |
| --- | --- |
| Play Solo, answer and let a timer expire | Starts without a guest; no room votes or opponent leaderboard; chosen 1–10 facts, early finish, final score and replay |
| Solo Auto next | Off on a first visit; when enabled, each reveal counts down 15 seconds, Next now works, Pause stops it, Resume continues from the remaining time, and opening a source in another tab pauses it. The chosen setting is remembered; Friends still waits for the host |
| Solo final buttons | Keep playing, replay and choose another mode align with consistent spacing on laptop and mobile widths |
| Solo invite attempt | Solo cannot be joined |
| Landing and invite link | Solo/Friends choices are clear; invite link opens the Friends join path with code filled |
| Open landing; create or join a room | A brief welcome appears over the character and fades; named welcome appears once on entry, not on every poll or refresh |
| Two devices on different networks use public URL | Both load without signing in |
| Create room; guest joins by code | Same roster and rules on both devices |
| Join by invite link | Room code prefilled |
| Custom two-round Individuals game | Picks lock; votes/truth reveal; host advances |
| Correct and incorrect picks | +10 and 0 consistent across devices |
| Round and final results | Personal messages match correct/wrong/timeout, ties, team outcomes and final winner; losing remains encouraging |
| Sound on/off, refresh and replay | Sound starts on with every new page load; the button mutes it for this visit. Question, lock, correct/wrong and final cues play once after interaction; a muted tab stays silent until refresh or re-enable. Solo final cues match high (70%+), middle, or low (20% or less) score relative to 10 per played fact |
| Landing music | Light mode, Music and Sound start on with every new page load. Music begins immediately if the browser permits audio, otherwise on the first pointer or key interaction without a toggle cycle. The jingle has no multi-second loop gap, stops when Solo or Friends play starts, and Music off stops it immediately. The three top controls align at desktop and mobile widths |
| Wild Cards in separate games | +20/−5; cannot reuse within one game |
| Let timer expire | Unanswered player gets 0; round proceeds |
| Host decides reveal | Finish early is available to the host after a reveal |
| Fixed Friends game | The host may finish early after a reveal; otherwise final scores follow the final reveal. At the score screen the host can continue with unseen facts or replay from zero |
| Four-player teams | Balanced teams; average scores; consistent ties |
| Refresh mid-game | Same seat returns; scores do not duplicate |
| Host leaves after game | Host transfers; final board stays intact |
| Phone, light/dark, 200% zoom | Controls readable and reachable |
| Keyboard-only play | Visible focus and operable controls |
| Reduced motion | Character/reveal/confetti motion suppressed |
| Trust, Sky, Sky Fox | Dog, pigeon, fox |
| Fact/credit links | Correct source opens separately |

## Reviewer demo

1. Open the public game in two independent browser sessions.
2. Create as Doctor Pigeon; join as Captain Fox.
3. Select two custom rounds and start.
4. Choose different answers; show votes, truth and scores.
5. Use a Wild Card in round 2, then show final scores and replay.
6. Repeat joining on a phone for a genuine separate-device demonstration. Two windows on one computer are useful tests, not evidence of separate devices.

To show independent exploration, choose Play Solo on a separate visit; demonstrate that no second player is required and the result is a personal score. The competition requirement remains the two-device multiplayer path above.

Use the repository bug template for failures. Remove tokens and unrelated personal information from screenshots.
