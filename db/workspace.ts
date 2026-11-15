import { env } from 'cloudflare:workers';
import { createDb } from 'void/db';
import { ApiError, authorizeCommands, collectionChanges, type Grant } from '../src/api/policy';
import { applyCommand, type Operation } from '../src/app/model';
import { workspaceLive } from '../src/server/live';
import {
  collectionWriteStatements,
  jsonChunks,
  prepare,
  readCollection,
  type ReadScope,
  type Statement,
} from './collection-store';

export const primaryDb = () => createDb(env.DB as D1Database, { session: 'first-primary' });
const database = () => (env.DB as D1Database).withSession('first-primary');
export async function readWorkspace(userId: string, scope?: ReadScope) {
  const { document, revision } = await readCollection(database(), userId, scope);
  return { document, revision };
}
export async function readWorkspaceView(
  userId: string,
  since: number,
  loadedBinderIds: Array<string>,
  hydrateBinderIds: Array<string>,
) {
  const state = await readCollection(database(), userId, {
    hydrateBinderIds,
    loadedBinderIds,
    since,
  });
  if (since > state.revision) {
    throw new ApiError(409, 'Collection revision is no longer available. Reload your collection.');
  }
  return {
    ...(since < 0
      ? { document: state.document }
      : {
          delta: {
            binders: state.document.binders,
            deleted: state.deleted,
            ownership: state.document.ownership,
            profile: state.document.profile ?? null,
          },
          fromRevision: since,
        }),
    counts: state.counts,
    loadedBinderIds,
    order: state.order,
    revision: state.revision,
  };
}
export async function readWorkspaceDelta(userId: string, since: number) {
  const { deleted, document, order, revision } = await readCollection(database(), userId, {
    since,
  });
  if (since > revision) {
    throw new ApiError(409, 'Collection revision is no longer available. Reload your collection.');
  }
  return {
    delta: {
      binders: document.binders,
      deleted,
      ownership: document.ownership,
      profile: document.profile ?? null,
    },
    fromRevision: since,
    order,
    revision,
  };
}

function commandScope(operations: Array<Operation>, grant?: Grant): ReadScope {
  // Import/profile selection need a complete snapshot for merging/validation. Agent responses
  // also include their complete authorized projection. Ordinary UI edits only load affected rows.
  if (
    grant ||
    operations.some(
      ({ command }) =>
        command.type === 'binder.create' &&
        operations.some(
          ({ command: other }) =>
            other.type === 'binder.delete' && other.binderId === command.binder.id,
        ),
    ) ||
    operations.some(
      ({ command }) => command.type === 'collection.import' || command.type === 'profile.settings',
    )
  ) {
    return grant?.binderIds.length ? { binderIds: grant.binderIds } : {};
  }
  const binderIds = new Set<string>(),
    ownershipIds = new Set<string>();
  for (const { command } of operations) {
    if ('binderId' in command) {
      binderIds.add(command.binderId);
    }
    if (command.type === 'binder.create') {
      binderIds.add(command.binder.id);
    }
    if ('printing' in command && command.printing) {
      ownershipIds.add(command.printing);
    }
    if ('printings' in command) {
      command.printings.forEach((id) => ownershipIds.add(id));
    }
  }
  return { binderIds: [...binderIds], ownershipIds: [...ownershipIds] };
}

