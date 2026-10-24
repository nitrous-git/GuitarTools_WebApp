# Stage B original fixtures

- `stage-b.tex`: newly authored four-bar technical exercise, not a commercial
  song. Four tracks: six strings E2–E4, seven strings B1–E4, eight strings
  F#1–E4, percussion. Bar 1 has a three-note chord, single note, rest and low
  open E. Bars 1–2 repeat twice; bar 3 changes 120 → 90 BPM. Bar 4 is a chord.
- `pitch-e4.tex`: newly authored open high E4 (MIDI 64), four seconds at 60 BPM,
  then a rest. Nylon guitar SoundFont program 25 (zero-based).
- `stage-b-generated.gp`: generated once from `stage-b.tex` using alphaTab
  1.8.4's `exporter.Gp7Exporter().export(score)`. ZIP VERSION is `7.0`.
  This tests actual file bytes, the picker, GP import, render and playback,
  but is **not an independently authored Guitar Pro 7 compatibility fixture**.

These simple original testing exercises may be redistributed with this POC.
No third-party music is included. Corrupt and empty inputs are generated in
memory by the tests. No GP3/4/5/GPX or native Guitar Pro 7/8 files were available.
Bends, harmonics, ties, alternate endings, capo and complex multi-voice files
still need a separate lawful corpus. No application export/conversion feature
was added; the one generated file is only a test fixture.
