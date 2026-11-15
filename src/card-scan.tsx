import {
  useMemo,
  type CSSProperties,
  type PointerEvent,
  type MouseEvent,
  type DragEvent,
} from 'react';
import type { CardFoil } from './binder-catalog';
import { cardAssetURL } from './card-assets';
import { CardImage } from './card-image';

const movingLight =
  typeof window === 'undefined'
    ? undefined
    : window.matchMedia('(prefers-reduced-motion: no-preference)');
const fraction = (offset: number, size: number) => Math.min(1, Math.max(0, offset / size));

function foilPattern(image: string): CSSProperties {
  // The scan identifies the card in every view. Keep the foil pattern independent
  // of render order, ownership, pointer position and the size of the preview.
  let seed = 2_166_136_261;
  for (const character of image) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16_777_619);
  }
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4_294_967_296;
  };
  const range = (min: number, max: number) => (min + random() * (max - min)).toFixed(2);
  // Draw one full-card texture, rather than repeating a few offset dot tiles.
  // Irregular positions, sizes and brightness avoid visible rows and moiré.
  const colors = ['#fff4ce', '#badfff', '#e7d6ff'];
  const gradients = colors.map(
    (color, index) =>
      `<radialGradient id="s${index}"><stop offset="0" stop-color="${color}"/><stop offset=".3" stop-color="${color}" stop-opacity=".8"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
  );
  const flecks = Array.from({ length: 190 }, () => {
    const radius = random() < 0.12 ? range(1.1, 1.8) : range(0.4, 1.05);
    return `<ellipse cx="${range(0, 245)}" cy="${range(0, 342)}" rx="${radius}" ry="${(Number(radius) * (0.65 + random() * 0.6)).toFixed(2)}" fill="url(#s${Math.floor(random() * colors.length)})" opacity="${range(0.35, 0.85)}"/>`;
  });
  const texture = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 245 342"><defs>${gradients.join('')}</defs>${flecks.join('')}</svg>`;
  return {
    '--foil-angle': `${range(106, 126)}deg`,
    '--foil-texture': `url("data:image/svg+xml,${encodeURIComponent(texture)}")`,
  } as CSSProperties;
}

export function moveCardLight({ clientX, clientY, currentTarget }: PointerEvent<HTMLElement>) {
  if (!movingLight?.matches) {
    return;
  }
  const { height, left, top, width } = currentTarget.getBoundingClientRect();
  const x = fraction(clientX - left, width);
  const y = fraction(clientY - top, height);
  currentTarget.style.setProperty('--card-light-x', `${Math.round(x * 100)}%`);
  currentTarget.style.setProperty('--card-light-y', `${Math.round(y * 100)}%`);
  currentTarget.style.setProperty('--card-tilt-x', `${((0.5 - y) * 10).toFixed(2)}deg`);
  currentTarget.style.setProperty('--card-tilt-y', `${((x - 0.5) * 10).toFixed(2)}deg`);
}

export function resetCardLight({ currentTarget }: PointerEvent<HTMLElement>) {
  currentTarget.style.removeProperty('--card-light-x');
  currentTarget.style.removeProperty('--card-light-y');
  currentTarget.style.removeProperty('--card-tilt-x');
  currentTarget.style.removeProperty('--card-tilt-y');
}

// Keep pointer movement outside React rendering: one local light per card, with
// native vertical scrolling and pinch zoom. Only a horizontal drag consumes a tap.
type CardTouch = { moved: boolean; pointerId: number | null; x: number; y: number };
const touches = new WeakMap<HTMLElement, CardTouch>();
function clearTouchLight(event: PointerEvent<HTMLElement>) {
  resetCardLight(event);
  event.currentTarget.style.removeProperty('--foil-opacity');
  event.currentTarget.removeAttribute('data-card-touch');
}
function finishCardTouch(event: PointerEvent<HTMLElement>) {
  const touch = touches.get(event.currentTarget);
  if (touch?.pointerId !== event.pointerId) {
    return;
  }
  touch.pointerId = null;
  clearTouchLight(event);
}
export const cardLightEvents = {
  'data-card-light': true,
  onClickCapture(event: MouseEvent<HTMLElement>) {
    const touch = touches.get(event.currentTarget);
    if (touch?.moved && event.detail !== 0) {
      event.preventDefault();
      event.stopPropagation();
      touch.moved = false;
    }
  },
  onDragStart(event: DragEvent<HTMLElement>) {
    event.preventDefault();
  },
  onLostPointerCapture(event: PointerEvent<HTMLElement>) {
    if (event.target === event.currentTarget) {
      finishCardTouch(event);
    }
  },
  onPointerCancel: finishCardTouch,
  onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch' && !event.isPrimary) {
      return;
    }
    touches.delete(event.currentTarget);
    if (
      event.pointerType !== 'touch' ||
      (event.target as HTMLElement).closest('select, .card-status, .folio-edit, .folio-add') ||
      !event.currentTarget.querySelector('.card-scan')
    ) {
      return;
    }
    touches.set(event.currentTarget, {
      moved: false,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    });
    event.currentTarget.setAttribute('data-card-touch', 'active');
    event.currentTarget.style.setProperty('--foil-opacity', '0.86');
    moveCardLight(event);
  },
  onPointerLeave(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'touch') {
      resetCardLight(event);
    }
  },
  onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') {
      const touch = touches.get(event.currentTarget);
      if (touch?.pointerId !== event.pointerId) {
        return;
      }
      const dx = Math.abs(event.clientX - touch.x);
      const dy = Math.abs(event.clientY - touch.y);
      if (Math.max(dx, dy) > 8) {
        touch.moved = true;
      }
      if (dx > 8 && dx > dy * 1.2 && !event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }
    moveCardLight(event);
  },
  onPointerUp: finishCardTouch,
};

export function CardScan({
  foil,
  image,
  lazy,
}: {
  foil?: CardFoil;
  image: string;
  lazy?: boolean;
}) {
  const pattern = useMemo(() => (foil ? foilPattern(image) : undefined), [foil, image]);
  return (
    <span className="card-scan" data-foil={foil} style={pattern}>
      <CardImage
        alt=""
        crossOrigin="anonymous"
        decoding="async"
        height="342"
        loading={lazy ? 'lazy' : undefined}
        src={cardAssetURL(image)}
        width="245"
      />
      {foil && <span aria-hidden="true" className="card-scan-shine" />}
    </span>
  );
}
