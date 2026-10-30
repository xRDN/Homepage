# Erdian's little island

A tiny walkable 3D homepage (Three.js, no build step, no server). Works on GitHub Pages as-is.

- Edit `LINKS`, `PROJECTS`, `NPC_LINES`, `WX_LINES` and the `know` list at the top of `js/main.js`.
- One signboard north of the spawn shows your projects and contacts. Walk up and press E (or click / tap the board) to open a card with the project list and your links.
- Deep links: `#night`, `#day`, `#cold`, `#projects`, and any weather: `#rain`, `#storm`, `#snow`, `#fog`, `#windy`, `#cloudy`, `#heat`, `#clear` (combine, e.g. `#night-storm`). A weather link locks the weather; `#auto` lets it drift.

## Controls

- **Move:** WASD / arrows, or the **analog stick**: touch (or click-drag) anywhere on the **left half** of the screen and the stick appears under your finger. Push further to run faster.
- **Look:** drag on the **right half** (or hold the right mouse button anywhere). Mouse wheel zooms.
- Tapping the ground does nothing any more. A quick tap on the signboard opens it, a quick tap on Pip or Momo starts a chat with them.
- **E** (or the button that appears) interacts, **Space** jumps, **Enter** opens chat.
- Only two icon buttons are always on screen: ☰ (links, projects, fish, change buddy, story) and ⚙️ (settings, icons only). Chat opens from 💬 or Enter and stays open after you send; the 📌 icon in ⚙️ turns that off.

## Talk to Pip and Momo

Type `@Pip` or `@Momo` (or tap them) in the chat. They walk over and answer in a speech bubble, each in their own voice:
Pip 🐰 is the upbeat, precise guide (projects, links, controls, tips); Momo 🍡 is the sleepy, deadpan one (naps, rain, vibes, sends you to Pip for details). Both know the live weather, where the shelters are, your acorn count and the fishing odds. `@everyone` asks both.
Quick mode needs no download. The 🧠 icon in settings loads an optional on-device model (desktop + WebGPU) so they answer with it, each with their own persona.

## The island

- **Placement is calculated, not hand-typed** (`js/layout.js`): the signboard sits north of the plaza with a path to it; the pond, gazebo and lean-to are scored for clearance; trees, rocks, bushes, flowers and mushrooms use patterns (rim ring, groves, clusters, rings around the pond, a fairy ring) plus Mitchell's best-candidate sampling, all checked against one occupancy board so nothing overlaps. Same seed, same island: it is cached in `localStorage` and the 🔀 icon re-rolls it.
- More things on it: windmill (spins with the wind), lamps (light up at night and in storms), benches, fences, crates, a campfire, stepping-stone paths, lily pads, puddles.
- **Shelters:** a gazebo and a lean-to with a campfire by the pond. Under a roof rain and snow are cut off, wind can't push you, sound is muffled and the weather chip says 🏠 Sheltered. Pip and Momo run for cover when it gets rough (Momo stays out in light rain to stomp puddles).
- **Weather (8 kinds)** in ⚙️: clear, cloudy, windy, rain, storm, snow, fog, heatwave. 🎲 lets it drift by itself (on by default), 📍 follows your real local weather. Each one changes: sky, light and fog; clouds (count, speed, darkness); rain streaks, snow, blown leaves; tree sway, flowers closing, windmill speed; wet ground and puddles, snow cover, a freezing pond (no fishing on ice), a drying pond and grass in a heatwave; walking speed and wind gusts; lightning, thunder and camera shake in storms (flash is tiny with reduced motion); lamps and campfire; sound (wind, rain, snow, thunder, cicadas); fishing bite rate and rare-fish odds; an aurora on clear cold nights; a rainbow after rain.
- Fishing at the pond: N / R / SR / SSR fish (60 / 28 / 10 / 2 % base, better in rain, at night and under an aurora). Ice or a storm blocks fishing.
- Five golden acorns are hidden around the island. Found acorns are remembered per island (re-rolling the island resets them). Find all five and a 👻 button appears top right; it does nothing until you press it. Then the island turns haunted (red fog, a lurking figure, nervous buddies, low drone), and your choice is remembered. It never jump-scares and has no fast flashing.
- Six buddies to play as (Blobby, Mochi, Bunbot, Ember, Frost, Puff), each with its own look, tagline and greeting. Pip 🐰 and Momo 🍡 have looks of their own that nobody can pick, and other visitors can't appear as them either.
- At night Pip and Momo go to sleep in the lean-to (💤). Pip dozes sitting up, nodding off with drooping ears; Momo flops onto her side and breathes slowly. Talk to them and they wake up; they stay awake when the island is haunted.

## Meeting other visitors (multiplayer)

You are online by default after "Come on in" and everyone in the same room appears on your island. 🌐 in ⚙️ turns it off (remembered on that device; offline hides everyone). If the server can't be reached it fails quietly and 🌐 stays off.

It runs through a tiny relay server in `worker/` (a Cloudflare Worker + Durable Object, free plan is enough). Every visitor opens a WebSocket to it, so it works across any network, and nobody sees anybody's IP address. The relay keeps only who is where, in memory. It stores nothing and logs no chat.

**Set it up once (about 5 minutes):**

1. Make a free account at cloudflare.com (no card needed for this).
2. In a terminal: `cd worker && npm install && npx wrangler login && npx wrangler deploy`
3. It prints an address like `https://island-relay.YOUR-NAME.workers.dev`. Open `js/config.js` and put it in as `wss://island-relay.YOUR-NAME.workers.dev` (same address, `wss://` instead of `https://`). Commit and push.
4. Check `https://island-relay.YOUR-NAME.workers.dev/health` says `ok`.
5. Recommended: in `worker/wrangler.toml` set `ALLOWED_ORIGINS = "https://YOUR-NAME.github.io"` and run `npx wrangler deploy` again, so other websites can't use your relay.

**Rooms hold 7.** Visitors land in `main`; when it has 7 the next visitor goes to `main-2`, then `main-3` and so on. Public rooms carry positions and emoji reactions only, so strangers cannot type to each other. **Meeting a friend with text chat:** share a private link like `https://your.site/?room=our-room` (letters, numbers and dashes, up to 24 characters).

Limits (`MAX_PER_ROOM` in `worker/wrangler.toml`, default 7; rate limits in `worker/src/room.js`): about 15 position updates per second and one chat line every 2 seconds per person, 80 characters per line. Chat text is cleaned on the server and shown as plain text in the page.

If `js/config.js` has no address, 🌐 falls back to serverless peer-to-peer (Trystero), which often fails between different networks and shows other visitors your IP address. To test locally: `cd worker && npx wrangler dev`, then in the browser console `localStorage.setItem('island.relay','ws://127.0.0.1:8787')` and reload.

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
