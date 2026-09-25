# HTTP API

Responses are JSON with `Cache-Control: no-store`; errors contain `{ "error": "Readable message" }`. Both adapters share rules; hosted snapshots also include `revision`.

Create a room with `POST /api/rooms` and body `{"name":"Doctor Pigeon","avatar":"🐦"}`. HTTP 201 returns `code`, `playerId` and an opaque `token`. Join using the same body at `/api/rooms/{code}/join`. Names are trimmed and limited to 24 characters; rooms allow eight players.

Keep tokens private. Mutations use `X-Player-Token`; state and local SSE use a `token` query parameter. Never copy token-bearing URLs into public issue reports.

| Method | Path | Body / behaviour |
| --- | --- | --- |
| GET | `/health` | Basic process health |
| GET | `/api/config` | `events` locally; `poll` and interval 900 online |
| POST | `/api/rooms` | Create with `{name, avatar}` |
| POST | `/api/rooms/{code}/join` | Join with `{name, avatar}` |
| GET | `/api/rooms/{code}/state?token=…` | Player-specific snapshot |
| GET | `/api/rooms/{code}/events?token=…` | Local-only SSE |
| POST | `/api/rooms/{code}/settings` | Host: `{roundMode, roundCount, playMode}` |
| POST | `/api/rooms/{code}/swap` | Host: `{firstId, secondId}` |
| POST | `/api/rooms/{code}/start` | Host starts/replays; `{}` |
| POST | `/api/rooms/{code}/answer` | `{choice: 0..2, wildCard: boolean}` |
| POST | `/api/rooms/{code}/advance` | Host advances after reveal; `{}` |
| POST | `/api/rooms/{code}/finish` | Host ends Host decides mode after reveal; `{}` |
| POST | `/api/rooms/{code}/react` | `{emoji}` from allowed reactions |
| POST | `/api/rooms/{code}/leave` | Leave between games; `{left:true}` response |

`roundMode`: `ten`, `custom`, `host`. `playMode`: `solo`, `teams`. Custom count: 1 to fact-bank size (currently 10). Teams require 4–8 players. Settings cannot change during play.

Snapshots include phase, roster, round, scores, deadline and viewer answer. Votes become visible in the votes phase; correctness, explanation, source and image appear at reveal. Common errors: 400 invalid action, 403 invalid seat/host permission, 404 missing/expired room, 405 wrong method, 413 oversized input. Hosted storage may return 409 after repeated conflicts or 503 while unavailable. Bodies are limited to 16 KiB. Do not blindly retry mutations that might already have succeeded.
