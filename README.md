# MyVerse

A cozy personal world where real-life missions and saved ideas become progress.

## Run locally

Install Node.js 24 or a version supported by Vite, then run:

```sh
npm install
npm run dev
```

Open the localhost link printed in the terminal. `npm run build` checks TypeScript and builds the app; `npm run lint` checks source code.

## Current checkpoint: explore Moonhollow

- A playable 3D floating island with rolling terrain, photographed rock/ground/masonry/bark materials, mixed woodland, a stone-and-timber cottage, evolving Workshop, copper-domed Observatory and a pond that reflects the actual world. Daybreak is the initial view; Twilight brings back the ringed planet and stars. The existing SVG island is available through Classic view and automatic WebGL fallback. Interiors remain SVG rooms.
- Click/tap the ground to walk; click a building to visit. Drag to orbit the 3D camera through a full 360° with top, side and underside views (pan in Classic). Right-drag or Shift-drag to move the camera freely. Pan camera mode makes left-drag or one-finger touch move the view and disables tap walking until switched off. Two-finger touch combines pan and pinch zoom. Reset camera restores the initial view and rotate mode. Focus the world and use WASD/arrow keys for camera-relative movement in 3D; Escape stops a route. E/Enter opens a nearby building.
- Select Home Base, Workshop, Observatory or Skill Garden to walk to its entrance and open its shared view. Destination controls also work with keyboard and touch.
- Pinch or scroll over the world to zoom; +/− also work. Manual camera input releases follow/orbit. Classic retains its 50–200% cursor-anchored zoom. Scrolling outside the canvas scrolls the page.
- Follow the character, reset the camera, or enable a slow cinematic orbit. Phone camera framing shows the whole island; zoom in to explore. Eco mode removes postprocessing/shadows and limits pixel density. Classic is the lighter alternative.
- Navigation routes around buildings, tree trunks, water and island edges. Artwork and movement geometry live separately under `src/world` so the world can grow.
- Add missions, complete them once, and receive 25 XP each. Every 100 XP raises your level.
- Search mission titles in the island journal and Home Base's Active/Completed board. Matching ignores case and surrounding spaces; result counts and a clear button help you find your next step. The two views share the search during this session. Adding or renaming a mission, restoring a world or reloading clears it; filters do not change your saved missions or XP.
- Open the profile button to customise your character's name, outfit, skin tone and hat. The preview and island use the same character artwork.
- Earn a Wish lantern at 25 XP, Moonflowers at 75 XP and a Stargazer crystal at 150 XP. Island collection lets you place one copy of each in four prepared garden spots, move it, or return it to your collection. Placement does not spend XP. These are ornamental, non-blocking decorations.
- Capture ideas and turn them into missions.
- Saves to the current browser using localStorage. Clearing browser data removes this save and local recovery copies; download backups regularly. Cloud sync is future work.
- Keyboard access, reduced-motion support and storage-failure feedback.

- Enter Home Base from the island to visit a furnished cottage. Choose the mission board or wonder shelf to move your customised character between those stations. Pin and complete missions, switch between active/completed lists, and see earned keepsakes on the shelf. The room shares the island's missions, XP and draft; exit with either door control or Escape. Shelf keepsakes showcase unlocks without moving island decorations. Room movement is station-based, not free walking.

- Enter the Idea Observatory to save ideas at a writing desk and explore their clickable constellation beneath a telescope dome. Search ideas and browse six stars per page. Selecting a star or list entry opens its full text; converting it moves it once to the Home Base mission board without granting XP. Both rooms use the same browser save and preserve drafts until refresh.

- Walk to Project Workshop to create projects, milestones and tasks. Project tasks are shared Home Base missions and award 25 XP once, whichever room completes them. The selected project's model grows through blueprint, foundations, building and finished stages. Empty milestones remain unfinished. Switch projects with the workbench selector. Created projects persist; unfinished Workshop form drafts last only while that room/project view stays open.

