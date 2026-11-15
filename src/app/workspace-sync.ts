import { z } from 'zod';
import { binderSchema, documentSchema, profileSchema, type CollectionDocument } from './model';

export const workspaceResponseSchema = z
  .object({
    acknowledged: z.array(z.string()).optional(),
    counts: z
      .array(
        z.object({
          coverPrintings: z.array(z.string()).optional(),
          firstPrinting: z.string().nullable(),
          id: z.string(),
          owned: z.number(),
          purchased: z.number(),
          total: z.number(),
          wishlist: z.number(),
        }),
      )
      .optional(),
    delta: z
      .object({
        binders: z.array(binderSchema),
        deleted: z.array(z.string()),
        ownership: documentSchema.shape.ownership,
        profile: profileSchema.nullable(),
      })
      .optional(),
    document: documentSchema.optional(),
    fromRevision: z.number().int().min(0).optional(),
    loadedBinderIds: z.array(z.string()).optional(),
    order: z.array(z.string()).optional(),
    revision: z.number().int().min(0),
  })
  .refine(
    (state) =>
      !!state.document !== !!state.delta && (!state.delta || state.fromRevision !== undefined),
  );
export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;

export class WorkspaceRevisionMismatch extends Error {
  static is(error: unknown): error is WorkspaceRevisionMismatch {
    return error instanceof Error && error.name === 'WorkspaceRevisionMismatch';
  }

  constructor() {
    super('Workspace revision mismatch');
    this.name = 'WorkspaceRevisionMismatch';
  }
}

export function mergeWorkspace(
  base: CollectionDocument,
  revision: number,
  state: WorkspaceResponse,
): CollectionDocument {
  if (state.document) {
    return state.document;
  }
  if (!state.delta || state.fromRevision !== revision) {
    throw new WorkspaceRevisionMismatch();
  }
  const { delta } = state;
  const updated = new Map(delta.binders.map((binder) => [binder.id, binder]));
  const ids = new Set(base.binders.map(({ id }) => id));
  const order = new Map(state.order?.map((id, index) => [id, index]));
  return {
    binders: [
      ...base.binders
        .filter(({ id }) => !delta.deleted.includes(id))
        .map((binder) => updated.get(binder.id) ?? binder),
      ...delta.binders.filter(({ id }) => !ids.has(id)),
    ].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
    ownership: { ...base.ownership, ...delta.ownership },
    ...(delta.profile ? { profile: delta.profile } : {}),
    version: 1,
  };
}
