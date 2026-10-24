# Guitar Pro fixture policy

The Stage B reader must offer user-operated local file import. No copyrighted song collection is bundled.

Place original/self-authored/redistributable test files in `tests/fixtures/public/` if you have usage rights. Personal or commercial Guitar Pro files must remain in `tests/fixtures/private/` (gitignored) or be selected locally through the browser picker.

Required matrix: `.gp3`, `.gp4`, `.gp5`, `.gpx` (GP6), `.gp` (GP7), `.gp` (GP8); plus multi-track/drums, repeat and endings, tempo changes, nonstandard tuning, 7/8 strings, capo, bends, chord, ties, corrupt file.

Only mark a format **PASS** if an actual corresponding file was imported and rendered/played successfully. If the fixture is unavailable, mark **NOT TESTED**, not pass. Include file provenance without republishing protected bytes.
