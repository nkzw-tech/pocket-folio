import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { observeAhead } from './observe-ahead';

export function CardImage({
  loading,
  src,
  ...props
}: Omit<ComponentProps<'img'>, 'ref' | 'src'> & { src: string }) {
  const image = useRef<HTMLImageElement>(null);
  const [decoded, setDecoded] = useState<string>();
  useEffect(() => {
    const node = image.current;
    if (!node) {
      return;
    }
    let active = true;
    const loaded = () => {
      if (!node.complete || !node.naturalWidth) {
        return;
      }
      void node
        .decode()
        .then(() => {
          if (active) {
            setDecoded(src);
          }
        })
        .catch(() => {});
    };
    const failed = () => setDecoded(undefined);
    node.addEventListener('load', loaded);
    node.addEventListener('error', failed);
    loaded(); // Cached images may have loaded before hydration / event registration.
    const stop =
      loading === 'lazy'
        ? observeAhead(node, () => {
            node.loading = 'eager';
          })
        : undefined;
    return () => {
      active = false;
      stop?.();
      node.removeEventListener('load', loaded);
      node.removeEventListener('error', failed);
    };
  }, [loading, src]);
  return (
    <img
      {...props}
      data-loaded={decoded === src || undefined}
      key={src}
      loading={loading}
      ref={image}
      src={src}
    />
  );
}
