import { useNavigation, useRouter } from '@void/react';
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { Loading } from './loading';
const level = (path: string) => path.split('/').filter(Boolean).length;
const isCatalog = (path: string) =>
  path === '/cards' || path === '/sets' || path.startsWith('/sets/');

export function RouteSurface({ children }: { children: ReactNode }) {
  const { pathname } = useRouter().url;
  const pending = useNavigation();
  // Same-page filters, page numbers and background refreshes keep their content.
  const leaving =
    pending.state === 'loading' &&
    pending.location !== null &&
    pending.location.pathname !== pathname;
  const [navigation, setNavigation] = useState({ back: false, catalog: false, pathname });
  const back =
    navigation.pathname === pathname
      ? navigation.back
      : level(pathname) < level(navigation.pathname);
  const catalog =
    navigation.pathname === pathname
      ? navigation.catalog
      : isCatalog(navigation.pathname) && isCatalog(pathname);
  if (navigation.pathname !== pathname) {
    setNavigation({ back, catalog, pathname });
  }
  useLayoutEffect(() => {
    document.documentElement.dataset.navigation = back ? 'back' : 'forward';
    document.documentElement.dataset.catalogNavigation = String(catalog);
  }, [back, catalog, pathname]);
  return (
    <div
      aria-busy={leaving || undefined}
      className="route-surface"
      data-pending={leaving || undefined}
    >
      {/* Keep the account-scoped Fate client and in-flight mutations mounted. */}
      <div aria-hidden={leaving || undefined} className="route-content" inert={leaving}>
        {children}
      </div>
      {leaving && (
        <div className="route-loading">
          <Loading />
        </div>
      )}
    </div>
  );
}
