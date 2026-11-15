import type { Grant } from '../src/api/policy';
import { cardStatus, type CollectionDocument, type PersonalBinder } from '../src/app/model';

export type Statement = { sql: string; values: Array<string | number | null> };
export type CollectionDatabase = Pick<D1Database, 'batch' | 'prepare'>;
export type ReadScope = {
  binderIds?: Array<string>;
  hydrateBinderIds?: Array<string>;
  loadedBinderIds?: Array<string>;
  ownershipIds?: Array<string>;
  profileToken?: string;
  shareToken?: string;
  since?: number;
};
type BinderRow = Omit<PersonalBinder, 'slots'> & {
  coverSetConfigured: number;
  deleted: number;
  position: number;
  slotCount: number;
};
type PocketRow = { binderId: string; position: number; printingId: string };
type OwnershipRow = { printingId: string; status: string };
type ProfileRow = { binderIds: string; name: string; token: string | null };
export function prepare(db: CollectionDatabase, statement: Statement) {
  return db.prepare(statement.sql).bind(...statement.values);
}
export async function readCollection(
  db: CollectionDatabase,
  userId: string,
  scope: ReadScope = {},
) {
  const { binderIds, ownershipIds = [], since = -1 } = scope;
  const selected = binderIds === undefined ? null : JSON.stringify(binderIds);
  const loaded = scope.loadedBinderIds === undefined ? null : JSON.stringify(scope.loadedBinderIds);
  const hydrate = JSON.stringify(scope.hydrateBinderIds ?? []);
  const changed = `(b.revision > ? or b.id in (select value from json_each(?)))`;
  const access = `(? is null or b.shareToken = ?) and (? is null or exists
    (select 1 from collection_profile cp inner join profile_binder pb on pb.userId = cp.userId
      where cp.userId = b.userId and cp.token = ? and pb.binderId = b.id))`;
  const accessValues = [
    scope.shareToken ?? null,
    scope.shareToken ?? null,
    scope.profileToken ?? null,
    scope.profileToken ?? null,
  ];
  const selection = `b.userId = ? and (? is null or b.id in (select value from json_each(?))) and ${access}`;
  const selectionValues = [userId, selected, selected, ...accessValues];
  // A read batch is a consistent snapshot, including authorization for public projections.
  const results = await db.batch([
    db
      .prepare(`select coalesce((select revision from workspace_revision where userId = ?), 0) revision,
      (select count(*) from binder where userId = ? and deleted = 0) binderCount,
      coalesce((select max(position) + 1 from binder where userId = ?), 0) nextPosition,
      (select json_group_array(id) from (select id from binder where userId=? and deleted=0 order by position)) binderOrder`)
      .bind(userId, userId, userId, userId),
    db
      .prepare(`select b.* from binder b where ${selection} and ${changed} order by b.position`)
      .bind(...selectionValues, since, hydrate),
    db
      .prepare(`select p.binderId, p.position, p.printingId from binder_pocket p
      inner join binder b on b.userId = p.userId and b.id = p.binderId
      where ${selection} and b.deleted = 0 and ${changed}
        and (? is null or b.id in (select value from json_each(?)))`)
      .bind(...selectionValues, since, hydrate, loaded, loaded),
    db
      .prepare(`select printingId, status from card_ownership where userId = ? and revision > ?
      and (? is null or printingId in (select value from json_each(?)) or printingId in
        (select p.printingId from binder_pocket p inner join binder b on b.userId=p.userId and b.id=p.binderId
          where ${selection} and b.deleted=0))`)
      .bind(userId, since, selected, JSON.stringify(ownershipIds), ...selectionValues),
    db
      .prepare(`select name, token, (select json_group_array(binderId) from
      (select binderId from profile_binder where userId = ? order by position)) binderIds
      from collection_profile where userId = ?`)
      .bind(userId, userId),
    ...(scope.loadedBinderIds === undefined
      ? []
      : [
          db
            .prepare(`select b.id, count(p.position) total,
      coalesce(sum(o.status='owned'),0) owned, coalesce(sum(o.status='purchased'),0) purchased,
      coalesce(sum(o.status='wishlist'),0) wishlist,
      (select printingId from binder_pocket where userId=b.userId and binderId=b.id order by position limit 1) firstPrinting,
      (select json_group_array(printingId) from (select printingId from binder_pocket
        where userId=b.userId and binderId=b.id
        group by substr(printingId,1,instr(printingId,':')-1)
        order by min(position) limit 3)) coverPrintings
      from binder b left join binder_pocket p on p.userId=b.userId and p.binderId=b.id
      left join card_ownership o on o.userId=p.userId and o.printingId=p.printingId
      where b.userId=? and b.deleted=0 group by b.id order by b.position`)
            .bind(userId),
        ]),
  ]);
  const meta = results[0].results[0] as {
    binderCount: number;
    binderOrder: string;
    nextPosition: number;
    revision: number;
  };
  const rows = results[1].results as unknown as Array<BinderRow>;
  const document: CollectionDocument = { binders: [], ownership: {}, version: 1 };
  const byId = new Map<string, PersonalBinder>();
  for (const row of rows) {
    if (row.deleted) {
      continue;
    }
    const binder: PersonalBinder = {
      columns: row.columns,
      doubleSided: !!row.doubleSided,
      id: row.id,
      name: row.name,
      rows: row.rows,
      shareToken: row.shareToken,
      slots:
        scope.loadedBinderIds === undefined || scope.loadedBinderIds.includes(row.id)
          ? Array(row.slotCount).fill(null)
          : [],
      ...(row.showAllCardsInColor == null
        ? {}
        : { showAllCardsInColor: !!row.showAllCardsInColor }),
      ...(row.color == null ? {} : { color: row.color }),
      ...(row.coverSetConfigured ? { coverSetId: row.coverSetId } : {}),
      ...(row.presetSetId == null ? {} : { presetSetId: row.presetSetId }),
      ...(row.pocketOpening == null ? {} : { pocketOpening: row.pocketOpening }),
    };
    byId.set(row.id, binder);
    document.binders.push(binder);
  }
  for (const row of results[2].results as unknown as Array<PocketRow>) {
    const binder = byId.get(row.binderId);
    if (binder && row.position < binder.slots.length) {
      binder.slots[row.position] = row.printingId;
    }
  }
  for (const row of results[3].results as unknown as Array<OwnershipRow>) {
    document.ownership[row.printingId] =
      row.status === 'owned'
        ? true
        : row.status === 'purchased' || row.status === 'wishlist'
          ? row.status
          : false;
  }
  const profile = results[4].results[0] as unknown as ProfileRow | undefined;
  if (profile) {
    document.profile = {
      binderIds: JSON.parse(profile.binderIds),
      name: profile.name,
      token: profile.token,
    };
  }
  return {
    ...meta,
    counts: (
      results[5]?.results as unknown as
        | Array<{
            coverPrintings: string;
            firstPrinting: string | null;
            id: string;
            owned: number;
            purchased: number;
            total: number;
            wishlist: number;
          }>
        | undefined
    )?.map(({ coverPrintings, ...count }) => ({
      ...count,
      coverPrintings: JSON.parse(coverPrintings) as Array<string>,
    })),
    deleted: rows.filter((row) => row.deleted).map(({ id }) => id),
    document,
    order: JSON.parse(meta.binderOrder) as Array<string>,
    positions: Object.fromEntries(rows.map(({ id, position }) => [id, position])),
  };
}