export async function syncWorkspace(
  userId: string,
  operations: Array<Operation>,
  options?: { expectedRevision?: number; grant: Grant },
) {
  const receiptKey = (id: string) => `${userId}:${options ? options.grant.id + ':' : ''}${id}`;
  const hashes = new Map(
    await Promise.all(
      operations.map(
        async (op) =>
          [
            op.id,
            Array.from(
              new Uint8Array(
                await crypto.subtle.digest(
                  'SHA-256',
                  new TextEncoder().encode(JSON.stringify(op.command)),
                ),
              ),
            )
              .map((n) => n.toString(16).padStart(2, '0'))
              .join(''),
          ] as const,
      ),
    ),
  );
  const db = database();
  await db
    .prepare('insert into workspace_revision (userId,revision) values (?,0) on conflict do nothing')
    .bind(userId)
    .run();
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readCollection(db, userId, commandScope(operations, options?.grant));
    const receipts = await db
      .prepare(
        'select id,payloadHash from operation_receipt where userId = ? and id in (select value from json_each(?))',
      )
      .bind(userId, JSON.stringify(operations.map((op) => receiptKey(op.id))))
      .all<{ id: string; payloadHash: string }>();
    for (const op of operations) {
      const receipt = receipts.results.find((row) => row.id === receiptKey(op.id));
      if (receipt?.payloadHash && receipt.payloadHash !== hashes.get(op.id)) {
        throw new ApiError(409, 'An operation ID was reused with a different command.');
      }
    }
    const saved = new Set(receipts.results.map(({ id }) => id));
    const fresh = operations.filter((op) => !saved.has(receiptKey(op.id)));
    if (!fresh.length) {
      // Receipts can have committed after the snapshot; don't acknowledge against an older view.
      return {
        ...(await readWorkspace(
          userId,
          options?.grant.binderIds.length ? { binderIds: options.grant.binderIds } : undefined,
        )),
        acknowledged: operations.map(({ id }) => id),
      };
    }
    if (options?.expectedRevision !== undefined && current.revision !== options.expectedRevision) {
      throw new ApiError(409, 'Collection changed since preview. Preview again before applying.');
    }
    const next = options
      ? authorizeCommands(
          current.document,
          fresh.map(({ command }) => command),
          options.grant,
        )
      : fresh.reduce((doc, op) => applyCommand(doc, op.command), current.document);
    if (current.binderCount + next.binders.length - current.document.binders.length > 100) {
      throw new ApiError(400, 'A collection supports 100 binders with up to 2,000 pockets each.');
    }
    const guard = `exists (select 1 from workspace_revision where userId = ? and revision = ?)
      ${options ? `and exists (select 1 from agent_key_policy where id = ? and userId = ? and revokedAt is null and expiresAt > unixepoch('subsec') * 1000)` : ''}`;
    const guards: Statement['values'] = [
      userId,
      current.revision,
      ...(options ? [options.grant.id, userId] : []),
    ];
    const statements = collectionWriteStatements(userId, current, next, options?.grant);
    statements.push({
      sql: `insert into operation_receipt (id,userId,payloadHash,createdAt)
      select json_extract(value,'$[0]'),?,json_extract(value,'$[1]'),unixepoch() from json_each(?) where ${guard}`,
      values: [
        userId,
        JSON.stringify(fresh.map((op) => [receiptKey(op.id), hashes.get(op.id)])),
        ...guards,
      ],
    });
    if (options) {
      // Bound audit rows too: a large multi-binder action must never become a replacement blob.
      const changes = collectionChanges(current.document, next);
      const parts = [
        ...changes.binders.map((value) => ({ kind: 'binders', value })),
        ...changes.ownership.map((value) => ({ kind: 'ownership', value })),
        ...(changes.profile ? [{ kind: 'profile', value: changes.profile }] : []),
      ];
      const chunks = jsonChunks(parts);
      for (const [index, chunk] of (chunks.length ? chunks : ['[]']).entries()) {
        const entries = JSON.parse(chunk) as Array<{ kind: string; value: unknown }>;
        const audit = {
          binders: entries.filter((e) => e.kind === 'binders').map((e) => e.value),
          ownership: entries.filter((e) => e.kind === 'ownership').map((e) => e.value),
          profile: entries.find((e) => e.kind === 'profile')?.value,
        };
        statements.push({
          sql: `insert into agent_change (id,userId,keyId,keyName,revision,changes,createdAt)
          select ?,?,?,?,?,?,? where ${guard}`,
          values: [
            `${receiptKey(fresh[0].id)}:${index}`,
            userId,
            options.grant.id,
            options.grant.name,
            current.revision + 1,
            JSON.stringify(audit),
            Date.now(),
            ...guards,
          ],
        });
      }
    }
    statements.push({
      sql: `update workspace_revision set revision = revision + 1 where userId = ? and ${guard} returning revision`,
      values: [userId, ...guards],
    });
    // All changes, permission/revision checks and retry receipts commit in the same D1 transaction.
    const results = await db.batch(statements.map((statement) => prepare(db, statement)));
    if (results.at(-1)?.results.length) {
      await workspaceLive
        .publish(`workspace:${userId}`, { id: userId, revision: current.revision + 1 })
        .catch(() => undefined); // Focus/reconnect reconciliation recovers missed notifications.
      return {
        acknowledged: operations.map(({ id }) => id),
        document: next,
        revision: current.revision + 1,
      };
    }
  }
  throw new ApiError(409, 'Your collection changed on another device. Please retry.');
}
