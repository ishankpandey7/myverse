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

- A playable 3D floating island with layered, textured cliffs, branch-based pine woods, a stone-and-timber cottage, evolving Workshop, copper-domed Observatory, reflective pond/waterfall, a banded ringed planet and star field. The existing SVG island is available through Classic view and automatic WebGL fallback. Interiors remain SVG rooms.
- Click/tap the ground to walk; click a building to visit. Drag to orbit the 3D camera through a full 360° with top, side and underside views (pan in Classic). Right-drag or Shift-drag to move the camera freely. Pan camera mode makes left-drag or one-finger touch move the view and disables tap walking until switched off. Two-finger touch combines pan and pinch zoom. Reset camera restores the initial view and rotate mode. Focus the world and use WASD/arrow keys for camera-relative movement in 3D; Escape stops a route. E/Enter opens a nearby building.
- Select Home Base, Workshop or Observatory to walk to its entrance and open the shared room. Destination controls also work with keyboard and touch.
- Pinch or scroll over the world to zoom; +/− also work. Manual camera input releases follow/orbit. Classic retains its 50–200% cursor-anchored zoom. Scrolling outside the canvas scrolls the page.
- Follow the character, reset the camera, or enable a slow cinematic orbit. Phone camera framing shows the whole island; zoom in to explore. Eco mode removes postprocessing/shadows and limits pixel density. Classic is the lighter alternative.
- Navigation routes around buildings, tree trunks, water and island edges. Artwork and movement geometry live separately under `src/world` so the world can grow.
- Add missions, complete them once, and receive 25 XP each. Every 100 XP raises your level.
- Open the profile button to customise your character's name, outfit, skin tone and hat. The preview and island use the same character artwork.
- Earn a Wish lantern at 25 XP, Moonflowers at 75 XP and a Stargazer crystal at 150 XP. Island collection lets you place one copy of each in four prepared garden spots, move it, or return it to your collection. Placement does not spend XP. These are ornamental, non-blocking decorations.
- Capture ideas and turn them into missions.
- Saves to the current browser using localStorage. Clearing browser data removes this save and local recovery copies; download backups regularly. Cloud sync is future work.
- Keyboard access, reduced-motion support and storage-failure feedback.

- Enter Home Base from the island to visit a furnished cottage. Choose the mission board or wonder shelf to move your customised character between those stations. Pin and complete missions, switch between active/completed lists, and see earned keepsakes on the shelf. The room shares the island's missions, XP and draft; exit with either door control or Escape. Shelf keepsakes showcase unlocks without moving island decorations. Room movement is station-based, not free walking.

- Enter the Idea Observatory to save ideas at a writing desk and explore their clickable constellation beneath a telescope dome. Search ideas and browse six stars per page. Selecting a star or list entry opens its full text; converting it moves it once to the Home Base mission board without granting XP. Both rooms use the same browser save and preserve drafts until refresh.

- Walk to Project Workshop to create projects, milestones and tasks. Project tasks are shared Home Base missions and award 25 XP once, whichever room completes them. The selected project's model grows through blueprint, foundations, building and finished stages. Empty milestones remain unfinished. Switch projects with the workbench selector. Created projects persist; unfinished Workshop form drafts last only while that room/project view stays open.

- Rename missions, ideas, projects and milestones with their pencil controls. Save or cancel the edit (Enter/Escape work too). IDs, completed state, XP and shared project task references remain unchanged.
- The three-card Island guide introduces movement, missions, ideas, projects and local saves. Dismissing it is remembered in this browser; reopen it from the toolbar.
- Backup & restore downloads a versioned JSON world. Import a file (up to 10 MB) or paste backup text, review its counts, then explicitly replace the current world. Before replacement, the app saves a recovery copy of current session progress and preserves the raw original. The previous world can be previewed and restored from the same panel. This is one-level local recovery, not cloud history. Invalid backups and failed writes leave the current world in place.

The Starfall Chapter adds a small island story: walk to three fallen fragments (or open Your island story and follow a memory), finish a real-world mission, then visit the beacon. It awakens an Origin constellation and a chapter celebration. Fragment discoveries and the lit beacon save with your world, including JSON export and restore. Exploring adds no XP; shared mission completion still grants 25 XP exactly once. Previously completed missions count toward the beacon.

Twilight/Daybreak (Moonlight/Dawn in Classic) change the atmosphere; Immerse opens the island in fullscreen where the browser supports it. Sound starts only when enabled and is synthesised locally. It pauses in a hidden tab and is released when switched off. New animations respect the system's reduced-motion preference. Atmosphere, quality, audio, position and camera are session-only. 3D rendering pauses when the world is offscreen or behind a room, and releases resources when its view is replaced.

This is an early playable world. Project archive/reopen is available; richer rewards, free placement, mission/idea organisation, deletion, accounts and cloud sync are future milestones. Mission/idea drafts survive switching journals and leaving their rooms within a session, but not a page refresh or a backup restore.

Save version 3 retains the original storage key and migrates v1/v2 saves without losing existing progress. First upgrade writes preserve originals in `myverse-save-v1-backup-v1` or `myverse-save-v1-backup-v2`. Avatar, decorations, projects and shared tasks persist across refreshes. Unreadable or unsupported saves are left intact; a visible error explains that new changes are not saved. Explicit backup restore can recover from an unreadable save after preserving its raw original.

`npm test` verifies navigation and camera input, idempotent mission completion, reward thresholds, placement rules, save migration, persistence and protection of invalid saves. Build, lint and these tests also run in GitHub Actions. Browser checks cover the actual customisation, unlock, placement and camera flows.

## Technology and ownership

React + TypeScript + Vite + Three.js. The 3D world loads in a separate bundle, with code-generated geometry and shaders; it requires WebGL2. `src/world/three/coordinates.ts` maps the original navigation grid to 3D, `models.ts` builds scenery from shared saves, and `experience.ts` manages camera/input/rendering/lifecycle. SVG remains available for Classic and room interiors. No save migration or second progression system is introduced by 3D.

The current art pass uses locally generated colour/bump textures, beveled architecture, instanced roof slates/foliage, environment reflections, sharper shadows and restrained bloom. `surfaces.ts` owns model-local material palettes and `celestial.ts` builds the planet. Maps are shared within each disposable model and released with its GPU resources. No external texture service, Blender installation or additional dependency is needed for this pass. This remains stylized fantasy, not photoreal artwork; bespoke imported models and animation are a future art decision.

Tests also cover alignment between 3D ground and navigation, Workshop growth from shared missions, and disposal of shared rendering resources. Browser QA uses `localhost:5173`, separate from the owner's `127.0.0.1:5173` save. Physical phone touch input and representative GPU performance still need release testing. The 3D bundle is larger than the original illustrated renderer.

GitHub stores code and progress history. Vercel is the planned host; Supabase is the planned authentication and cloud database service. Neither is needed to run this local checkpoint. No external account or paid service is created by the starter.

Vercel settings: Vite framework, `npm run build`, output directory `dist`. The app currently uses no client-side routes. Add SPA fallback configuration when routes are introduced. Future Supabase access must use per-user row-level security; server secrets must never enter browser code or Git.

## Progress workflow

For each meaningful working milestone: implement, verify relevant behavior, run build and lint, review the diff, commit with a clear message, then push to the agreed GitHub repository. Use feature branches and previews for bigger changes. Never commit credentials or force-push by default.

See [ROADMAP.md](ROADMAP.md) for the product direction.