// JSON is only a bounded bulk-query parameter, never a persisted collection or binder.
// json_each avoids D1's 100 bound-parameter ceiling and keeps large imports in one atomic batch.
export function jsonChunks(rows: Array<unknown>) {
  const chunks: Array<string> = [];
  let chunk: Array<string> = [];
  let size = 2;
  const encoder = new TextEncoder();
  for (const row of rows) {
    const value = JSON.stringify(row);
    const bytes = encoder.encode(value).length + 1;
    if (size + bytes > 1_000_000 && chunk.length) {
      chunks.push(`[${chunk.join(',')}]`);
      chunk = [];
      size = 2;
    }
    chunk.push(value);
    size += bytes;
  }
  if (chunk.length) {
    chunks.push(`[${chunk.join(',')}]`);
  }
  return chunks;
}

type Snapshot = Awaited<ReturnType<typeof readCollection>>;
export function collectionWriteStatements(
  userId: string,
  current: Snapshot,
  next: CollectionDocument,
  grant?: Grant,
): Array<Statement> {
  const revision = current.revision + 1;
  const guard = `exists (select 1 from workspace_revision where userId = ? and revision = ?)
    ${grant ? `and exists (select 1 from agent_key_policy where id = ? and userId = ? and revokedAt is null and expiresAt > unixepoch('subsec') * 1000)` : ''}`;
  const guards: Statement['values'] = [
    userId,
    current.revision,
    ...(grant ? [grant.id, userId] : []),
  ];
  const statements: Array<Statement> = [];
  const bulk = (rows: Array<unknown>, sql: string) => {
    for (const json of jsonChunks(rows)) {
      statements.push({ sql: sql.replaceAll('$guard', guard), values: [json, ...guards] });
    }
  };
  const previous = new Map(current.document.binders.map((b) => [b.id, b]));
  const after = new Map(next.binders.map((b) => [b.id, b]));
  const deleted = current.document.binders
    .filter((b) => !after.has(b.id))
    .map((b) => [userId, b.id, revision]);
  bulk(
    deleted,
    `update binder set deleted = 1, shareToken = null, name = '', color = null, coverSetId = null, coverSetConfigured = 0, pocketOpening = null, showAllCardsInColor = null, presetSetId = null, slotCount = 0, revision = json_extract(j.value, '$[2]')
    from json_each(?) j where binder.userId = json_extract(j.value, '$[0]') and binder.id = json_extract(j.value, '$[1]') and $guard`,
  );
  bulk(
    deleted,
    `delete from binder_pocket where (userId, binderId) in
    (select json_extract(value, '$[0]'), json_extract(value, '$[1]') from json_each(?)) and $guard`,
  );
  const metadata: Array<unknown> = [],
    pockets: Array<unknown> = [],
    cleared: Array<unknown> = [];
  let position = current.nextPosition;
  let lastPosition = -1;
  for (const binder of next.binders) {
    const old = previous.get(binder.id);
    const assignedPosition =
      old && current.positions[binder.id] > lastPosition
        ? current.positions[binder.id]
        : position++;
    lastPosition = assignedPosition;
    if (
      JSON.stringify(old) === JSON.stringify(binder) &&
      assignedPosition === current.positions[binder.id]
    ) {
      continue;
    }
    metadata.push([
      userId,
      binder.id,
      assignedPosition,
      binder.name,
      binder.columns,
      binder.rows,
      Number(binder.doubleSided),
      binder.color ?? null,
      binder.coverSetId ?? null,
      Number(binder.coverSetId !== undefined),
      binder.pocketOpening ?? null,
      binder.presetSetId ?? null,
      binder.shareToken,
      binder.slots.length,
      revision,
      binder.showAllCardsInColor === undefined ? null : Number(binder.showAllCardsInColor),
    ]);
    for (let i = 0; i < Math.max(binder.slots.length, old?.slots.length ?? 0); i++) {
      const printing = binder.slots[i] ?? null;
      if (printing !== (old?.slots[i] ?? null)) {
        (printing ? pockets : cleared).push([userId, binder.id, i, printing]);
      }
    }
  }
  bulk(
    metadata,
    `insert into binder (userId, id, position, name, columns, rows, doubleSided, color,
    coverSetId, coverSetConfigured, pocketOpening, presetSetId, shareToken, slotCount, revision, showAllCardsInColor, deleted)
    select ${Array.from({ length: 16 }, (_, i) => `json_extract(value, '$[${i}]')`).join(',')}, 0 from json_each(?) where $guard
    on conflict(userId, id) do update set position=excluded.position, name=excluded.name, columns=excluded.columns,
    rows=excluded.rows, doubleSided=excluded.doubleSided, color=excluded.color, coverSetId=excluded.coverSetId,
    coverSetConfigured=excluded.coverSetConfigured, pocketOpening=excluded.pocketOpening,
    showAllCardsInColor=excluded.showAllCardsInColor,
    presetSetId=excluded.presetSetId, shareToken=excluded.shareToken, slotCount=excluded.slotCount, revision=excluded.revision, deleted=0`,
  );
  bulk(
    cleared,
    `delete from binder_pocket where (userId, binderId, position) in
    (select json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') from json_each(?)) and $guard`,
  );
  bulk(
    pockets,
    `insert into binder_pocket (userId,binderId,position,printingId)
    select json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]') from json_each(?) where $guard
    on conflict(userId,binderId,position) do update set printingId=excluded.printingId`,
  );
  bulk(
    Object.entries(next.ownership)
      .filter(([id, status]) => current.document.ownership[id] !== status)
      .map(([id, status]) => [userId, id, cardStatus(status), revision]),
    `insert into card_ownership (userId,printingId,status,revision)
    select json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]') from json_each(?) where $guard
    on conflict(userId,printingId) do update set status=excluded.status, revision=excluded.revision`,
  );
  if (next.profile && JSON.stringify(current.document.profile) !== JSON.stringify(next.profile)) {
    const profile = next.profile;
    bulk(
      [[userId, profile.name, profile.token, revision]],
      `insert into collection_profile (userId,name,token,revision)
      select json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]') from json_each(?) where $guard
      on conflict(userId) do update set name=excluded.name,token=excluded.token,revision=excluded.revision`,
    );
    statements.push({
      sql: `delete from profile_binder where userId = ? and ${guard}`,
      values: [userId, ...guards],
    });
    bulk(
      profile.binderIds.map((id, i) => [userId, id, i]),
      `insert into profile_binder (userId,binderId,position)
      select json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]') from json_each(?) where $guard`,
    );
  }
  return statements;
}
