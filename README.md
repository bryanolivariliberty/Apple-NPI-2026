# Apple NPI 2026 — Offer Tracker

A tiny static site, no backend, no build step. Two pages share one data file:

| File | Who it's for | URL after deploy |
|---|---|---|
| `view.html` | Everyone else — read only | `yourproject.vercel.app/` |
| `editor.html` | You — updates status/progress/comments | `yourproject.vercel.app/editor` |
| `data.json` | The single source of truth both pages read | — |

There are no names/owners in this version — just milestone, status, progress, comments, risk, and mitigation, grouped the same way as the original tracker (Offer Definition → Planning → Development - Apple Announcement → Operational Readiness).

## How the "live update" flow works

This is a **static** site — there's no database, so edits don't broadcast automatically to every viewer the instant you type. Here's the actual flow:

1. Open `/editor` and update statuses, progress %, comments, risk, mitigation. Everything autosaves to your browser's local storage as you go, so you won't lose work if you close the tab.
2. When you're ready to publish what you see to everyone, click **"Export updated data.json"**. This downloads a fresh `data.json`.
3. Replace the old `data.json` in your GitHub repo with the downloaded one (drag-and-drop upload on github.com works fine, or `git add/commit/push` locally).
4. Vercel is watching the repo, so the push triggers an automatic redeploy — usually live within ~30–60 seconds.
5. Anyone on `view.html` sees the new numbers next time they load or refresh the page (the page always fetches `data.json` fresh, never a cached copy).

**"Copy JSON to clipboard"** is a shortcut if you'd rather paste the JSON straight into GitHub's web editor for `data.json` instead of uploading a file.

**"Reset to last published data.json"** discards your local browser draft and reloads whatever is currently live — useful if you want to throw away edits you haven't exported yet.

## Deploying from scratch

1. Create a new GitHub repo and add these files to the root: `view.html`, `editor.html`, `data.json`, `app.js`, `styles.css`, `vercel.json`.
2. Go to [vercel.com/new](https://vercel.com/new), import that repo. No framework preset needed — Vercel will serve it as a static site automatically.
3. Deploy. Vercel gives you a URL like `your-repo.vercel.app`.
   - `your-repo.vercel.app/` → the view-only page
   - `your-repo.vercel.app/editor` → your editing page
4. (Optional) Since `editor.html` isn't password-protected, if you don't want it publicly guessable, rename it to something non-obvious (e.g. `editor-b2b-2026.html`) before pushing, or turn on Vercel's password protection / a Vercel team with restricted access for that route.

## Editing the milestone list itself

Adding, removing, or renaming milestones/sections isn't done in the browser — edit `data.json` directly (or ask me to regenerate it). Each row is one of:

```json
{ "type": "banner", "level": "dark", "title": "Offer Definition" }
{ "type": "sub", "title": "Product & Offer" }
{ "type": "item", "id": "m001", "description": "Dummy offer configuration",
  "status": "Pending", "progress": 0, "comments": "", "risk": "", "mitigation": "" }
```

`level` on a banner is `"dark"` or `"light"` to match the two banner styles in the original tracker.

## No responsible/owner field

Per your request, this version intentionally excludes an assigned-owner column. If you want to add it back later, it's a one-line addition to the `item` schema and a small tweak to `app.js`'s render functions.
