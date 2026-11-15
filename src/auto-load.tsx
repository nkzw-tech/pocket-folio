import { useEffect, useRef } from 'react';
import { observeAhead } from './observe-ahead';

// IntersectionObserver respects clipping ancestors, including the card-picker dialog.
export function AutoLoad({ onLoad }: { onLoad: () => void }) {
  const target = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = target.current;
    if (!node) {
      return;
    }
    return observeAhead(node, onLoad);
  }, [onLoad]);
  return <div aria-hidden="true" className="auto-load" ref={target} />;
}
