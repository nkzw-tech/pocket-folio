import { useEffect, useState } from 'react';

function initials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .map((part) => part.replaceAll(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  return (
    (parts.length > 1
      ? `${[...parts[0]][0]}${[...parts.at(-1)!][0]}`
      : [...(parts[0] ?? '')].slice(0, 2).join('')
    ).toLocaleUpperCase() || '?'
  );
}

export function AccountAvatar({ email, name }: { email: string; name: string }) {
  const [source, setSource] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!globalThis.crypto?.subtle) {
      return;
    }
    let cancelled = false;
    void crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()))
      .then((digest) => {
        if (!cancelled) {
          const hash = Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join('');
          setSource(`https://www.gravatar.com/avatar/${hash}?s=96&d=404&r=g`);
        }
      })
      .catch(() => {
        // Initials remain available if hashing is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, [email]);
  return (
    <>
      {!loaded && initials(name)}
      {source && (
        <img
          alt=""
          className={loaded ? 'is-loaded' : undefined}
          decoding="async"
          height={30}
          onError={() => {
            setSource(undefined);
            setLoaded(false);
          }}
          onLoad={() => setLoaded(true)}
          referrerPolicy="no-referrer"
          src={source}
          width={30}
        />
      )}
    </>
  );
}
