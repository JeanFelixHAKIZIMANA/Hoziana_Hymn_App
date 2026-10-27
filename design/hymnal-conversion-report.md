# Hymnal conversion report

Hymns parsed: 136 (numbers 1–136). Missing numbers: none.

| Check | Count | Hymns |
| --- | --- | --- |
| refrain inferred from line count | 75 | 1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 27, 28, 30, 31, 32, 34, 37, 38, 40, 41, 43, 51, 52, 53, 55, 56, 57, 60, 61, 65, 69, 71, 72, 74, 75, 77, 80, 81, 84, 85, 87, 88, 92, 93, 99, 102, 103, 108, 112, 113, 116, 117, 118, 123, 125, 126, 127, 128, 129, 130, 132, 134, 136 |
| author not recognised in credit | 8 | 1, 26, 35, 39, 51, 52, 70, 124 |
| call-and-response parts (Gore/Bose) | 89 | 2, 8, 11, 12, 14, 16, 18, 20, 22, 23, 24, 25, 26, 27, 30, 32, 33, 37, 38, 40, 41, 44, 45, 46, 47, 48, 49, 50, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 65, 67, 68, 69, 70, 72, 73, 74, 76, 77, 80, 81, 82, 83, 86, 87, 88, 89, 90, 91, 93, 94, 95, 96, 97, 98, 101, 102, 103, 104, 105, 106, 107, 111, 114, 115, 116, 119, 120, 121, 122, 123, 124, 125, 127, 128, 130, 131, 133, 134, 135 |
| no credit footnote | 2 | 39, 51 |
| no key | 3 | 128, 131, 136 |

## What each check means

- **Refrain inferred**: the book prints the refrain once, right after verse I, without a label. The converter treats the lines of verse I beyond the length of verse II as the refrain. Worth a quick look on each of these hymns.
- **Call-and-response parts**: lines marked `Gore:` / `Bose:` (and `Gabo:`, `Basse:`) are kept, with the part stored separately so the reader can show it as a small label.
- **No credit / no key / author not recognised**: the book itself has no footnote or no `[key]`, or the credit is worded in a way the converter does not read.
- Repeat marks such as `/2` are removed from the text and stored as `repeat: 2` on the line.
