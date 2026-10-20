# GitHub Pages — Mo RPG Hero

The Pages build is a lightweight browser edition of the auto-battle RPG. It is separate from the Electron desktop renderer and does not modify the Android WebView entry point.

## Publish

1. Open **Settings → Pages** and set the source to **GitHub Actions** (the workflow can publish through the Pages deployment API).
2. Push or merge a change to `main`, or run **Deploy GitHub Pages** from Actions.
3. Open the Pages URL shown in the workflow summary. For a user repository named `rpgauto-battle`, the typical URL is `https://arkansasio.github.io/rpgauto-battle/`.

The workflow builds a static artifact and deploys it using the official GitHub Pages Actions. The web game uses no server-side API and saves its local demo progress in browser storage. It is a playable preview, not a multiplayer backend.

## Local preview

From the repository root, serve the files with any static HTTP server. For example:

```bash
npx --yes http-server docs/pages -p 8080
```

Then browse to `http://localhost:8080`.

## Scope and limits

- Auto-battle combat, waves, simple hero progression, loot, and browser-local save.
- Mobile-friendly layout and controls.
- No account system, online matchmaking, cloud saves, or authoritative multiplayer combat.
- The Electron app and Android build continue using their existing entry points.
