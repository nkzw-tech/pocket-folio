import { useLayoutEffect, type RefObject } from 'react';

// Fit the real page geometry: pocket controls and sleeve seams have fixed
// heights, so scaling by the cards' aspect ratio alone leaves wasted space.
export function useBinderFit(
  table: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  columns: number,
  rows: number,
  narrow: boolean,
) {
  useLayoutEffect(() => {
    const surface = table.current;
    const book = surface?.querySelector<HTMLElement>('.folio-book');
    if (!enabled || !surface || !book) {
      return;
    }
    const fit = () => {
      const style = getComputedStyle(surface);
      const width =
        surface.clientWidth -
        Number.parseFloat(style.paddingLeft) -
        Number.parseFloat(style.paddingRight);
      const height =
        surface.clientHeight -
        Number.parseFloat(style.paddingTop) -
        Number.parseFloat(style.paddingBottom);
      if (width <= 0 || height <= 0) {
        return;
      }
      const setWidth = (value: number) =>
        book.style.setProperty('--immersive-book-width', `${value}px`);
      setWidth(width);
      const fullHeight = book.getBoundingClientRect().height;
      if (fullHeight > height) {
        setWidth(width / 2);
        const halfHeight = book.getBoundingClientRect().height;
        const slope = (fullHeight - halfHeight) / (width / 2);
        if (slope > 0) {
          setWidth(Math.max(1, Math.min(width, width - (fullHeight - height) / slope)));
        }
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(surface);
    return () => {
      observer.disconnect();
      book.style.removeProperty('--immersive-book-width');
    };
  }, [table, enabled, columns, rows, narrow]);
}
