# Apple NPI 2026 — Offer Tracker

A tiny static site, no backend, no build step. Two pages share one data file:

| File | Who it's for | URL after deploy |
|---|---|---|
| `index.html` | Everyone else — read only | `yourproject.vercel.app/` |
| `editor.html` | You — updates status/progress/comments | `yourproject.vercel.app/editor` |
| `data.json` | The single source of truth both pages read | — |

Each milestone has: description, **Responsible** (defaults to "Not Assigned Yet" for everyone until you fill it in), status, progress, comments, risk, and mitigation — grouped the same way as the original tracker (Offer Definition → Planning → Development - Apple Announcement → Operational Readiness).

## Editor password

`editor.html` is gated behind a password so casual visitors can't edit it. **Important caveat: this is a front-end-only deterrent, not real security.** The password lives in plain text inside `editor.html`'s JavaScript, so anyone who opens the browser's "View Page Source" or DevTools can read it. It stops casual/accidental edits, not a determined person.

- Password: `B2BCX`
- To change it: open `editor.html`, find the line `const EDITOR_PASSWORD = "B2BCX";` near the bottom, and replace the text between the quotes.
- Once someone enters the correct password, their browser remembers it for that browser tab session (via `sessionStorage`) — they won't be asked again until they close the tab.

**For real access control**, don't rely on this password alone. Instead, use Vercel's own Deployment Protection / password-protection feature (Project → Settings → Deployment Protection) — that puts the check on Vercel's server before the page ever loads, which the front-end gate here can't do.

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

1. Create a new GitHub repo and add these files to the root: `index.html`, `editor.html`, `data.json`, `app.js`, `styles.css`, `vercel.json`.
2. Go to [vercel.com/new](https://vercel.com/new), import that repo. No framework preset needed — Vercel will serve it as a static site automatically.
3. Deploy. Vercel gives you a URL like `your-repo.vercel.app`.
   - `your-repo.vercel.app/` → the view-only page
   - `your-repo.vercel.app/editor` → your editing page
4. (Optional) Since `editor.html` isn't password-protected, if you don't want it publicly guessable, rename it to something non-obvious (e.g. `editor-b2b-2026.html`) before pushing, or turn on Vercel's password protection / a Vercel team with restricted access for that route.

## Adding, removing, and reorganizing milestones (in the editor UI)

You no longer need to hand-edit `data.json` for structural changes — `/editor` now has three tools above the milestone list:

- **+ Add Section** — creates a new banner (choose dark or light style, matching "Offer Definition" vs "Planning") and pick where it goes using the "Insert after" dropdown.
- **+ Add Subsection** — same idea, one level down (like "Product & Offer" under "Planning").
- **+ Add Task** — adds a new milestone row anywhere in the list.

Every section, subsection, and task also has inline controls right on the page:
- **✎ Rename** — change a section/subsection title
- **🗑 Delete section / Delete subsection** — removes it and everything nested under it (you'll see a confirmation showing exactly how many rows will go)
- **🗑 Remove task** — removes a single milestone
- **▲ Move up / ▼ Move down** — reposition a section, subsection, or task relative to its neighbors

All of this happens in your browser draft (autosaved locally) exactly like the status/progress edits — nothing is "real" until you **Export updated data.json** and push it to GitHub as usual.

## No responsible/owner field

Per your request, this version intentionally excludes an assigned-owner column. If you want to add it back later, it's a one-line addition to the `item` schema and a small tweak to `app.js`'s render functions.

## Branding

- The header uses the Liberty Business logo (`assets/liberty-business-logo.png`) on the left, with "B2B GTM Team" as the eyebrow label above the product name.
- Colors are pulled directly from the logo: blue `#0071CE` and orange `#FF5300`, used for accents, buttons, badges, and links throughout both pages.
- The header background is a light grey rather than navy/blue, so the logo's own blue doesn't visually blend into a same-colored banner.
- If you swap in a different logo file, keep the filename `liberty-business-logo.png` (or update the `<img src="...">` reference in both `index.html` and `editor.html`), and a roughly landscape/wide logo with a transparent background will fit the 42px-tall header slot best.
