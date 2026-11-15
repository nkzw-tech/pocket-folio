export type CardStockRect = { bottom: number; left: number; right: number; top: number };
// Twelve segments around the four rounded corners, twelve triangle vertices
// per segment (front, back, and the edge). Up to sixteen pockets per sheet.
export const cardStockVertexCapacity = 16 * 12 * 12;
export const cardStockStride = 6;

export function cardStockDepth(cardWidth: number, doubleSided: boolean) {
  // A slightly exaggerated paper edge: approximately 1 / 2 mm at card scale.
  return cardWidth * 0.014 * (doubleSided ? 2 : 1);
}

export function writeCardStock(
  output: Float32Array,
  sheet: Float32Array,
  segmentsX: number,
  segmentsY: number,
  rects: ReadonlyArray<CardStockRect>,
  pageWidth: number,
  pageHeight: number,
  doubleSided: boolean,
) {
  let cursor = 0;
  const sample = (u: number, v: number) => {
    const x = Math.min(segmentsX - 1, Math.floor(u * segmentsX));
    const y = Math.min(segmentsY - 1, Math.floor(v * segmentsY));
    const tx = u * segmentsX - x;
    const ty = v * segmentsY - y;
    const a = (y * (segmentsX + 1) + x) * 3;
    const b = a + (segmentsX + 1) * 3;
    return [0, 1, 2].map(
      (axis) =>
        (sheet[a + axis] * (1 - tx) + sheet[a + 3 + axis] * tx) * (1 - ty) +
        (sheet[b + axis] * (1 - tx) + sheet[b + 3 + axis] * tx) * ty,
    );
  };
  for (const rect of rects) {
    const centerUV = [(rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2];
    const a = sample(rect.left, centerUV[1]);
    const b = sample(rect.right, centerUV[1]);
    const c = sample(centerUV[0], rect.top);
    const d = sample(centerUV[0], rect.bottom);
    const ab = b.map((value, axis) => value - a[axis]);
    const ac = d.map((value, axis) => value - c[axis]);
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const length = Math.hypot(...normal) || 1;
    const unitNormal = normal.map((value) => value / length);
    const horizontalLength = Math.hypot(...ab) || 1;
    const horizontal = ab.map((value) => value / horizontalLength);
    const vertical = [
      unitNormal[1] * horizontal[2] - unitNormal[2] * horizontal[1],
      unitNormal[2] * horizontal[0] - unitNormal[0] * horizontal[2],
      unitNormal[0] * horizontal[1] - unitNormal[1] * horizontal[0],
    ];
    const depth = cardStockDepth((rect.right - rect.left) * pageWidth, doubleSided);
    const offset = unitNormal.map((value) => (value * depth) / 2);
    const center = sample(centerUV[0], centerUV[1]);
    // The sleeve flexes; the card is one rigid plane. Sampling every corner
    // independently lets a nearby sleeve hinge crease the card's top edge.
    const cardPoint = (u: number, v: number) =>
      center.map(
        (value, axis) =>
          value +
          horizontal[axis] * (u - centerUV[0]) * pageWidth +
          vertical[axis] * (v - centerUV[1]) * pageHeight,
      );
    const radius = (rect.right - rect.left) * pageWidth * 0.025;
    const rx = radius / pageWidth;
    const ry = radius / pageHeight;
    const corners = [
      [rect.right - rx, rect.top + ry, -Math.PI / 2],
      [rect.right - rx, rect.bottom - ry, 0],
      [rect.left + rx, rect.bottom - ry, Math.PI / 2],
      [rect.left + rx, rect.top + ry, Math.PI],
    ];
    const perimeter = corners.flatMap(([x, y, angle]) =>
      [0, 0.5, 1].map((step) => {
        const u = x + Math.cos(angle + (step * Math.PI) / 2) * rx;
        const v = y + Math.sin(angle + (step * Math.PI) / 2) * ry;
        return { point: cardPoint(u, v), uv: [u, v] };
      }),
    );
    const vertex = (
      point: ReadonlyArray<number>,
      uv: ReadonlyArray<number>,
      side: number,
      edge = false,
    ) => {
      for (let axis = 0; axis < 3; axis++) {
        output[cursor++] = point[axis] + offset[axis] * side;
      }
      output[cursor++] = uv[0];
      output[cursor++] = edge ? (side + 1) / 2 : uv[1];
      // Surface identity must not depend on triangle winding: both outward
      // faces of a solid card are front-facing when viewed from their side.
      output[cursor++] = edge ? 1 : side === 1 ? 0 : -1;
    };
    for (let index = 0; index < perimeter.length; index++) {
      const start = perimeter[index];
      const end = perimeter[(index + 1) % perimeter.length];
      // Front and back use opposite winding; texture coordinates remain in the
      // sheet's space so the existing back-face mirror stays correct.
      vertex(center, centerUV, 1);
      vertex(end.point, end.uv, 1);
      vertex(start.point, start.uv, 1);
      vertex(center, centerUV, -1);
      vertex(start.point, start.uv, -1);
      vertex(end.point, end.uv, -1);
      vertex(start.point, start.uv, 1, true);
      vertex(end.point, end.uv, 1, true);
      vertex(start.point, start.uv, -1, true);
      vertex(end.point, end.uv, 1, true);
      vertex(end.point, end.uv, -1, true);
      vertex(start.point, start.uv, -1, true);
    }
  }
  return cursor / cardStockStride;
}
