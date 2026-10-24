# Guitar Tools — Static Web App

A local-first guitarist's toolkit: custom tuning library, personal Guitar Pro song library, and notation/player with a synchronized fretboard.

## Current status

- Stage A: visual design approved (visual references supplied separately).
- Stage B / P0: alphaTab feasibility proof-of-concept **not yet implemented**.
- The files in `src/` currently show only a dependency-free placeholder shell.

## Repository conventions

- Static HTML/CSS/vanilla JavaScript ES modules. No mandatory Node runtime, Vite, React, or backend.
- GitHub Pages serves `index.html` from the `main` branch's repository root.
- Paths must work at `/GuitarTools_WebApp/` or another GitHub Pages project subpath; use relative paths or a derived site base URL.
- Do not modify original user-imported Guitar Pro bytes; do not upload them to any server.
- Document and pin all third-party versions and attribution requirements.

## Start here

1. Read `AGENTS.md`, then `docs/PROJECT_BRIEF.md` and `docs/ARCHITECTURE.md`.
2. Read `docs/STAGE_B_ACCEPTANCE.md` for the current technical gate.
3. Work Astra's assignment: `docs/ASTRA_STAGE_B_PROMPT.md`.
4. Use local HTTP hosting for ES modules (e.g. WebStorm's static web server or `python -m http.server 8000` as an optional local dev convenience); opening `file://` is not a valid deployment test.

## Deploy via GitHub Pages

1. Create GitHub repo `GuitarTools_WebApp` and upload **the contents of this folder to the repo root** (not the enclosing folder itself).
2. In repository **Settings → Pages**, choose **Deploy from a branch**, `main`, and `/(root)`.
3. Visit `https://nitrous-git.github.io/GuitarTools_WebApp/` (assuming the repo is owned by `nitrous-git`).
4. For Stage B, verify audio, Web Workers, worklets, font assets and local-file imports under this actual HTTPS subpath after the user pushes Astra's output.

## Scope boundaries

Stage B is for SDK feasibility only, **not** the final three-page application. No IndexedDB library, tuning editor, elaborate custom UI, full GP editor, account system, remote tab search, or GP conversion in Stage B.

## Visual references

`design/DESIGN_REVIEW.md` holds the approved visual direction. The Stage A mockups (`GuitarTools_StageA_VisualDesign_v1.zip`) are distributed separately to avoid committing third-party reference score images to a public repo. They are not production code or validated notation data.

## Licensing

The new application's code license is undecided. alphaTab and other third-party distributables retain their independent license obligations. Document redistributed vendor files and include their licenses when those files are added. Do not redistribute copyrighted tab/song fixture collections.
