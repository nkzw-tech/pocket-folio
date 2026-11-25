// Paint a face from the same measured pockets that handle keyboard and pointer input.
// Only decoded artwork is copied. Image load events invalidate the affected face.
import type { CardStockRect } from './card-stock-mesh';

export type PaintedFace = {
  artwork: HTMLCanvasElement;
  cards: Array<CardStockRect | undefined>;
  lettering?: HTMLCanvasElement;
  underlay?: HTMLCanvasElement;
};

function surface(width: number, height: number) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(window.devicePixelRatio || 1, 2, 1600 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.scale(canvas.width / width, canvas.height / height);
  return ctx;
}

function drawScan(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (!image.complete || !image.naturalWidth) {
    return;
  }
  const art = image.closest('.folio-insert, .folio-card-back');
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, w * 0.025);
  ctx.clip();
  ctx.fillStyle = '#27272c';
  ctx.fillRect(x, y, w, h);
  if (art?.classList.contains('is-reference')) {
    ctx.filter = 'grayscale(1)';
    ctx.globalAlpha *= 0.48;
  } else if (art?.classList.contains('is-purchased')) {
    ctx.filter = 'saturate(0.90)';
    ctx.globalAlpha *= 0.9;
  } else if (art?.classList.contains('is-wishlist')) {
    ctx.globalAlpha *= 0.88;
  }
  if (image.closest('.folio-card-back[data-language="ja"]')) {
    const sw = image.naturalWidth / 2.20667;
    ctx.drawImage(image, image.naturalWidth - sw, 0, sw, image.naturalHeight / 1.15166, x, y, w, h);
  } else {
    ctx.drawImage(image, x, y, w, h);
  }
  ctx.restore();
}

function printIcon(ctx: CanvasRenderingContext2D, icon: SVGSVGElement, page: DOMRect) {
  const rect = icon.getBoundingClientRect();
  ctx.save();
  ctx.translate(rect.x - page.x, rect.y - page.y);
  ctx.scale(rect.width / 24, rect.height / 24);
  ctx.strokeStyle = getComputedStyle(icon).color;
  ctx.lineWidth = Number(icon.getAttribute('stroke-width') ?? 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const path of icon.querySelectorAll('path')) {
    ctx.stroke(new Path2D(path.getAttribute('d') ?? ''));
  }
  for (const line of icon.querySelectorAll('polyline,line')) {
    ctx.beginPath();
    if (line.tagName === 'polyline') {
      const points = (line as SVGPolylineElement).points;
      for (let i = 0; i < points.length; i++) {
        const { x, y } = points.getItem(i);
        if (i) {
          ctx.lineTo(x, y);
        } else {
          ctx.moveTo(x, y);
        }
      }
    } else {
      ctx.moveTo(Number(line.getAttribute('x1')), Number(line.getAttribute('y1')));
      ctx.lineTo(Number(line.getAttribute('x2')), Number(line.getAttribute('y2')));
    }
    ctx.stroke();
  }
  ctx.restore();
}
function printLabel(
  ctx: CanvasRenderingContext2D,
  node: Element,
  page: DOMRect,
  value = node.textContent,
) {
  if (!value) {
    return;
  }
  const box = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  ctx.save();
  ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
  ctx.fillStyle = style.color;
  ctx.globalAlpha = Number(style.opacity);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const draw = (line: string, rect: DOMRect) =>
    ctx.fillText(
      line,
      rect.left - page.left + rect.width / 2,
      rect.top - page.top + rect.height / 2,
      rect.width,
    );
  const range = document.createRange();
  range.selectNodeContents(node);
  const content = node.firstChild;
  if (
    node.tagName === 'H2' &&
    content?.nodeType === Node.TEXT_NODE &&
    range.getClientRects().length > 1
  ) {
    let start = 0;
    let offset = 0;
    let top: number | undefined;
    for (const character of value) {
      const end = offset + character.length;
      range.setStart(content, offset);
      range.setEnd(content, end);
      const lineTop = range.getBoundingClientRect().top;
      if (top !== undefined && lineTop !== top) {
        range.setStart(content, start);
        range.setEnd(content, offset);
        draw(value.slice(start, offset).trimEnd(), range.getBoundingClientRect());
        start = offset;
      }
      top = lineTop;
      offset = end;
    }
    range.setStart(content, start);
    range.setEnd(content, offset);
    draw(value.slice(start), range.getBoundingClientRect());
  } else {
    draw(value, box);
  }
  ctx.restore();
}

