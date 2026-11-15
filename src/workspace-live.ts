import { view, type Transport } from '@nkzw/fate';
import { connectLiveStream, type LiveClient } from 'void/live/client';
import { z } from 'zod';

export const RevisionView = view<{
  __typename: 'WorkspaceRevision';
  id: string;
  revision: number;
}>()({ id: true, revision: true });
const revisionSchema = z.object({ id: z.string(), revision: z.number().int().nonnegative() });

export function workspaceTransport(userId: string): Transport {
  let stream: LiveClient | undefined;
  const read = async (signal?: AbortSignal) => {
    const response = await fetch('/api/workspace-revision', { cache: 'no-store', signal });
    if (!response.ok) {
      throw new Error('Could not connect to your collection.');
    }
    const record = revisionSchema.parse(await response.json());
    if (record.id !== userId) {
      throw new Error('Your account changed. Please reload.');
    }
    return { ...record, __typename: 'WorkspaceRevision' };
  };
  return {
    closeLiveSubscriptions() {
      stream?.close();
      stream = undefined;
    },
    async fetchById(type, ids, _select, _args, context) {
      if (type !== 'WorkspaceRevision' || ids.some((id) => id !== userId)) {
        throw new Error('Unknown collection.');
      }
      return [await read(context?.signal)];
    },
    subscribeById(type, id, _select, _args, handlers) {
      if (type !== 'WorkspaceRevision' || id !== userId) {
        throw new Error('Unknown collection.');
      }
      let active = true;
      let newest = -1;
      const controller = new AbortController();
      const deliver = (record: z.infer<typeof revisionSchema>) => {
        if (active && record.id === userId && record.revision > newest) {
          newest = record.revision;
          handlers.onData({ ...record, __typename: 'WorkspaceRevision' });
        }
      };
      const recover = () => {
        void read(controller.signal)
          .then(deliver)
          .catch((error: unknown) => {
            if (active) {
              handlers.onError?.(error);
            }
          });
      };
      stream = connectLiveStream('/api/workspace-live', {
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          // Read after subscription registration, including reconnects, to close the event gap.
          if (response.ok && init?.method === 'POST') {
            recover();
          }
          return response;
        },
        onError: (error) => handlers.onError?.(error),
        withCredentials: true,
      });
      const connection = stream;
      let retry: ReturnType<typeof setTimeout> | undefined;
      let attempts = 0;
      const subscribe = () => {
        void connection
          .subscribe({
            id: 'collection',
            onEvent: (event) => {
              const result = revisionSchema.safeParse(event.data);
              if (result.success) {
                deliver(result.data);
              }
            },
            topic: `workspace:${userId}`,
          })
          .catch((error: unknown) => {
            if (active) {
              handlers.onError?.(error);
              retry = setTimeout(subscribe, Math.min(30_000, 1000 * 2 ** Math.min(attempts++, 5)));
            }
          });
      };
      subscribe();
      return () => {
        clearTimeout(retry);
        active = false;
        controller.abort();
        connection.close();
        if (stream === connection) {
          stream = undefined;
        }
      };
    },
  };
}