- Rename missions, ideas, projects and milestones with their pencil controls. Save or cancel the edit (Enter/Escape work too). IDs, completed state, XP and shared project task references remain unchanged.
- Open Focus mode for a calm 10/25/45-minute session or a custom duration from 1 to 120 minutes. Attach an unfinished mission, including a shared Workshop task, or focus freely. Pause/resume, minimise to keep exploring, and recover the timer after a reload in the same browser tab. Remaining time follows a deadline so background-tab delays do not extend the session. Finishing the timer grants no XP: explicitly mark the real mission complete when you are ready. Focus uses separate sessionStorage, is excluded from world backups, and resets when a world is restored. There is no focus history or cloud sync yet.
- Visit Skill Garden or open Growth & gallery to connect missions to three paths: Craft, Curiosity and Wellbeing. Plan a new mission there or assign existing work, including completed missions and shared Workshop tasks. A seed becomes a sprout after 1 completed mission, a sapling after 3 and a bloom after 6. The illustrated cards, Classic island and dimensional 3D plants follow the same real progress. Search, Active/Completed/All views, pagination and pencil editing help organise assignments.
- Achievement Gallery has seven keepsakes for your first mission, 10 completed missions, a sapling, a bloom, balanced growth across all three paths, a finished project and the Starfall beacon. Eligible past work counts. Earned badges are remembered when you change assignments or expand a finished project. Each mission belongs to at most one path: reassignment moves its plant credit while preserving completion, project references and total XP. Garden and gallery grant no bonus XP. Path labels also appear in the journal, Home Base, Workshop and attached Focus sessions. There are no streak penalties or recurring habits yet.
- The three-card Island guide introduces movement, missions, ideas, projects, garden growth and local saves. Dismissing it is remembered in this browser; reopen it from the toolbar.
- Backup & restore downloads a versioned JSON world. Import a file (up to 10 MB) or paste backup text, review its counts, then explicitly replace the current world. Before replacement, the app saves a recovery copy of current session progress and preserves the raw original. The previous world can be previewed and restored from the same panel. This is one-level local recovery, not cloud history. Invalid backups and failed writes leave the current world in place.

The Starfall Chapter adds a small island story: walk to three fallen fragments (or open Your island story and follow a memory), finish a real-world mission, then visit the beacon. It awakens an Origin constellation and a chapter celebration. Fragment discoveries and the lit beacon save with your world, including JSON export and restore. Exploring adds no XP; shared mission completion still grants 25 XP exactly once. Previously completed missions count toward the beacon.

Twilight/Daybreak (Moonlight/Dawn in Classic) change the atmosphere; Immerse opens the island in fullscreen where the browser supports it. Sound starts only when enabled and is synthesised locally. It pauses in a hidden tab and is released when switched off. New animations respect the system's reduced-motion preference. Atmosphere, quality, audio, position and camera are session-only. 3D rendering pauses when the world is offscreen or behind a room, and releases resources when its view is replaced.

This is an early playable world. Project archive/reopen is available; richer rewards, free placement, mission/idea organisation, deletion, accounts and cloud sync are future milestones. Mission/idea drafts survive switching journals and leaving their rooms within a session, but not a page refresh or a backup restore.

Save version 3 retains the original storage key and migrates v1/v2 saves without losing existing progress. First upgrade writes preserve originals in `myverse-save-v1-backup-v1` or `myverse-save-v1-backup-v2`. Avatar, decorations, projects, shared tasks, optional mission growth paths and earned achievement records persist across refreshes. Old v3 saves without garden fields remain compatible. Backup previews show assigned missions and earned milestones. Unreadable or unsupported saves are left intact; a visible error explains that new changes are not saved. Explicit backup restore can recover from an unreadable save after preserving its raw original and current session progress.

`npm test` verifies navigation and camera input, idempotent mission completion, reward thresholds, placement rules, save migration, persistence and protection of invalid saves. Build, lint and these tests also run in GitHub Actions. Browser checks cover the actual customisation, unlock, placement and camera flows.

## Technology and ownership

The awakened beacon uses a soft light veil that fades upward and at its edges. Waterfall mist uses 48 locally textured particles in one draw call; Eco hides this detail. Both effects freeze with reduced motion and pause with the rest of the scene. `atmosphere.ts` builds these effects without changing story progress or XP.

React + TypeScript + Vite + Three.js. The 3D world loads in a separate bundle, with code-generated geometry and shaders; it requires WebGL2. `src/world/three/coordinates.ts` maps the original navigation grid to 3D, `models.ts` builds scenery from shared saves, and `experience.ts` manages camera/input/rendering/lifecycle. SVG remains available for Classic and room interiors. No save migration or second progression system is introduced by 3D.

The natural art pass adds sculpted elevation, rooted branching trees with individual leaves and subtle wind, photographed ground/cliff/masonry/bark surfaces, outdoor sky lighting and a reflective pond with ripples. Paths, trees, small scenery and the character use a sampler of the actual rendered ground, while destinations retain level landings. The top and cliffs share the same boundary, including underside views. A shallow open channel joins the pond to its waterfall.

