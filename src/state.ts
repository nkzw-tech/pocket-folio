import { clientRoot, clientSchema, createClient, dataView, view, type EntityOf } from '@nkzw/fate';
import { createIndexedDBStorage } from '@nkzw/fate-indexeddb';
import { createPersistence } from '@nkzw/fate/persistence';
import { z } from 'zod';
import {
  applyCommand,
  emptyDocument,
  operationSchema,
  type CollectionDocument,
  type Operation,
} from './app/model';
import { mergeWorkspace, workspaceResponseSchema } from './app/workspace-sync';
import { workspaceTransport } from './workspace-live';

type Workspace = {
  counts: string;
  document: string;
  id: string;
  loaded: boolean;
  loadedBinderIds: string;
  pending: string;
  revision: number;
  serverDocument: string;
};
const workspace = dataView<Workspace>('Workspace')({
  counts: true,
  document: true,
  id: true,
  loaded: true,
  loadedBinderIds: true,
  pending: true,
  revision: true,
  serverDocument: true,
});
const schema = clientSchema({
  roots: { workspace: { id: 'main', type: 'Workspace' } },
  types: {
    Workspace: {
      defaults: (id) => ({
        counts: '[]',
        document: JSON.stringify(emptyDocument()),
        id,
        loaded: false,
        loadedBinderIds: '[]',
        pending: '[]',
        revision: -1,
        serverDocument: JSON.stringify(emptyDocument()),
      }),
      view: workspace,
    },
  },
});
const roots = {
  revision: clientRoot<
    { __typename: 'WorkspaceRevision'; id: string; revision: number },
    'WorkspaceRevision'
  >('WorkspaceRevision'),
};
export const createWorkspaceClient = (userId: string) =>
  createClient<[typeof roots, Record<never, never>]>({
    persistence: createPersistence({
      clientState: { limits: { maxStringLength: 16_000_000 } },
      key: `card-binder:user:${userId}:v2`,
      storage: createIndexedDBStorage(),
    }),
    roots,
    transport: workspaceTransport(userId),
    types: [{ type: 'WorkspaceRevision' }],
  }).registerClientSchema(schema, ({ mutation }) => ({
    'workspace.enqueue': mutation('Workspace', {
      input: operationSchema,
      resolve: ({ input, store }) => {
        const current = store.get('Workspace', 'main')!;
        const before = JSON.parse(
          current.document ?? JSON.stringify(emptyDocument()),
        ) as CollectionDocument;
        const document = applyCommand(
          JSON.parse(current.document ?? JSON.stringify(emptyDocument())) as CollectionDocument,
          input.command,
        );
        const pending = JSON.parse(current.pending ?? '[]') as Array<Operation>;
        pending.push(input);
        return store.update('Workspace', 'main', {
          document: JSON.stringify(document),
          loadedBinderIds: JSON.stringify([
            ...new Set([
              ...(JSON.parse(current.loadedBinderIds ?? '[]') as Array<string>),
              ...document.binders
                .filter((b) => !before.binders.some(({ id }) => id === b.id))
                .map(({ id }) => id),
            ]),
          ]),
          pending: JSON.stringify(pending),
        });
      },
    }),
    'workspace.erase': mutation('Workspace', {
      resolve: ({ store }) =>
        store.update('Workspace', 'main', {
          counts: '[]',
          document: JSON.stringify(emptyDocument()),
          loaded: true,
          loadedBinderIds: '[]',
          pending: '[]',
          revision: -1,
          serverDocument: JSON.stringify(emptyDocument()),
        }),
    }),
    'workspace.receive': mutation('Workspace', {
      input: workspaceResponseSchema.and(
        z.object({
          acknowledged: z.array(z.string()),
          discard: z.boolean().optional(),
        }),
      ),
      resolve: ({ input, store }) => {
        const current = store.get('Workspace', 'main')!;
        if (input.revision < (current.revision ?? -1)) {
          return current;
        }
        const pending = input.discard
          ? []
          : (JSON.parse(current.pending ?? '[]') as Array<Operation>).filter(
              ({ id }) => !input.acknowledged.includes(id),
            );
        const serverDocument = mergeWorkspace(
          JSON.parse(
            current.serverDocument ?? JSON.stringify(emptyDocument()),
          ) as CollectionDocument,
          current.revision ?? -1,
          input,
        );
        const document = pending.reduce((doc, op) => applyCommand(doc, op.command), serverDocument);
        return store.update('Workspace', 'main', {
          counts: JSON.stringify(input.counts ?? []),
          document: JSON.stringify(document),
          loaded: true,
          loadedBinderIds: JSON.stringify(
            [
              ...new Set([
                ...(input.loadedBinderIds ?? serverDocument.binders.map(({ id }) => id)),
                ...document.binders
                  .filter((b) => !serverDocument.binders.some(({ id }) => id === b.id))
                  .map(({ id }) => id),
              ]),
            ].filter((id) => document.binders.some((b) => b.id === id)),
          ),
          pending: JSON.stringify(pending),
          revision: input.revision,
          serverDocument: JSON.stringify(serverDocument),
        });
      },
    }),
  }));
export type WorkspaceClient = ReturnType<typeof createWorkspaceClient>;
export const WorkspaceView = view<EntityOf<WorkspaceClient, 'Workspace'>>()({
  counts: true,
  document: true,
  id: true,
  loaded: true,
  loadedBinderIds: true,
  pending: true,
  revision: true,
  serverDocument: true,
});
declare module '@nkzw/fate' {
  interface ClientRegistration {
    client: WorkspaceClient;
  }
}
