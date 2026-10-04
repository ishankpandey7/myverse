# MyVerse product direction

## Agreed with the owner

- Beginner-friendly collaboration in normal Hindi/English; no elaborate prompts required.
- Quality matters more than taking a fixed number of weeks.
- Attract and retain real users through visual identity, enjoyable gameplay and useful features. Validate actual input and interaction flows alongside automated checks.
- Game-like, cozy fantasy with space magic; an isometric island, character and meaningful progression.
- Combine a gamified personal task system with an idea vault.
- Normal source repository owned by the user, not Codex Sites.
- Commit and push working milestones throughout development.
- Create a new public GitHub repository for this project.

## Checkpoint 1: foundation

- [x] React/TypeScript app and responsive initial island illustration.
- [x] Missions, XP, levels, idea capture and idea-to-mission flow.
- [x] Browser-local persistence.
- [x] Create public repository: https://github.com/ishankpandey7/myverse.

## Checkpoint 2: first playable world

- [x] Expand the island with forest, pond, fountain, paths and waterfall.
- [x] Click/tap walking, WASD/arrow movement and obstacle-aware routes.
- [x] Home Base and Observatory visits open the existing journals on arrival.
- [x] Camera zoom, drag, follow and whole-island view; mobile navigation.
- [x] Cursor-anchored touchpad pinch/scroll and mouse-wheel zoom, with camera regression tests.
- [x] Navigation regression tests and GitHub checks.
- [x] Keep mission and idea drafts separate while switching journals.
- [ ] Refine final art direction based on the owner's feedback.
- [x] Character name, outfit colours, skin tone and hat, with shared world/preview artwork.
- [x] Lantern, moonflower and crystal rewards at 25/75/150 XP; place, move and return each between four garden spots.
- [x] Version 2 saves and original-save backup on v1 migration; tests for XP, rewards, placement and save protection.
- [x] Home Base cottage: station-based character movement, shared mission board, active/completed views, earned wonder shelf, keyboard exit and responsive layout.
- [x] Observatory interior with idea desk, clickable constellation, search, six-star pages and conversion into missions.
- [ ] Free movement inside rooms.
- [x] Opt-in sound controls and reduced-motion support.
- [x] Mission/idea title editing, including shared Workshop tasks. Idea search is available in the Observatory.
- [x] Mission title search shared between the island journal and Home Base's Active/Completed board, with match counts, clear controls and useful empty states. Adding/renaming a mission and world restore clear the search; it is session-only and grants no XP.
- [ ] Mission/idea archiving and tags.
- [x] JSON backup export, previewed restore and previous-world recovery, with version validation and failed-write protection.
- [x] First-visit guide with replay and browser-local dismissal.
- [x] Automated tests for progression, migration, editing and restore behavior.
- [x] Starfall Chapter: three reachable fragments and their memories, a mission-gated beacon, permanent Origin constellation and chapter celebration. Exploration does not duplicate mission XP.
- [x] Moonlight/Dawn atmosphere, aurora, fireflies, lamplight, opt-in synthesised sound and immersive fullscreen; new animations respect reduced motion.
- [x] Playable 3D Moonhollow: faceted floating island, dimensional buildings/character/decorations, ringed planet, stars, animated water, shadows and glow. Orbit/zoom/follow camera, camera-relative walking and existing obstacle-aware routes. All three destinations open the shared rooms.
- [x] Living 3D Workshop follows the selected project's four real task stages; selecting another build changes its model and opens that project's planning room.
- [x] Classic SVG switch and automatic fallback for unavailable/lost WebGL; quality/Eco control, responsive camera framing, paused rendering behind rooms and when offscreen, GPU cleanup and lazy loading.
- [x] Free 360° camera with top/side/underside views, unrestricted screen-space pan, mouse/touch Pan mode and reset. Camera drags never trigger walking; the island underside cannot select hidden buildings or ground.
- [x] Detailed 3D art pass: layered textured cliffs, branch-based evergreen foliage, stone/wood buildings, overlapping slate roofs, copper Observatory ribs, banded planet rings, environment reflections and reflective water. Locally generated materials require no asset service; shared textures are disposed with their model. Art remains stylized fantasy.
- [x] Atmospheric 3D detail: soft, fading beacon light and a small waterfall mist particle system. Reduced motion freezes both effects; Eco hides the mist. These effects read the existing story state and grant no XP.
- [ ] Physical touch-device input and GPU performance budgets for the 3D world. Room interiors remain SVG and station-based.

## Checkpoint 3: ideas become projects

- [x] Project Workshop building, multiple projects, milestones, shared mission tasks, four-stage progress model and v3 save migration with backups.
- [x] Project and milestone title editing.
- [x] Project archive/reopen shelves and idea-to-project conversion from the journal and Observatory; shared missions and XP are preserved.
- [x] Browser interaction QA for archive/reopen and Observatory idea-to-project conversion; phone viewport layout checked. Physical touch input remains a release check.
- Habit recurrence with timezone-aware dates and optional streaks.
- [x] Calm Focus mode with shared mission selection, duration presets/custom minutes, pause/resume, background-safe deadlines and same-tab reload recovery. Timer completion grants no XP; real mission completion remains explicit and counted once. Successful world restore resets the separate timer session.
- [ ] Weekly reflection and optional focus history.
- Skill Garden and achievement gallery.