Twelve 1K JPEG maps from [Poly Haven](https://polyhaven.com/) are included locally under CC0; [asset credits and license](public/textures/natural/LICENSE.md) and `sources.json` retain their sources and checksums. They total about 9.4 MB before browser caching. Colour, normal and roughness maps are loaded by the 3D world, with procedural fallback if a file fails. There is no runtime asset API, extra account, Blender installation or new dependency. Geometry and character proportions still have a fantasy style; bespoke imported models and richer character animation remain future art work.

`natural-materials.ts` shares maps across replaceable models for the life of one world and releases them on exit, including late downloads. `batching.ts` combines static surfaces while preserving named models and instanced foliage. Pond reflections use a 512px target, refresh on alternate frames, update immediately after lighting changes and stop in Eco; Eco also removes shadows/postprocessing. Reduced motion freezes leaves, ripples, waterfall effects and story motion. Texture delivery/compression and representative phone/GPU performance remain release checks.

Tests also cover alignment between 3D ground and navigation, Workshop/garden growth from shared missions, achievement retention, save validation and disposal of shared rendering resources. Garden geometry rebuilds only when a plant changes stage; Classic garden artwork skips walking-frame rerenders. Browser QA uses `localhost:5173`, separate from the owner's `127.0.0.1:5173` save. Physical phone touch input and representative GPU performance still need release testing. The 3D bundle is larger than the original illustrated renderer.

Workshop geometry also rebuilds only at a visible build-stage change. Switching between projects at the same stage updates the selected identity while reusing the model; titles and unrelated mission progress do not discard meshes or materials. React text/progress and shared mission XP continue to update normally.

GitHub stores code and progress history. Vercel is the planned host; Supabase is the planned authentication and cloud database service. Neither is needed to run this local checkpoint. No external account or paid service is created by the starter.

## Safe saves across tabs

`useGameSession.ts` subscribes React to `saveRepository.ts`, which coordinates world writes using one origin-scoped Web Lock. Inside the lock, an ordinary save validates the latest stored world and compares it with the session's exact accepted raw base. A stale tab keeps its local work and shows a conflict instead of replacing newer progress. Clean tabs accept external changes; existing form drafts stay local. Saves, original migration backups, explicit restore and one-level recovery retain the v3 format and `myverse-save-v1` key.

The save banner reports pending/failed saves and offers session download, saved-world review and retry. Review shows mission titles and progress for both worlds. Explicitly loading over unsaved work first preserves that session in browser recovery. Restore and saved-world previews are rechecked under the lock; a changed world requires another preview. Replacement clears the tab's Focus timer before remounting it, while a clean external update only clears an attached timer if its mission disappeared. Unsaved/pending changes also request the browser's normal leave-page warning.

Without Web Locks, durable writes remain blocked and session editing/export remain available. The lock protects cooperating tabs on the same origin; older clients that bypass it are outside the guarantee. `localhost:5173` and `127.0.0.1:5173` remain separate worlds. This feature does not provide cross-device or cloud backup.

For disposable browser QA, open `/tests/browser/save-coordination.html` on localhost while running Vite. Its Hold/Release controls deliberately delay the shared lock so two real tabs can enqueue competing saves; its newer-save control deliberately writes version 99 to the QA world. Use `?phone=1` for a 393px CSS frame. These development-only fixtures are not copied into `dist`. Never use the owner's 127.0.0.1 world for this workflow.

For rendering measurements, open `/tests/browser/render-benchmark.html` on localhost and wait for Ready. It builds a deterministic populated world entirely in memory, without reading/writing browser saves. Controls profile unrelated edits, sample a fixed 12-second orbit segment in Quality/Eco, advance selected tasks, switch projects and dispose/remount ten renderers. The visible JSON records model identity/build counts, frame cadence and per-renderer resources. See [measured results and limits](docs/performance/2026-10-18-workshop.md); cadence is not GPU timing, and a warm browser sample is not a phone/cold-load guarantee. This fixture is also excluded from `dist`.

Vercel settings: Vite framework, `npm run build`, output directory `dist`. The app currently uses no client-side routes. Add SPA fallback configuration when routes are introduced. Future Supabase access must use per-user row-level security; server secrets must never enter browser code or Git.

## Progress workflow

For each meaningful working milestone: implement, verify relevant behavior, run build and lint, review the diff, commit with a clear message, then push to the agreed GitHub repository. Use feature branches and previews for bigger changes. Never commit credentials or force-push by default.

See [ROADMAP.md](ROADMAP.md) for the product direction.
