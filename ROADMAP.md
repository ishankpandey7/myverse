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
- [ ] Sound controls; reduced-motion support is already present.
- Mission/idea editing, archiving, search and tags.
- Versioned save repository, export/import and recovery from invalid saves.
- Meaningful automated tests for progression, migration and save behavior.

## Checkpoint 3: ideas become projects

- [x] Project Workshop building, multiple projects, milestones, shared mission tasks, four-stage progress model and v3 save migration with backups.
- [ ] Project editing, archiving and idea-to-project conversion.
- Habit recurrence with timezone-aware dates and optional streaks.
- Focus timer and weekly reflection.
- Skill Garden and achievement gallery.

## Checkpoint 4: accounts and release

- Supabase schema migrations, authentication and per-user access policies.
- Safe migration from browser saves; define conflicts and backup behavior.
- Vercel deployment linked to GitHub, with branch previews.
- Phone usability, accessibility, real-use testing and performance review.

## Later, only if useful

AI planning buddy, richer islands, possible 3D exploration, friends challenges and calendar integrations. Keep game data separate from artwork so later rendering changes can preserve progress. API-backed features need a separate service setup and cost decision.

## Quality bar

Real functionality behind visible controls. No invented progress or fake metrics. Useful rewards without punishment for taking breaks. Verify saves, repeat completion, small screens and keyboard operation before calling a milestone ready.
