# Security and privacy

## Protections

Rules, scores and host permissions are server-authoritative. Random opaque tokens identify seats and are omitted from other players' snapshots. Inputs are bounded, names limited, browser text escaped, and SQL parameterised. Hosted mutations with an explicit foreign Origin are rejected. Revision checks prevent lost concurrent writes.

## Data

Hosted room records contain chosen names/characters, seat tokens, rules, answers, scores and progress. There are no player accounts, email collection, marketing trackers or app-level analytics. Hosting providers may keep operational logs. Google Fonts and external fact/credit links can receive normal request metadata.

Browser session storage keeps the current seat; local storage keeps the theme. Seat tokens permit actions as a player. Do not post URLs containing `token=` publicly.

Rooms expire after four hours without a state-changing action and become inaccessible through the API. Physical deletion happens opportunistically when another room is created, not necessarily at the exact expiry time. Local rooms disappear when that server stops.

## Boundaries and reporting

This project has not had a security audit or public-scale load test. Application rate limits, abuse moderation and active-game host takeover are not implemented. A room code permits joining while the room accepts players. The source includes answers, so this is casual play rather than an anti-cheat competition.

Report suspected vulnerabilities privately to the owner through a verified private channel, or GitHub private vulnerability reporting if enabled. Do not put tokens or exploit details in public issues. Never commit secrets, production databases or sensitive personal data.
