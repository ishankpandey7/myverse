# MyVerse

A cozy personal world where real-life missions and saved ideas become progress.

## Run locally

Install Node.js 24 or a version supported by Vite, then run:

```sh
npm install
npm run dev
```

Open the localhost link printed in the terminal. `npm run build` checks TypeScript and builds the app; `npm run lint` checks source code.

## First checkpoint

- Original SVG floating island and responsive React interface.
- Add missions, complete them once, and receive 25 XP each. Every 100 XP raises your level.
- Capture ideas and turn them into missions.
- Saves to the current browser using localStorage. This is not cloud backup: clearing browser data removes this save. Export/import and cloud migration are planned before serious daily use.
- Keyboard access, reduced-motion support and storage-failure feedback.

This is an initial functional art direction, not the finished game. Avatar movement, decorations, rewards, projects, editing, deletion, accounts and cloud sync are future milestones.

## Technology and ownership

React + TypeScript + Vite, with an SVG world in this first checkpoint. The code is a normal local Git project; Codex Sites is not used. Later world interactions can use a dedicated rendering layer if the gameplay needs it.

GitHub stores code and progress history. Vercel is the planned host; Supabase is the planned authentication and cloud database service. Neither is needed to run this local checkpoint. No external account or paid service is created by the starter.

Vercel settings: Vite framework, `npm run build`, output directory `dist`. The app currently uses no client-side routes. Add SPA fallback configuration when routes are introduced. Future Supabase access must use per-user row-level security; server secrets must never enter browser code or Git.

## Progress workflow

For each meaningful working milestone: implement, verify relevant behavior, run build and lint, review the diff, commit with a clear message, then push to the agreed GitHub repository. Use feature branches and previews for bigger changes. Never commit credentials or force-push by default.

See [ROADMAP.md](ROADMAP.md) for the product direction.
