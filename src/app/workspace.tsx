import { Button } from '@astryxdesign/core/Button';
import {
  createContext,
  use,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { FateClient, useFateClient, useRequest, useView, useLiveView } from 'react-fate';
import { auth } from 'void/client';
import { text } from '../i18n/text';
import { binderCoverImages, binderSummary, type BinderSummary } from '../profile';
import { createWorkspaceClient, WorkspaceView } from '../state';
import { workspaceAccountChanged, workspaceAccountHeader } from '../workspace-account';
import { RevisionView } from '../workspace-live';
import { Loading } from './loading';
import { type CollectionDocument, type Command, type Operation } from './model';
import {
  WorkspaceRevisionMismatch,
  workspaceResponseSchema,
  type WorkspaceResponse,
} from './workspace-sync';

export type SessionUser = { email: string; emailVerified: boolean; id: string; name: string };
export type Shared = { user: SessionUser | null };
type WorkspaceContext = {
  completeDocument: () => Promise<CollectionDocument>;
  deleteAccount: (password: string) => Promise<void>;
  discard: () => Promise<void>;
  dispatch: (command: Command) => Promise<void>;
  document: CollectionDocument;
  ensureBinder: (id: string) => Promise<void> | undefined;
  error: string;
  loaded: boolean;
  pending: number;
  ready: Promise<void>;
  refresh: () => Promise<void>;
  summaries: Array<BinderSummary>;
  syncing: boolean;
};
const Workspace = createContext<WorkspaceContext | null>(null);
export function useWorkspace() {
  const value = useContext(Workspace);
  if (!value) {
    throw new Error(text('Sign in to edit a collection.'));
  }
  if (!value.loaded && value.error) {
    throw new Error(value.error);
  }
  use(value.ready);
  return value;
}

class WorkspaceAccountError extends Error {}
async function readResponse(response: Response, userId: string): Promise<WorkspaceResponse> {
  const body = (await response.json()) as { code?: string; error?: string; userId?: string };
  if (
    response.status === 401 ||
    body.code === workspaceAccountChanged ||
    (response.ok && body.userId !== userId)
  ) {
    throw new WorkspaceAccountError(
      text(
        'Your session changed. Reload to continue. Unsynced edits are saved for your original account.',
      ),
    );
  }
  if (!response.ok) {
    throw new Error(body.error ?? text('Changes are saved on this device. Sync will retry.'));
  }
  return workspaceResponseSchema.parse(body);
}
function LiveWorkspace({
  refresh,
  revision,
  userId,
}: {
  refresh: () => Promise<void>;
  revision: number;
  userId: string;
}) {
  const { revision: remote } = useRequest(
    { revision: { id: userId, view: RevisionView } },
    { mode: 'stale-while-revalidate' },
  );
  const server = useLiveView(RevisionView, remote);
  useEffect(() => {
    if (server.revision > revision) {
      void refresh();
    }
  }, [server.revision, revision, refresh]);
  return null;
}
function ConnectedWorkspace({ children, userId }: { children: ReactNode; userId: string }) {
  const client = useFateClient();
  const { workspace } = useRequest({ workspace: { view: WorkspaceView } });
  const data = useView(WorkspaceView, workspace);
  const document = useMemo(() => JSON.parse(data.document) as CollectionDocument, [data.document]);
  const pending = useMemo(() => JSON.parse(data.pending) as Array<Operation>, [data.pending]);
  const loadedBinderIds = useMemo(
    () => JSON.parse(data.loadedBinderIds) as Array<string>,
    [data.loadedBinderIds],
  );
  const loadedIds = useRef(loadedBinderIds);
  const wantedIds = useRef(new Set<string>());
  const documentRef = useRef(document);
  const waiters = useRef(new Map<string, { promise: Promise<void>; resolve: () => void }>());
  useEffect(() => {
    loadedIds.current = loadedBinderIds;
    documentRef.current = document;
    for (const [id, waiter] of waiters.current) {
      if (loadedBinderIds.includes(id) || !document.binders.some((b) => b.id === id)) {
        waiter.resolve();
        waiters.current.delete(id);
        wantedIds.current.delete(id);
      }
    }
  }, [loadedBinderIds, document]);
  const summaries = useMemo(() => {
    const counts = JSON.parse(data.counts) as NonNullable<WorkspaceResponse['counts']>;
    return document.binders.map((binder) => {
      if (loadedBinderIds.includes(binder.id)) {
        return binderSummary(binder, document.ownership);
      }
      const count = counts.find(({ id }) => id === binder.id);
      return {
        ...binderSummary(binder, {}),
        ...count,
        images: binderCoverImages(
          count?.coverPrintings ?? (count?.firstPrinting ? [count.firstPrinting] : []),
        ),
      };
    });
  }, [data.counts, document, loadedBinderIds]);
  const latest = useRef(pending);
  const serverRevision = useRef(data.revision);
  useEffect(() => {
    serverRevision.current = data.revision;
  }, [data.revision]);
  useEffect(() => {
    latest.current = pending;
  }, [pending]);
  const busy = useRef(false);
  const requested = useRef(false);
  const paused = useRef(false);
  const [accountChanged, setAccountChanged] = useState(false);
  const [connection, setConnection] = useState(0);
  const [failures, setFailures] = useState(0);
  const [readiness] = useState(() => {
    let resolve!: () => void;
    const promise = new Promise<void>((done) => {
      resolve = done;
    });
    return { promise, resolve };
  });
  useEffect(() => {
    if (data.loaded) {
      readiness.resolve();
    }
  }, [data.loaded, readiness]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(
    async function refreshWorkspace() {
      if (paused.current || !mounted.current) {
        return;
      }
      if (busy.current) {
        requested.current = true;
        return;
      }
      if (!navigator.onLine) {
        return;
      }
      requested.current = false;
      busy.current = true;
      setSyncing(true);
      try {
        await navigator.locks.request(`binder-sync:${userId}`, async () => {
          if (!mounted.current || paused.current) {
            return;
          }
          const batch = latest.current.slice(0, 50);
          const since = serverRevision.current >= 0 ? serverRevision.current : undefined;
          const loadedBinderIds = [...new Set([...loadedIds.current, ...wantedIds.current])];
          const hydrateBinderIds = [...wantedIds.current];
          const query = new URLSearchParams({
            hydrate: hydrateBinderIds.join(','),
            loaded: loadedBinderIds.join(','),
            since: String(since ?? -1),
          });
          const response = await fetch(
            batch.length ? '/api/workspace' : `/api/workspace?${query}`,
            batch.length
              ? {
                  body: JSON.stringify({
                    hydrateBinderIds,
                    loadedBinderIds,
                    operations: batch,
                    since,
                  }),
                  headers: {
                    'Content-Type': 'application/json',
                    [workspaceAccountHeader]: userId,
                    'X-Workspace-View': 'shelf',
                  },
                  method: 'POST',
                }
              : {
                  cache: 'no-store',
                  headers: { [workspaceAccountHeader]: userId, 'X-Workspace-View': 'shelf' },
                },
          );
          let state = await readResponse(response, userId);
          if (mounted.current) {
            try {
              await client.mutations.workspace.receive({
                input: { ...state, acknowledged: state.acknowledged ?? [] },
              });
            } catch (error) {
              if (!WorkspaceRevisionMismatch.is(error)) {
                throw error;
              }
              // A response can race another tab's persisted revision. Rebase from
              // a fresh snapshot, retaining receipts and replaying unsent edits.
              query.set('since', '-1');
              const snapshot = await readResponse(
                await fetch(`/api/workspace?${query}`, {
                  cache: 'no-store',
                  headers: { [workspaceAccountHeader]: userId, 'X-Workspace-View': 'shelf' },
                }),
                userId,
              );
              if (!mounted.current || paused.current) {
                return;
              }
              state = { ...snapshot, acknowledged: state.acknowledged ?? [] };
              await client.mutations.workspace.receive({
                input: { ...state, acknowledged: state.acknowledged ?? [] },
              });
            }
            serverRevision.current = Math.max(serverRevision.current, state.revision);
            setError('');
            setFailures(0);
          }
        });
      } catch (error_) {
        if (mounted.current) {
          if (error_ instanceof WorkspaceAccountError) {
            paused.current = true;
            requested.current = false;
            setAccountChanged(true);
          }
          setFailures((count) => count + 1);
          setError(
            error_ instanceof Error
              ? error_.message
              : text('Could not sync. Your changes are saved on this device.'),
          );
        }
      } finally {
        busy.current = false;
        if (mounted.current) {
          setSyncing(false);
          if (requested.current) {
            window.setTimeout(() => {
              if (mounted.current) {
                void refreshWorkspace();
              }
            }, 60);
          }
        }
      }
    },
    [client, userId],
  );
  useEffect(() => {
    if (data.loaded && !pending.length && !waiters.current.size && !failures) {
      return;
    }
    const timer = window.setTimeout(
      () => void refresh(),
      failures ? Math.min(30_000, 1000 * 2 ** Math.min(failures, 5)) : 60,
    );
    return () => window.clearTimeout(timer);
  }, [data.loaded, pending.length, data.pending, failures, refresh]);
  useEffect(() => {
    const sync = () => {
      if (documentVisibility()) {
        setConnection((value) => value + 1);
        void refresh();
      }
    };
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
    };
  }, [refresh]);
  const ensureBinder = useCallback(
    (id: string) => {
      // This is also called during render. Refs update after commit, so they can
      // still describe the previous shelf when a live update adds a binder.
      if (loadedBinderIds.includes(id) || !document.binders.some((b) => b.id === id)) {
        return;
      }
      let waiter = waiters.current.get(id);
      if (!waiter) {
        let resolve!: () => void;
        const promise = new Promise<void>((done) => {
          resolve = done;
        });
        waiter = { promise, resolve };
        waiters.current.set(id, waiter);
        wantedIds.current.add(id);
        queueMicrotask(() => void refresh());
      }
      return waiter.promise;
    },
    [document, loadedBinderIds, refresh],
  );
  const completeDocument = async () => {
    await Promise.all(documentRef.current.binders.map(({ id }) => ensureBinder(id)));
    return documentRef.current;
  };
  const dispatch = useCallback(
    async (command: Command) => {
      if (paused.current || !mounted.current) {
        throw new WorkspaceAccountError(
          text(
            'Your session changed. Reload to continue. Unsynced edits are saved for your original account.',
          ),
        );
      }
      if ('binderId' in command) {
        await ensureBinder(command.binderId);
      }
      await client.mutations.workspace.enqueue({ input: { command, id: crypto.randomUUID() } });
    },
    [client, ensureBinder],
  );
  const discard = async () => {
    const state = await readResponse(
      await fetch('/api/workspace', {
        cache: 'no-store',
        headers: { [workspaceAccountHeader]: userId },
      }),
      userId,
    );
    if (!mounted.current || paused.current) {
      return;
    }
    await client.mutations.workspace.receive({
      input: { ...state, acknowledged: [], discard: true },
    });
    setError('');
  };
  const deleteAccount = async (password: string) => {
    if (paused.current || !mounted.current) {
      throw new Error(text('Please reload to try again.'));
    }
    paused.current = true;
    requested.current = false;
    try {
      await navigator.locks.request(`binder-sync:${userId}`, async () => {
        const result = await auth.deleteUser({
          fetchOptions: { headers: { [workspaceAccountHeader]: userId } },
          password,
        });
        if (result.error) {
          throw new Error(
            text('Could not delete your account. Check your password and try again.'),
          );
        }
        client.closeLiveSubscriptions();
        await client.mutations.workspace.erase();
        window.location.replace('/');
      });
    } catch (error) {
      paused.current = false;
      throw error;
    }
  };
  if (accountChanged) {
    return (
      <main className="shell empty">
        <p role="alert">{error}</p>
        <Button label={text('Reload')} onClick={() => window.location.reload()} type="button">
          {text('Reload')}
        </Button>
      </main>
    );
  }
  return (
    <Workspace
      value={{
        completeDocument,
        deleteAccount,
        discard,
        dispatch,
        document,
        ensureBinder,
        error,
        loaded: data.loaded,
        pending: pending.length,
        ready: readiness.promise,
        refresh,
        summaries,
        syncing,
      }}
    >
      <ErrorBoundary
        fallbackRender={() => (
          <main className="shell workspace-retry">
            <Button label={text('Retry')} onClick={() => void refresh()} type="button">
              {text('Retry')}
            </Button>
          </main>
        )}
        resetKeys={[data.loaded, error]}
      >
        <Suspense fallback={<Loading />}>{children}</Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={null} resetKeys={[connection]}>
        <Suspense fallback={null}>
          <LiveWorkspace
            key={connection}
            refresh={refresh}
            revision={data.revision}
            userId={userId}
          />
        </Suspense>
      </ErrorBoundary>
    </Workspace>
  );
}
const documentVisibility = () => globalThis.document.visibilityState === 'visible';
export function AccountWorkspace({ children, user }: { children: ReactNode; user: SessionUser }) {
  const [client] = useState(() => createWorkspaceClient(user.id));
  useEffect(() => () => client.closeLiveSubscriptions(), [client]);
  return (
    <FateClient client={client}>
      <Suspense fallback={<Loading />}>
        <ConnectedWorkspace userId={user.id}>{children}</ConnectedWorkspace>
      </Suspense>
    </FateClient>
  );
}
