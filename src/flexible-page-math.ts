export type PageGrip = { pull: number; x: number; y: number };
export type PocketHinge = { end: number; start: number };
export type SheetShape = {
  columns: number;
  direction?: 'next' | 'previous';
  grip: PageGrip;
  height: number;
  hingesX?: ReadonlyArray<PocketHinge>;
  hingesY?: ReadonlyArray<PocketHinge>;
  progress: number;
  rows: number;
  width: number;
};
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// Measure the spaces between actual card areas, including the page's padding
// and label rows. Equal fractions of the sleeve do not align with its pockets.
export function pocketHinges(intervals: ReadonlyArray<PocketHinge>): Array<PocketHinge> {
  const bands: Array<PocketHinge> = [];
  for (const interval of [...intervals].sort((a, b) => a.start - b.start)) {
    const previous = bands.at(-1);
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      bands.push({ ...interval });
    }
  }
  return bands.slice(1).map((band, index) => {
    const gap = band.start - bands[index].end;
    return { end: band.start - gap * 0.25, start: bands[index].end + gap * 0.25 };
  });
}

// Flat pocket interiors, with the changes in angle concentrated at welded seams.
function pocketBand(position: number, count: number, hinges?: ReadonlyArray<PocketHinge>) {
  if (hinges) {
    if (!hinges.length) {
      return 0.5;
    }
    let band = 0;
    for (const { end, start } of hinges) {
      const t = clamp((position - start) / (end - start));
      band += t * t * (3 - 2 * t);
    }
    return band / hinges.length;
  }
  if (count < 2) {
    return 0.5;
  }
  let band = 0;
  for (let seam = 1; seam < count; seam++) {
    const t = clamp(((position - seam / count) * count) / 0.18 + 0.5);
    band += t * t * (3 - 2 * t);
  }
  return band / (count - 1);
}

// Integrate once across each row; avoid redoing the same tangent calculations
// for every vertex. Only the active sheet needs a mesh update.
export function writeSheetMesh(
  vertices: Float32Array,
  segmentsX: number,
  segmentsY: number,
  shape: SheetShape,
) {
  const { columns, grip, height, hingesX, hingesY, rows, width } = shape;
  const progress = clamp(shape.progress);
  const lift = Math.sin(progress * Math.PI);
  const base = progress * Math.PI;
  const direction = shape.direction === 'previous' ? -1 : 1;
  const curl = direction * lift * (0.42 + clamp(grip.x) * 0.25);
  const stepLength = width / segmentsX;
  for (let row = 0; row <= segmentsY; row++) {
    const v = row / segmentsY;
    const twist =
      (clamp(grip.y) - 0.5) * (pocketBand(v, rows, hingesY) - 0.5) * lift * 0.85 * direction;
    let x = Math.cos(base) * 14;
    let z = Math.sin(base) * 14;
    for (let column = 0; column <= segmentsX; column++) {
      if (column) {
        const angle =
          base + curl * (pocketBand((column - 0.5) / segmentsX, columns, hingesX) - 0.5) + twist;
        x += Math.cos(angle) * stepLength;
        z += Math.sin(angle) * stepLength;
      }
      const index = (row * (segmentsX + 1) + column) * 3;
      vertices[index] = x;
      vertices[index + 1] =
        v * height + ((clamp(grip.pull, -0.25, 0.25) * height * column) / segmentsX) * lift * 0.4;
      vertices[index + 2] = Math.max(0, z);
    }
  }
}