export function paintBinderFace(wrapper: HTMLElement): PaintedFace | undefined {
  const page = wrapper.querySelector<HTMLElement>(
    '.folio-page:not(.folio-stack-page), .folio-inside-cover',
  );
  if (!page) {
    return;
  }
  const bounds = page.getBoundingClientRect();
  const { height, width } = bounds;
  if (width < 1 || height < 1) {
    return;
  }
  const ctx = surface(width, height);
  const cards: PaintedFace['cards'] = [];
  let underlay: CanvasRenderingContext2D | undefined;
  const stamp = page.querySelector('.folio-cover-stamp');
  if (stamp) {
    const frame = stamp.getBoundingClientRect();
    ctx.strokeStyle = '#c1c1c137';
    for (const pad of [0, 5]) {
      ctx.strokeRect(
        frame.left - bounds.left - pad,
        frame.top - bounds.top - pad,
        frame.width + pad * 2,
        frame.height + pad * 2,
      );
    }
    for (const node of stamp.querySelectorAll('span,h2,p,small')) {
      printLabel(ctx, node, bounds);
    }
    const rule = stamp.querySelector('.folio-cover-rule')?.getBoundingClientRect();
    if (rule) {
      ctx.fillStyle = '#c1c1c177';
      ctx.fillRect(rule.x - bounds.x, rule.y - bounds.y, rule.width, rule.height);
    }
    const icon = stamp.querySelector('svg');
    if (icon) {
      printIcon(ctx, icon, bounds);
    }
    return { artwork: ctx.canvas, cards };
  }
  let lettering: CanvasRenderingContext2D | undefined;
  const stack = wrapper.querySelector('.folio-stack-page .folio-pockets')?.children;
  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, 'rgba(207,221,240,.12)');
  wash.addColorStop(0.45, 'rgba(212,228,248,.055)');
  wash.addColorStop(1, 'rgba(215,234,248,.14)');
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, width - 1, height - 1, 5);
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.strokeStyle = '#e3eeff55';
  ctx.stroke();
  const purchasedBorder = getComputedStyle(page).getPropertyValue('--purchased-pocket-border');
  for (const [i, pocket] of [...page.querySelectorAll<HTMLElement>('.folio-pocket')].entries()) {
    const box = pocket.getBoundingClientRect();
    const area = pocket
      .querySelector<HTMLElement>('.folio-card, .folio-empty-pocket')!
      .getBoundingClientRect();
    const x = area.x - bounds.x,
      y = area.y - bounds.y,
      w = area.width,
      h = area.height;
    const px = box.x - bounds.x,
      py = box.y - bounds.y;
    const img = pocket.querySelector('img');
    cards.push(
      img
        ? { bottom: (y + h) / height, left: x / width, right: (x + w) / width, top: y / height }
        : undefined,
    );
    const behind = stack?.[i]?.querySelector('img');
    if (behind) {
      underlay ??= surface(width, height);
      underlay.globalAlpha = Number(
        behind.closest<HTMLElement>('.folio-stack-artwork')?.style.opacity || 1,
      );
      drawScan(underlay, behind, x, y, w, h);
    }
    ctx.save();
    if (pocket.classList.contains('is-muted')) {
      ctx.globalAlpha = 0.32;
    }
    ctx.beginPath();
    ctx.roundRect(px + 0.5, py + 0.5, box.width - 1, box.height - 1, 3);
    ctx.strokeStyle = pocket.classList.contains('is-purchased')
      ? purchasedBorder
      : pocket.classList.contains('is-wishlist')
        ? '#f291bc95'
        : '#e5efff42';
    ctx.stroke();
    ctx.strokeStyle = '#fff5';
    ctx.beginPath();
    if (page.dataset.pocketOpening === 'top') {
      ctx.moveTo(px + 1, py + 6);
      ctx.quadraticCurveTo(px + box.width * 0.75, py + 10, px + box.width - 1, py + 5);
    } else if (page.dataset.pocketOpening === 'side') {
      const edge = px + (page.dataset.pocketEdge === 'left' ? 4 : box.width - 4);
      ctx.moveTo(edge, py + 1);
      ctx.lineTo(edge, py + box.height - 1);
    }
    ctx.stroke();
    if (img) {
      drawScan(ctx, img, x, y, w, h);
    }
    const number = pocket.querySelector('.folio-pocket-label > span:first-child');
    if (number) {
      printLabel(ctx, number, bounds);
    }
    const status = pocket.querySelector<SVGSVGElement>('[data-status] svg');
    if (status) {
      printIcon(ctx, status, bounds);
    }
    ctx.restore();
    const labels = pocket.querySelectorAll('.folio-add,.folio-placeholder > *');
    if (labels.length) {
      lettering ??= surface(width, height);
      for (const label of labels) {
        printLabel(lettering, label, bounds);
      }
    }
  }
  return { artwork: ctx.canvas, cards, lettering: lettering?.canvas, underlay: underlay?.canvas };
}