## Checkpoint 4: accounts and release

- Supabase schema migrations, authentication and per-user access policies.
- Safe migration from browser saves; define conflicts and backup behavior.
- Vercel deployment linked to GitHub, with branch previews.
- Phone usability, accessibility, real-use testing and performance review.

## Later, only if useful

AI planning buddy, more explorable islands, richer 3D rooms, friends challenges and calendar integrations. Keep game data separate from artwork so rendering changes preserve progress. API-backed features need a separate service setup and cost decision.

## Bigger release direction — proposed, not implemented

MyVerse becomes a personal universe shaped by the things its owner actually does. Build depth around that promise in verified milestones:

1. **A world worth returning to:** richer island stories, satisfying unlocks, distinctive artwork and accessibility. Starfall is the first complete example of explore → real mission → visible world change.
2. **Useful daily play:** mission search/organisation, a calm focus ritual, optional habits and weekly reflection. No punishment for breaks; avoid turning every action into a grind.
3. **Projects leave a mark:** project-specific monuments, a Skill Garden and an achievement gallery. Completed real tasks develop the world rather than awarding duplicate XP.
4. **A reliable public release:** Supabase accounts, ownership policies, save migration/conflict recovery, Vercel previews and deployment, phone testing and performance budgets.
5. **Expand after the core works:** additional explorable islands, richer 3D gameplay and opt-in shared challenges. Decide scope and service costs before adding cloud or AI dependencies.

Starfall verification: all three fragments collected through browser walking, a real mission completed once for 25 XP, beacon/celebration unlocked and persisted through reload. Fullscreen, sound toggles, Dawn/Moonlight and reduced-motion styles checked. Mobile viewport checked at 393px without horizontal overflow; physical touch devices remain part of release testing. Existing backups/recovery and corrupt-story protection have regression tests.

3D verification: all three rooms reached from the rendered world; a project created with two shared tasks, completed across Workshop and Home Base for exactly 50 XP, and its island model progressed through all four stages. Camera-relative keyboard movement stayed on walkable ground; click walking retained follow, dragging released it, and zoom changed distance in the correct direction. Story, avatar and placed lantern persisted through reload. Orbit, reduced motion, lighting, Eco, sound and fullscreen checked. Backup file input → preview → restore rebuilt one canvas and retained progress/recovery; a deliberately lost WebGL context switched to Classic without changing the save. File-input integration is now browser-verified through automation; the native operating-system picker itself was not controlled. Unit suite: 43 passing tests, plus production build and strict lint. The separate 3D chunk is about 172 KB gzipped; its size still triggers Vite's default chunk warning.

Free-camera verification: native controls complete two full turns and reach overhead/underside angles; pan preserves viewing direction beyond the old focus boundary. Browser mouse drags reached side, top and underside views, left-drag Pan mode and right-drag moved the view without walking, Reset restored rotate mode, and clicking the cottage still opened Home Base. Underside clicks did not select hidden ground/buildings. Island rock gaps exposed by the new angles were closed and covered by a surface-edge regression test. Phone viewport Pan toggle works at 393px without horizontal overflow; physical touch gestures remain unverified.

Detailed-art verification: a JSON backup restored the completed Workshop, avatar, decoration and lit constellation with 50 XP; the updated world opened all three rooms, switched Twilight/Daybreak and reached the underside with mouse orbit. Eco and the 393px phone viewport rendered without horizontal overflow. Reload and Classic → 3D retained the same progress and one canvas. Shared texture/shader-map disposal has a regression test. Representative physical phone/GPU performance remains unmeasured; increased geometry, textures and 2048px shadows still need device budgeting.

## Quality bar

Mission-search verification: browser actions covered trimmed/case-insensitive matches, no results, clear-button keyboard focus, shared journal/room queries, Active/Completed views, mission addition and idea conversion clearing a filter, rename preserving IDs/completion, completion for exactly 50 XP across both views, reload and backup restore. The 393px journal and Home Base search fit without horizontal overflow. All 49 existing regression tests pass; save schema remains v3 and search is excluded from backups.

Focus verification: six timer regression tests bring the suite to 49, covering deadline catch-up, pause/resume, recovery, malformed timer data, duration limits, storage failure and explicit shared-task XP. Browser actions verified unattached/attached sessions, paused and running reload recovery, simulated delayed expiry, explicit mission completion and its completed state after reload. Backup file restore cleared the running timer. The 393px dialog fits without horizontal overflow, long mission titles wrap, Escape returns focus to the opener, action changes keep keyboard focus inside the dialog and reduced motion stops the orbit animation. The timer updates its own component without rerendering the 3D world each second. Physical phone input and long real-world focus sessions remain release checks.

Atmosphere verification: beacon light and waterfall mist rendered without runtime/shader errors in normal and emulated reduced-motion modes. Eco toggled the mist detail and the 393px viewport retained one canvas without overflow. The completed Workshop and 50 XP remained intact. The current 3D bundle is about 173 KB gzipped, still above Vite's default chunk-warning threshold.

Real functionality behind visible controls. No invented progress or fake metrics. Useful rewards without punishment for taking breaks. Verify saves, repeat completion, small screens and keyboard operation before calling a milestone ready.
