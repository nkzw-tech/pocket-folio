import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from 'react';
import type { BookTurn, BookView, createBinderScene } from './binder-webgl';

// Start fetching alongside the book's layout and artwork, only in the book view.
async function loadRenderer() {
  if (!import.meta.env.SSR) {
    try {
      return (await import('./binder-webgl')).createBinderScene;
    } catch {
      // The static book is interactive if the graphics chunk is unavailable.
    }
  }
}

export type BinderCanvasController = {
  cancel: () => void;
  ready: () => boolean;
  update: (turn: BookTurn) => void;
};
export function BinderCanvas({
  complete,
  onReady,
  ref,
  turn,
  view,
}: {
  complete: () => void;
  onReady: () => void;
  ref: Ref<BinderCanvasController>;
  turn?: BookTurn;
  view: BookView;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [renderer] = useState(loadRenderer);
  const scene = useRef<ReturnType<typeof createBinderScene> | undefined>(undefined);
  const latest = useRef({ complete, view });
  const [generation, restart] = useState(0);
  useLayoutEffect(() => {
    latest.current = { complete, view };
    scene.current?.update(view);
  }, [complete, view]);
  useImperativeHandle(
    ref,
    () => ({
      cancel: () => scene.current?.setTurn(undefined),
      ready: () =>
        Boolean(scene.current && canvas.current?.parentElement?.hasAttribute('data-webgl')),
      update: (next) => scene.current?.setTurn(next),
    }),
    [],
  );
  useEffect(() => {
    const el = canvas.current!;
    let active = true;
    function showStaticBook() {
      if (active) {
        scene.current?.dispose();
        scene.current = undefined;
        onReady();
      }
    }
    // Resolve layout first so fonts used by the cover and pocket labels are
    // included in fonts.ready even when this effect runs before paint.
    el.getBoundingClientRect();
    void Promise.all([renderer, document.fonts.ready])
      .then(([createScene]) => {
        if (!active) {
          return;
        }
        if (createScene) {
          scene.current = createScene(
            el,
            latest.current.view,
            () => latest.current.complete(),
            onReady,
            showStaticBook,
          );
        } else {
          onReady();
        }
      })
      .catch(showStaticBook);
    function lost(e: Event) {
      e.preventDefault();
      showStaticBook();
      latest.current.complete();
    }
    function restored() {
      restart((n) => n + 1);
    }
    el.addEventListener('webglcontextlost', lost);
    el.addEventListener('webglcontextrestored', restored);
    return () => {
      active = false;
      el.removeEventListener('webglcontextlost', lost);
      el.removeEventListener('webglcontextrestored', restored);
      scene.current?.dispose();
      scene.current = undefined;
    };
  }, [generation, onReady, renderer]);
  useLayoutEffect(() => {
    scene.current?.setTurn(turn);
  }, [turn]);
  return <canvas aria-hidden="true" className="folio-canvas" ref={canvas} />;
}
