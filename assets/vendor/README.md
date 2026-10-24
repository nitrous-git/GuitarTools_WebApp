# Bundled runtime — alphaTab 1.8.4

Source: https://registry.npmjs.org/@coderline/alphatab/-/alphatab-1.8.4.tgz
Upstream source: https://github.com/CoderLine/alphaTab (release v1.8.4).
Package metadata reports 1.8.4; distributable header reports build 34.

Included readable ESM entry/core/worker/worklet, Bravura WOFF/WOFF2, Sonivox SF2.
All load from `./assets/vendor/alphatab/`, including module-relative worker/worklet imports.
No CDN, package manager or bundler is required to run the site.

## One local compatibility fix (2026-10-24)

In `alphaTab.core.mjs`, `AlphaSynthWebWorkerApi.loadedMidiInfo` returned
`this.loadedMidiInfo`, recursively invoking itself. Registering `api.midiLoaded`
with the worker enabled produced `RangeError: Maximum call stack size exceeded`
in Chromium 133.0.6943.0. Changed that return to `this._loadedMidiInfo`, the existing
backing field written by the worker's MIDI-loaded handler. No other upstream
code was changed. This is **1.8.4 + a local one-line fix**, not an untouched upstream build.
The readable modified MPL-covered source is included. Remove the fix only after
checking a future upstream release and rerunning the browser tests.

## Licenses

- alphaTab: Mozilla Public License 2.0, `alphatab/LICENSE`; retain source notices.
  Integrated library notices remain in the distributed module headers.
- Bravura: SIL Open Font License 1.1, `alphatab/font/Bravura-OFL.txt`.
- Sonivox: Apache License 2.0, `alphatab/soundfont/LICENSE`,
  `alphatab/soundfont/APACHE-2.0.txt` and upstream README. Copyright Sonic Network Inc.

Only the SoundFont is fetched after Enable audio. The browser's audio context is
activated in the click handler. Use localhost HTTP or HTTPS (GitHub Pages), not file URLs.
