import { z } from 'zod';
import { applyCommand, type CollectionDocument, type Command } from '../app/model';
export const scopes = [
  'collection:read',
  'ownership:write',
  'binders:write',
  'binders:delete',
  'sharing:write',
] as const;
export type Scope = (typeof scopes)[number];
export const keyInput = z.object({
  binderIds: z.array(z.uuid()).max(100).default([]),
  expiresInDays: z.number().int().min(1).max(365).default(90),
  name: z.string().trim().min(1).max(60),
  scopes: z
    .array(z.enum(scopes))
    .min(1)
    .max(scopes.length)
    .refine((values) => values.includes('collection:read')),
});
export type Grant = {
  binderIds: Array<string>;
  id: string;
  name: string;
  scopes: Array<Scope>;
  userId: string;
};
export class ApiError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 413 | 429,
    message: string,
  ) {
    super(message);
  }
}
export function projectCollection(doc: CollectionDocument, grant: Grant): CollectionDocument {
  if (!grant.binderIds.length) {
    return doc;
  }
  const binders = doc.binders.filter(({ id }) => grant.binderIds.includes(id));
  const printings = new Set(binders.flatMap(({ slots }) => slots).filter(Boolean));
  return {
    binders,
    ownership: Object.fromEntries(
      Object.entries(doc.ownership).filter(([id]) => printings.has(id)),
    ),
    version: 1,
  };
}
export function authorizeCommands(doc: CollectionDocument, commands: Array<Command>, grant: Grant) {
  let next = doc;
  for (const command of commands) {
    const scope: Scope = command.type.startsWith('ownership.')
      ? 'ownership:write'
      : command.type === 'binder.delete'
        ? 'binders:delete'
        : command.type === 'binder.share' || command.type === 'profile.settings'
          ? 'sharing:write'
          : 'binders:write';
    if (!grant.scopes.includes(scope)) {
      throw new ApiError(403, `This key requires ${scope}.`);
    }
    if (command.type === 'collection.import') {
      if (!grant.scopes.includes('ownership:write')) {
        throw new ApiError(403, 'Importing a collection requires ownership:write.');
      }
      if (grant.binderIds.length) {
        throw new ApiError(403, 'Binder-restricted keys cannot import collections.');
      }
    }
    if (
      command.type === 'binder.create' &&
      command.binder.shareToken &&
      !grant.scopes.includes('sharing:write')
    ) {
      throw new ApiError(403, 'Creating a shared binder requires sharing:write.');
    }
    if (
      command.type === 'binder.slot' &&
      (command.status !== undefined || command.owned !== undefined) &&
      !grant.scopes.includes('ownership:write')
    ) {
      throw new ApiError(403, 'Changing ownership requires ownership:write.');
    }
    if (grant.binderIds.length) {
      if (command.type === 'profile.settings') {
        throw new ApiError(403, 'Binder-restricted keys cannot change profile sharing.');
      }
      if (command.type === 'binder.create') {
        throw new ApiError(403, 'Binder-restricted keys cannot create binders.');
      }
      if ('binderId' in command && !grant.binderIds.includes(command.binderId)) {
        throw new ApiError(403, 'This binder is outside the key’s scope.');
      }
      if (command.type.startsWith('ownership.')) {
        const allowed = new Set(
          projectCollection(next, grant).binders.flatMap(({ slots }) => slots),
        );
        const ids =
          'printings' in command
            ? command.printings
            : 'printing' in command
              ? [command.printing]
              : [];
        if (ids.some((id) => !allowed.has(id))) {
          throw new ApiError(403, 'This printing is outside the key’s binders.');
        }
      }
    }
    try {
      next = applyCommand(next, command);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : 'Invalid collection change.',
      );
    }
  }
  return next;
}
export function collectionChanges(before: CollectionDocument, after: CollectionDocument) {
  const ids = new Set([...Object.keys(before.ownership), ...Object.keys(after.ownership)]);
  return {
    ...(JSON.stringify(before.profile) !== JSON.stringify(after.profile)
      ? { profile: { after: after.profile ?? null, before: before.profile ?? null } }
      : {}),
    binders: [...new Set([...before.binders, ...after.binders].map(({ id }) => id))].flatMap(
      (id) => {
        const previous = before.binders.find((b) => b.id === id),
          next = after.binders.find((b) => b.id === id);
        return JSON.stringify(previous) === JSON.stringify(next)
          ? []
          : [
              {
                action: !previous ? 'created' : !next ? 'deleted' : 'updated',
                after: next ?? null,
                before: previous ?? null,
                id,
                name: next?.name ?? previous!.name,
              },
            ];
      },
    ),
    ownership: [...ids]
      .filter((id) => before.ownership[id] !== after.ownership[id])
      .map((printing) => ({
        after: after.ownership[printing] ?? false,
        before: before.ownership[printing] ?? false,
        printing,
      })),
  };
}
