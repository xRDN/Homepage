# Erdian's little island

A tiny walkable 3D homepage (Three.js, no build step, no server). Works on GitHub Pages as-is.

- Edit `LINKS`, `PROJECTS`, `NPC_LINES`, `WX_LINES` and the `know` list at the top of `js/main.js`.
- Each project gets its own pedestal; walk up and press E (or tap the sign) to open its card.
- Deep links: `#night`, `#day`, `#cold`, `#projects`, and any weather: `#rain`, `#storm`, `#snow`, `#fog`, `#windy`, `#cloudy`, `#heat`, `#clear` (combine, e.g. `#night-storm`). A weather link locks the weather; `#auto` lets it drift.

## Controls

- **Move:** WASD / arrows, or the **analog stick**: touch (or click-drag) anywhere on the **left half** of the screen and the stick appears under your finger. Push further to run faster.
- **Look:** drag on the **right half** (or hold the right mouse button anywhere). Mouse wheel zooms.
- Tapping the ground does nothing any more. A quick tap on a sign opens it, a quick tap on Pip or Momo starts a chat with them.
- **E** (or the button that appears) interacts, **Space** jumps, **Enter** opens chat.
- Only two icon buttons are always on screen: ☰ (links, projects, fish, change buddy, story) and ⚙️ (settings, icons only). Chat opens from 💬 or Enter.

## Talk to Pip and Momo

Type `@Pip` or `@Momo` (or tap them) in the chat. They walk over and answer in a speech bubble, each in their own voice:
Pip 🐰 is the upbeat, precise guide (projects, links, controls, tips); Momo 🍡 is the sleepy, deadpan one (naps, rain, vibes, sends you to Pip for details). Both know the live weather, where the shelters are, your acorn count and the fishing odds. `@everyone` asks both.
Quick mode needs no download. The 🧠 icon in settings loads an optional on-device model (desktop + WebGPU) so they answer with it, each with their own persona.

## The island

- **Placement is calculated, not hand-typed** (`js/layout.js`): signs sit on arcs sized by how many links/projects you have; the pond, gazebo and lean-to are scored for clearance; trees, rocks, bushes, flowers and mushrooms use patterns (rim ring, groves, clusters, rings around the pond, a fairy ring) plus Mitchell's best-candidate sampling, all checked against one occupancy board so nothing overlaps. Same seed, same island: it is cached in `localStorage` and the 🔀 icon re-rolls it.
- More things on it: windmill (spins with the wind), lamps (light up at night and in storms), benches, fences, crates, a campfire, stepping-stone paths, lily pads, puddles.
- **Shelters:** a gazebo and a lean-to with a campfire by the pond. Under a roof rain and snow are cut off, wind can't push you, sound is muffled and the weather chip says 🏠 Sheltered. Pip and Momo run for cover when it gets rough (Momo stays out in light rain to stomp puddles).
- **Weather (8 kinds)** in ⚙️: clear, cloudy, windy, rain, storm, snow, fog, heatwave. 🎲 lets it drift by itself (on by default), 📍 follows your real local weather. Each one changes: sky, light and fog; clouds (count, speed, darkness); rain streaks, snow, blown leaves; tree sway, flowers closing, windmill speed; wet ground and puddles, snow cover, a freezing pond (no fishing on ice), a drying pond and grass in a heatwave; walking speed and wind gusts; lightning, thunder and camera shake in storms (flash is tiny with reduced motion); lamps and campfire; sound (wind, rain, snow, thunder, cicadas); fishing bite rate and rare-fish odds; an aurora on clear cold nights; a rainbow after rain.
- Fishing at the pond: N / R / SR / SSR fish (60 / 28 / 10 / 2 % base, better in rain, at night and under an aurora). Ice or a storm blocks fishing.
- Five golden acorns are hidden around the island; find them all for a crown.

## Cache

- Your buddy is saved the first time you pick one; later visits skip the picker (change it any time in ☰).
- The island layout, weather settings, acorns, fish and the last real-weather lookup (15 min) are stored in `localStorage`.
- `sw.js` is a service worker that keeps the site and three.js available offline: your own files are network-first (so deploys show up immediately), versioned CDN files are cache-first. Bump `VERSION` in `sw.js` to force a refresh.

Falls back to a plain page if WebGL is unavailable.

## Story mode: The Long Spring (an animated film, animatic cut)

`story/` is a plain static page (no build step, no dependencies): a 16-scene, ~16-minute film player with placeholder painted art drawn in code, synthesized sound, captions and chapter bar. The main island never loads it; the 📖 Story button asks first.

- **Witness moments (all optional, none can fail):** wipe fog off a window; turn ledger pages and type a sentence containing *corruption*; hold to shield a candle; move a lantern as ghost hands appear, then draw your own pencil tick; hold the bell rope; tap along as the crowd counts; click lanterns and stamp RECEIVED; carve *KEEP THE READING* into the wall.
- Controls: Space or click to take part, K pause, C captions, M mute, F fullscreen, arrows for scenes. *Watch without interaction* turns every moment into a plain scene.
- The film bible and plan live in the project document. Swap the placeholder painters in `story/scenes.js` for real plates when the art exists.
- Deploys with the included GitHub Actions workflow (or any static host).
