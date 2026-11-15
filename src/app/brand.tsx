import { Link } from '@void/react';
import { Layers3 } from 'lucide-react';
import type { PointerEvent } from 'react';
import { text } from '../i18n/text';

function moveBrandLight({ clientX, clientY, currentTarget }: PointerEvent<HTMLElement>) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  // Each surface uses its own coordinates so the light only catches the part of
  // the mark or lettering under the pointer. No React renders during movement.
  for (const surface of currentTarget.querySelectorAll<HTMLElement>('[data-brand-surface]')) {
    const { left, top } = surface.getBoundingClientRect();
    surface.style.setProperty('--brand-light-x', `${clientX - left}px`);
    surface.style.setProperty('--brand-light-y', `${clientY - top}px`);
  }
}
export function Brand() {
  const name = text('Pocket Folio');
  return (
    <Link
      aria-label={name}
      className="brand"
      href="/"
      onPointerDown={moveBrandLight}
      onPointerMove={moveBrandLight}
    >
      <span aria-hidden="true" className="brand-mark" data-brand-surface>
        <Layers3 size={20} />
      </span>
      <span className="brand-wordmark" data-brand-surface>
        {name}
        <span aria-hidden="true" className="brand-wordmark-foil">
          {name}
        </span>
      </span>
    </Link>
  );
}
