// Maps SVG keypos index to keyboard.toml matrix [row, col]
//
// Physical layout (from keyboard.toml):
//          | 00 | 01 | 02 | 03 | 04 |   | 05 | 06 | 07 | 08 | 09 |
//          | 10 | 11 | 12 | 13 | 14 |   | 15 | 16 | 17 | 18 | 19 |
//     | 30 | 20 | 21 | 22 | 23 | 24 |   | 25 | 26 | 27 | 28 | 29 | 39 |
//                    | 32 | 33 | 34 |   | 35 | 36 | 37 |

export const KEYPOS_TO_MATRIX: [row: number, col: number][] = [
  // keypos 0-9: top row
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [0, 5], [0, 6], [0, 7], [0, 8], [0, 9],
  // keypos 10-19: home row
  [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
  [1, 5], [1, 6], [1, 7], [1, 8], [1, 9],
  // keypos 20: left pinky extra (physical position 30)
  [3, 0],
  // keypos 21-25: bottom left (physical positions 20-24)
  [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
  // keypos 26-30: bottom right (physical positions 25-29)
  [2, 5], [2, 6], [2, 7], [2, 8], [2, 9],
  // keypos 31: right pinky extra (physical position 39)
  [3, 9],
  // keypos 32-34: left thumbs
  [3, 2], [3, 3], [3, 4],
  // keypos 35-37: right thumbs
  [3, 5], [3, 6], [3, 7],
];
