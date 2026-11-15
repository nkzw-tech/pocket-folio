import { describe, expect, it } from 'vitest';
import {
  cardStockDepth,
  cardStockStride,
  cardStockVertexCapacity,
  writeCardStock,
} from '../src/card-stock-mesh';
import { writeSheetMesh } from '../src/flexible-page-math';

describe('physical card edges', () => {
  const rects = [{ bottom: 0.3, left: 0.04, right: 0.3, top: 0.04 }];
  function stock(progress: number, doubleSided: boolean) {
    const sheet = new Float32Array(55 * 43 * 3);
    writeSheetMesh(sheet, 54, 42, {
      columns: 3,
      grip: { pull: 0, x: 1, y: 0.1 },
      height: 600,
      progress,
      rows: 3,
      width: 450,
    });
    const output = new Float32Array(cardStockVertexCapacity * cardStockStride);
    const count = writeCardStock(output, sheet, 54, 42, rects, 450, 600, doubleSided);
    return { count, output };
  }
  it('gives double-sided pockets twice the edge depth on both sides of a turn', () => {
    for (const progress of [0, 1]) {
      for (const doubleSided of [false, true]) {
        const { count, output } = stock(progress, doubleSided);
        const depth = Array.from(
          { length: count },
          (_, index) => output[index * cardStockStride + 2],
        );
        expect(Math.max(...depth) - Math.min(...depth)).toBeCloseTo(
          cardStockDepth(450 * 0.26, doubleSided),
          4,
        );
      }
    }
    expect(cardStockDepth(150, true)).toBe(cardStockDepth(150, false) * 2);
  });
  it('keeps front/back artwork and rounded edges finite throughout bending', () => {
    for (const progress of [0.1, 0.4, 0.5, 0.8]) {
      const { count, output } = stock(progress, true);
      expect(count).toBe(144);
      expect(output.subarray(0, count * cardStockStride).every(Number.isFinite)).toBe(true);
      const edges = Array.from(
        { length: count },
        (_, index) => output[index * cardStockStride + 5],
      );
      expect(edges.filter((surface) => surface === 1).length).toBe(72);
      expect(edges.filter((surface) => surface === 0).length).toBe(36);
      expect(edges.filter((surface) => surface === -1).length).toBe(36);
      for (let triangle = 0; triangle < count; triangle += 12) {
        expect(edges.slice(triangle, triangle + 6)).toEqual([0, 0, 0, -1, -1, -1]);
      }
    }
  });
  it('does not manufacture card stock for an empty sleeve', () => {
    const output = new Float32Array(cardStockVertexCapacity * cardStockStride);
    expect(writeCardStock(output, new Float32Array(55 * 43 * 3), 54, 42, [], 450, 600, true)).toBe(
      0,
    );
  });
  it('keeps the bottom-row card rigid even when the sleeve bends through its bounds', () => {
    const rect = { bottom: 0.94, left: 0.69, right: 0.96, top: 0.69 };
    const sheet = new Float32Array(55 * 43 * 3);
    const output = new Float32Array(cardStockVertexCapacity * cardStockStride);
    for (const direction of ['next', 'previous'] as const) {
      for (const progress of [0.15, 0.4, 0.6, 0.85]) {
        writeSheetMesh(sheet, 54, 42, {
          columns: 3,
          direction,
          grip: { pull: 0.2, x: 1, y: 0.95 },
          height: 600,
          progress,
          rows: 3,
          width: 450,
        });
        const count = writeCardStock(output, sheet, 54, 42, [rect], 450, 600, true);
        const a = Array.from(output.slice(0, 3));
        const b = Array.from(output.slice(6, 9), (value, axis) => value - a[axis]);
        const opposite = 37 * cardStockStride;
        const c = Array.from(
          output.slice(opposite, opposite + 3),
          (value, axis) => value - a[axis],
        );
        const cross = [
          b[1] * c[2] - b[2] * c[1],
          b[2] * c[0] - b[0] * c[2],
          b[0] * c[1] - b[1] * c[0],
        ];
        const length = Math.hypot(...cross);
        const normal = cross.map((value) => value / length);
        for (let index = 0; index < count; index += 12) {
          for (let corner = 0; corner < 3; corner++) {
            const offset = (index + corner) * cardStockStride;
            const delta = Array.from(
              output.slice(offset, offset + 3),
              (value, axis) => value - a[axis],
            );
            expect(
              Math.abs(delta.reduce((sum, value, axis) => sum + value * normal[axis], 0)),
            ).toBeLessThan(0.0001);
            expect(Math.hypot(...delta)).toBeCloseTo(
              Math.hypot(
                (output[offset + 3] - output[3]) * 450,
                (output[offset + 4] - output[4]) * 600,
              ),
              3,
            );
          }
        }
      }
    }
  });
});
