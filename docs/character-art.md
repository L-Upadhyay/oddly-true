# Character portrait preparation

Prepared 2026-09-30 with the built-in image-generation editor. These are static expression portraits, not animated GIFs.

## References and provenance

The user supplied and approved a Doctor Pigeon character sheet (`image (1).png`) and a Lucky Lion sheet (`DSP39j6urb4YXy3l.png`). The front-facing pigeon and the large smiling lion were the identity references. Approved three-expression preview strips were used for the final individual portraits. No reference-sheet text or labels are included in the game images.

Miora's official Service Agreement was checked on 2026-09-30 at https://miora.design/document/service-agreement. Its English content is supplied by the official site bundle https://static.d.gtimg.com/miora/9e17ad7b/assets/js/index-DIwH3zeh.js. Section 9.2(d) assigns Tencent's rights in generated output to the user; section 9.2(a) retains applicable third-party model restrictions. This is the basis for using the user's original generated character designs in this project; it is not a guarantee of exclusivity or a licence over unrelated third-party artwork. The portraits are AI-generated and edited, not represented as human-drawn. The older SVG artwork remains bundled for rollback.

## Files and current behaviour

Each character has `neutral`, `happy`, and `disappointed` PNGs in `public/assets/characters/`. Generated originals are 1254 × 1254 with alpha transparency; game files are encoded at 256 × 256 with alpha preserved. FFmpeg scaled and losslessly encoded the PNGs for delivery. The six runtime files total 525,095 bytes, approximately 94% smaller than the generated originals. `shared/personas.js` maps the resting expression as default artwork and exposes the other expression paths. Local HTTP serving supports all six images; the hosted build copies them with the remaining assets.

Selection, lobby, questions, and vote suspense use the default resting portrait. At reveal, each player uses a happy face for positive round points and a disappointed face for a wrong answer, timeout, or missed Wild Card. Final Friends results celebrate all tied winners; other players show disappointment. Solo final results use the existing score feedback bands: happy at 70% or above, disappointed at 20% or below, neutral otherwise. The Solo reveal banner and final score card display the chosen character portrait. Other characters retain their existing artwork. All expressions derive from the current snapshot and reset for replay or extension. A CSS mask fades the bottom chest edge, preserving the mane and headwear. Resting faces retain a gentle friendly look.

## Final generation prompts

These templates were submitted once per expression, using the approved strip for that character as the reference and `transparent_background: true`.

### Doctor Pigeon

`Extract and clean ONE Doctor Pigeon {mood} head-and-shoulders portrait from the attached approved expression strip. {selection}. Preserve exact face, expression, black round glasses, orange beak, grey feathers, purple teal neck, white doctor coat, head mirror and stethoscope, painterly style. Single square transparent PNG avatar, centered with head facing forward, entire mirror visible. Character occupies 80 percent of canvas width and height, generous transparent margin around entire silhouette including top and sides. Clean smooth silhouette edges; remove fringe artifacts at bottom, end shoulders in smooth rounded chest crop. No text no background no shadow no other portraits. Keep identical portrait scale as other expressions.`

Selections: neutral = `Use left portrait exactly`; happy = `Use centre portrait exactly`; disappointed = `Use right portrait exactly`.

### Lucky Lion

`Create ONE clean Lucky Lion {mood} chest-up portrait extracted from attached approved expression strip. {selection}. Preserve exact character identity: golden fur, caramel brown fluffy mane with swept tuft, amber eyes, cream muzzle, pink brown nose, green bow tie and four-leaf clover. Painterly polished cartoon. Single square PNG transparent canvas. Entire mane including top tuft MUST be fully visible with at least 10 percent clear canvas space ABOVE it and around all sides. Character centered occupying only 75 percent of canvas, front-facing identical size/framing in all expression variants. Smooth clean chest silhouette with no stray pixels or fringe. No text labels borders other portraits background shadows. Do not crop the mane. This is a single game avatar, not a character sheet.`

Selections: neutral = `Left portrait, relaxed friendly closed mouth`; happy = `Centre portrait, happy open-mouth smile`; disappointed = `Right portrait, gently disappointed closed mouth and worried eyebrows`.

## Remaining checks

- Miora output-rights review is recorded above. Recheck terms if generation provider or intended use changes.
- Runtime portrait optimization is complete (approximately 80–97 KB per PNG). Original generated images remain available separately.
- Final rendered layout has not yet been browser-reviewed. Check avatars on light/dark backgrounds and at small screen sizes during the planned final browser review.
