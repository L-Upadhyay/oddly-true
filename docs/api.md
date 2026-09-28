# HTTP API

Responses are JSON with `Cache-Control: no-store`; errors contain `{ "error": "Readable message" }`. Both adapters share rules; hosted snapshots also include `revision`.

Create a friends room with `POST /api/rooms` and body `{"name":"Doctor Pigeon","avatar":"🐦"}`. For one-person practice, include `"kind":"solo"` and optionally `"roundMode":"custom","roundCount":3` or `"roundMode":"ten"`; the browser starts after creation. HTTP 201 returns `code`, `playerId` and an opaque `token`. Join a friends room using the same body at `/api/rooms/{code}/join`. Solo sessions cannot be joined. Names are trimmed and limited to 24 characters; friends rooms allow eight players.

Keep tokens private. Mutations use `X-Player-Token`; state and local SSE use a `token` query parameter. Never copy token-bearing URLs into public issue reports.

| Method | Path | Body / behaviour |
| --- | --- | --- |
| GET | `/health` | Basic process health |
| GET | `/api/config` | `events` locally; `poll` and interval 900 online |
| POST | `/api/rooms` | Create with `{name, avatar, kind?}`; `kind: "solo"` for one-person practice; optional Solo round settings |
| POST | `/api/rooms/{code}/join` | Join with `{name, avatar}` |
| GET | `/api/rooms/{code}/state?token=…` | Player-specific snapshot |
| GET | `/api/rooms/{code}/events?token=…` | Local-only SSE |
| POST | `/api/rooms/{code}/settings` | Host: `{roundMode, roundCount, playMode}` |
| POST | `/api/rooms/{code}/swap` | Host: `{firstId, secondId}` |
| POST | `/api/rooms/{code}/start` | Host starts/replays; `{}` |
| POST | `/api/rooms/{code}/answer` | `{choice: 0..2, wildCard: boolean}` |
| POST | `/api/rooms/{code}/advance` | Host advances after reveal; `{}` |
| POST | `/api/rooms/{code}/finish` | Solo player or Friends host ends a game after reveal; `{}` |
| POST | `/api/rooms/{code}/extend` | Solo player or Friends host continues a finished game with up to five unseen facts, keeping scores; `{}` |
| POST | `/api/rooms/{code}/react` | `{emoji}` from allowed reactions |
| POST | `/api/rooms/{code}/leave` | Leave between games; `{left:true}` response |

For friends, `roundMode`: `ten`, `custom`, `host`. `playMode`: `solo` (shown as **Individuals** in the UI), `teams`. Custom count: 1–10. Friends require 2–8 players; Teams require 4–8. Settings cannot change during play. A Solo session defaults to five facts, supports 1–10, can finish after any reveal, and skips the votes phase; its `kind` is `solo` in snapshots. The host can finish Friends games after any reveal. Finished snapshots include `factsAvailable`, the number of unseen facts eligible for a five-fact extension. The internal `playMode: "solo"` value remains for compatibility with existing saved rooms.

Snapshots include phase, roster, round, scores, deadline and viewer answer. Votes become visible in the votes phase; correctness, explanation, source and image appear at reveal. Common errors: 400 invalid action, 403 invalid seat/host permission, 404 missing/expired room, 405 wrong method, 413 oversized input. Hosted storage may return 409 after repeated conflicts or 503 while unavailable. Bodies are limited to 16 KiB. Do not blindly retry mutations that might already have succeeded.
