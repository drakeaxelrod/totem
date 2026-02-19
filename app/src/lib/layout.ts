export interface KeyPosition {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  rx: number;
  ry: number;
}

// Physical layout from totem-layout.dtsi
// All coordinates scaled /10 from centiunits, rotation /100 from centidegrees
export const LAYOUT: KeyPosition[] = [
  { index: 0,  x: 7.8,   y: 15.2,  w: 10.6, h: 10, rot: -10,  rx: 13,    ry: 20.2  },
  { index: 1,  x: 19.6,  y: 6.0,   w: 10.6, h: 10, rot: -4,   rx: 24.9,  ry: 11.0  },
  { index: 2,  x: 31.8,  y: 0,     w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 3,  x: 42.3,  y: 5.0,   w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 4,  x: 52.9,  y: 6.6,   w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 5,  x: 86.8,  y: 6.6,   w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 6,  x: 97.4,  y: 5.0,   w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 7,  x: 108.0, y: 0,     w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 8,  x: 120.1, y: 6.1,   w: 10.6, h: 10, rot: 4,    rx: 125.4, ry: 11.1  },
  { index: 9,  x: 132.0, y: 15.2,  w: 10.6, h: 10, rot: 10,   rx: 137.3, ry: 20.2  },
  { index: 10, x: 9.5,   y: 25.0,  w: 10.6, h: 10, rot: -10,  rx: 14.8,  ry: 30.0  },
  { index: 11, x: 20.3,  y: 16.0,  w: 10.6, h: 10, rot: -4,   rx: 25.6,  ry: 21.0  },
  { index: 12, x: 31.8,  y: 10.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 13, x: 42.3,  y: 15.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 14, x: 52.9,  y: 16.6,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 15, x: 86.8,  y: 16.6,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 16, x: 97.4,  y: 15.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 17, x: 108.0, y: 10.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 18, x: 119.4, y: 16.0,  w: 10.6, h: 10, rot: 4,    rx: 124.7, ry: 21.0  },
  { index: 19, x: 130.3, y: 25.0,  w: 10.6, h: 10, rot: 10,   rx: 135.6, ry: 30.0  },
  { index: 20, x: 0,     y: 32.3,  w: 10.6, h: 10, rot: -10,  rx: 5.3,   ry: 37.3  },
  { index: 21, x: 11.2,  y: 34.9,  w: 10.6, h: 10, rot: -10,  rx: 16.5,  ry: 39.9  },
  { index: 22, x: 21.0,  y: 26.0,  w: 10.6, h: 10, rot: -4,   rx: 26.3,  ry: 31.0  },
  { index: 23, x: 31.8,  y: 20.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 24, x: 42.3,  y: 25.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 25, x: 52.9,  y: 26.6,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 26, x: 86.8,  y: 26.6,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 27, x: 97.4,  y: 25.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 28, x: 108.0, y: 20.0,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 29, x: 118.7, y: 26.0,  w: 10.6, h: 10, rot: 4,    rx: 124.0, ry: 31.0  },
  { index: 30, x: 128.5, y: 34.9,  w: 10.6, h: 10, rot: 10,   rx: 133.8, ry: 39.9  },
  { index: 31, x: 139.7, y: 32.3,  w: 10.6, h: 10, rot: 10,   rx: 145.0, ry: 37.3  },
  { index: 32, x: 39.4,  y: 37.1,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
  { index: 33, x: 51.1,  y: 38.8,  w: 10.6, h: 10, rot: 15,   rx: 56.4,  ry: 43.8  },
  { index: 34, x: 62.0,  y: 43.3,  w: 10.6, h: 10, rot: 30,   rx: 67.2,  ry: 48.3  },
  { index: 35, x: 77.8,  y: 43.3,  w: 10.6, h: 10, rot: -30,  rx: 83.1,  ry: 48.3  },
  { index: 36, x: 88.7,  y: 38.8,  w: 10.6, h: 10, rot: -15,  rx: 94.0,  ry: 43.8  },
  { index: 37, x: 100.4, y: 37.1,  w: 10.6, h: 10, rot: 0,    rx: 0,     ry: 0     },
];
