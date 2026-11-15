import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Theme } from '@astryxdesign/core/theme';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import '../src/ui/controls.css';
import { Link, useRouter, useShared } from '@void/react';
import { lazy, Suspense, useSyncExternalStore, type ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AccountMenu } from '../src/app/account-menu';
import { Brand } from '../src/app/brand';
import { Footer } from '../src/app/footer';
import { Loading } from '../src/app/loading';
import { RouteSurface } from '../src/app/route-surface';
import type { Shared, SessionUser } from '../src/app/workspace';
import { pocketFolioTheme } from '../src/ui/theme';
const AccountWorkspace = lazy(async () => ({
  default: (await import('../src/app/workspace')).AccountWorkspace,
}));
const subscribe = () => () => {};
function ClientWorkspace({ children, user }: { children: ReactNode; user: SessionUser }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? <AccountWorkspace user={user}>{children}</AccountWorkspace> : <Loading />;
}
import { CatalogOwnershipProvider } from '../src/catalog-ownership';
import { CardLanguageProvider } from '../src/i18n/card-language-preference';
import { Locale } from '../src/i18n/locale';
import { text } from '../src/i18n/text';
import '../src/styles.css';
import '../src/app/app.css';

function LocalizedLayout({ children }: { children: ReactNode }) {
  const { user } = useShared<Shared>();
  const { pathname } = useRouter().url;
  const header = (
    <>
      <header className="site-header">
        <div className="shell header-content">
          <Brand />
          <nav aria-label={text('Main navigation')} className="app-nav">
            <Link href="/">{text('Binders')}</Link>
            <Link aria-current={pathname.startsWith('/sets') ? 'page' : undefined} href="/sets">
              {text('Sets')}
            </Link>
            <Link href="/cards">{text('Cards')}</Link>
          </nav>
          <AccountMenu user={user} />
        </div>
      </header>
    </>
  );
  return (
    <CatalogOwnershipProvider key={user?.id ?? 'guest'}>
      <div className="app-shell">
        {header}
        <RouteSurface>
          <ErrorBoundary
            fallbackRender={({ error }) => (
              <Stack align="center" as="main" className="shell route-error" gap={4}>
                <h1>{text('Couldn’t open this view')}</h1>
                <p>
                  {error instanceof Error ? error.message : text('Please reload to try again.')}
                </p>
                <Button label={text('Reload')} onClick={() => location.reload()} type="button">
                  {text('Reload')}
                </Button>
              </Stack>
            )}
            resetKeys={[pathname, user?.id]}
          >
            <Suspense fallback={<Loading />}>
              {user ? (
                <ClientWorkspace key={user.id} user={user}>
                  {children}
                </ClientWorkspace>
              ) : (
                children
              )}
            </Suspense>
          </ErrorBoundary>
        </RouteSurface>
        <Footer />
      </div>
    </CatalogOwnershipProvider>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Locale>
      <CardLanguageProvider>
        <Theme mode="dark" theme={pocketFolioTheme}>
          <LocalizedLayout>{children}</LocalizedLayout>
        </Theme>
      </CardLanguageProvider>
    </Locale>
  );
}
