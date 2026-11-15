import { describe, expect, it } from 'vitest';
import { pocketHinges, writeSheetMesh, type SheetShape } from '../src/flexible-page-math';
const shape: SheetShape = {
  columns: 3,
  grip: { pull: 0, x: 1, y: 0.1 },
  height: 600,
  progress: 0,
  rows: 3,
  width: 450,
};
function mesh(overrides: Partial<SheetShape>) {
  const vertices = new Float32Array(55 * 43 * 3);
  writeSheetMesh(vertices, 54, 42, { ...shape, ...overrides });
  return vertices;
}
describe('flexible sleeve geometry', () => {
  it('places hinges between measured card rows instead of equal page thirds', () => {
    const rows = [
      { end: 0.29, start: 0.04 },
      { end: 0.61, start: 0.36 },
      { end: 0.94, start: 0.69 },
    ];
    const hingesY = pocketHinges([...rows, ...rows, ...rows]);
    expect(hingesY).toHaveLength(2);
    expect(hingesY[1].start).toBeCloseTo(0.63);
    expect(hingesY[1].end).toBeCloseTo(0.67);
    const vertices = mesh({ grip: { pull: 0, x: 1, y: 0.95 }, hingesY, progress: 0.4 });
    for (let column = 0; column <= 54; column++) {
      // The top of the final row must have exactly the same orientation as
      // its bottom, even when the user pulls from the bottom corner.
      const top = (29 * 55 + column) * 3;
      const bottom = (39 * 55 + column) * 3;
      expect(vertices[top]).toBe(vertices[bottom]);
      expect(vertices[top + 2]).toBe(vertices[bottom + 2]);
    }
  });
  it('lands flat at both ends without changing the page size', () => {
    for (const progress of [0, 1]) {
      const vertices = mesh({ progress });
      const sign = progress === 0 ? 1 : -1;
      for (let row = 0; row <= 42; row++) {
        for (let column = 0; column <= 54; column++) {
          const index = (row * 55 + column) * 3;
          expect(vertices[index]).toBeCloseTo(sign * (14 + (column / 54) * 450), 3);
          expect(vertices[index + 1]).toBeCloseTo((row / 42) * 600, 3);
          expect(vertices[index + 2]).toBeCloseTo(0, 3);
        }
      }
    }
  });
  it('keeps the inner edge straight while opposite corners lead differently', () => {
    const top = mesh({ progress: 0.4 });
    const bottom = mesh({ grip: { pull: 0, x: 1, y: 0.9 }, progress: 0.4 });
    for (let row = 0; row <= 42; row++) {
      const index = row * 55 * 3;
      expect(top[index]).toBeCloseTo(top[0], 5);
      expect(top[index + 2]).toBeCloseTo(top[2], 5);
    }
    const outerTop = 54 * 3;
    const outerBottom = (42 * 55 + 54) * 3;
    expect(top[outerTop]).toBeLessThan(bottom[outerTop]);
    expect(top[outerBottom]).toBeGreaterThan(bottom[outerBottom]);
    expect(top[outerTop]).toBeCloseTo(bottom[outerBottom], 3);
  });
  it('preserves strip lengths and finite geometry across supported layouts', () => {
    for (const columns of [2, 3, 4]) {
      for (const rows of [2, 3, 4]) {
        for (const progress of [0.01, 0.25, 0.5, 0.75, 0.99]) {
          const vertices = mesh({ columns, progress, rows });
          expect(vertices.every(Number.isFinite)).toBe(true);
          for (let column = 1; column <= 54; column++) {
            const current = column * 3;
            const previous = current - 3;
            expect(
              Math.hypot(
                vertices[current] - vertices[previous],
                vertices[current + 2] - vertices[previous + 2],
              ),
            ).toBeCloseTo(450 / 54, 3);
          }
        }
      }
    }
  });
});
