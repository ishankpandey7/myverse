# Working on MyVerse

- The owner is new to coding. Communicate in clear, friendly Hinglish and handle routine setup yourself.
- Build an owned React/TypeScript project. Do not migrate it to Codex Sites.
- The target is a cozy, game-like personal island combining real-world missions and an idea vault. Quality matters more than a fixed schedule.
- Product goal: make people want to explore and return through a distinctive visual identity, satisfying interactions and useful features. Treat onboarding, usability, responsive layout and real device input as part of each feature; passing automated tests alone is not proof of a polished experience.
- Keep ROADMAP.md honest about current functionality and planned features.
- Verify relevant behavior, build and lint before committing a meaningful working milestone. Push milestones to the configured GitHub remote as requested by the owner; do not force-push.
- Keep credentials and local environment files out of Git. Vercel and Supabase are planned but are not configured yet.
- Data currently saves only in the browser. Preserve the save format or implement a migration when changing it.
- Saves now use version 3 under the existing myverse-save-v1 key. Preserve missions, ideas, avatar, decoration placements and projects. First writes upgrading v1/v2 keep original backups. Project taskIds reference shared missions; never award a separate copy of XP for Workshop completion. Never overwrite unreadable or newer saves.
- Explicit user-confirmed backup restore may replace a world after preserving raw original and current session recovery copies. Keep ordinary autosave protected. Editing titles must preserve IDs and XP. Browser-local recovery is not cloud backup.
