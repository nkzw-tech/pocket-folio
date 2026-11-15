type Pool = {
  callbacks: Map<Element, () => void>;
  dispose: () => void;
  observer: IntersectionObserver;
};
const pools = new Map<Element | null, Pool>();

function scrollRoot(element: Element) {
  for (
    let parent = element.parentElement;
    parent && parent !== document.body;
    parent = parent.parentElement
  ) {
    if (
      parent.scrollHeight > parent.clientHeight &&
      /(auto|scroll)/.test(getComputedStyle(parent).overflowY)
    ) {
      return parent;
    }
  }
  return null;
}

// Share one observer per scrolling surface, including dialogs and typeaheads.
// Load one visible screen ahead in either direction, without a scroll handler.
export function observeAhead(element: Element, onNear: () => void): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onNear();
    return () => {};
  }
  const root = scrollRoot(element);
  let pool = pools.get(root);
  if (!pool) {
    const callbacks = new Map<Element, () => void>();
    const createObserver = () =>
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const callback = callbacks.get(entry.target);
              remove(entry.target);
              callback?.();
            }
          }
        },
        { root, rootMargin: `${root?.clientHeight || window.innerHeight}px 0px` },
      );
    const resize = () => {
      if (pools.get(root) !== pool) {
        return;
      }
      pool!.observer.disconnect();
      pool!.observer = createObserver();
      for (const target of callbacks.keys()) {
        pool!.observer.observe(target);
      }
    };
    const resized = root ? new ResizeObserver(resize) : null;
    pool = {
      callbacks,
      dispose() {
        pool!.observer.disconnect();
        resized?.disconnect();
        window.removeEventListener('resize', resize);
        pools.delete(root);
      },
      observer: createObserver(),
    };
    if (root) {
      resized!.observe(root);
    } else {
      window.addEventListener('resize', resize);
    }
    pools.set(root, pool);
  }
  function remove(target: Element) {
    if (!pool!.callbacks.delete(target)) {
      return;
    }
    pool!.observer.unobserve(target);
    if (!pool!.callbacks.size) {
      pool!.dispose();
    }
  }
  pool.callbacks.set(element, onNear);
  pool.observer.observe(element);
  return () => remove(element);
}
