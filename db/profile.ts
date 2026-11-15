import { env } from 'cloudflare:workers';
import { z } from 'zod';
import type { CollectionDocument } from '../src/app/model';
import { binderCoverImages, type BinderSummary } from '../src/profile';
import { readCollection } from './collection-store';

const database = () => (env.DB as D1Database).withSession('first-primary');
export async function readPublicBinder(
  token: string,
  binderId?: string,
): Promise<CollectionDocument | null> {
  if (!z.uuid().safeParse(token).success || (binderId && !z.uuid().safeParse(binderId).success)) {
    return null;
  }
  const db = database();
  const owner = binderId
    ? await db
        .prepare('select userId from collection_profile where token=?')
        .bind(token)
        .first<{ userId: string }>()
    : await db
        .prepare('select userId,id from binder where shareToken=? and deleted=0')
        .bind(token)
        .first<{ id: string; userId: string }>();
  if (!owner) {
    return null;
  }
  const { document } = await readCollection(db, owner.userId, {
    binderIds: [binderId ?? ('id' in owner ? (owner.id as string) : '')],
    ...(binderId ? { profileToken: token } : { shareToken: token }),
  });
  if (!document.binders.length) {
    return null;
  }
  return {
    binders: document.binders.map((binder) => ({ ...binder, shareToken: null })),
    ownership: document.ownership,
    version: 1,
  };
}

export async function readProfileSummary(token: string) {
  if (!z.uuid().safeParse(token).success) {
    return null;
  }
  // Aggregate only explicitly selected binders. No private pocket arrays or account document.
  const rows = await database()
    .prepare(`select cp.name profileName, b.id, b.name, b.color, b.coverSetId,
    count(p.position) total,
    coalesce(sum(o.status='owned'),0) owned, coalesce(sum(o.status='purchased'),0) purchased,
    coalesce(sum(o.status='wishlist'),0) wishlist,
    (select json_group_array(printingId) from (select printingId from binder_pocket
      where userId=b.userId and binderId=b.id
      group by substr(printingId,1,instr(printingId,':')-1)
      order by min(position) limit 3)) coverPrintings
    from collection_profile cp
    left join profile_binder pb on pb.userId=cp.userId
    left join binder b on b.userId=pb.userId and b.id=pb.binderId and b.deleted=0
    left join binder_pocket p on p.userId=b.userId and p.binderId=b.id
    left join card_ownership o on o.userId=p.userId and o.printingId=p.printingId
    where cp.token=? group by cp.userId,b.id order by pb.position`)
    .bind(token)
    .all<BinderSummary & { coverPrintings: string; profileName: string }>();
  if (!rows.results.length) {
    return null;
  }
  return {
    binders: rows.results
      .filter(({ id }) => id)
      .map(
        ({ color, coverPrintings, coverSetId, id, name, owned, purchased, total, wishlist }) => ({
          color: color ?? undefined,
          coverSetId,
          id,
          images: binderCoverImages(JSON.parse(coverPrintings) as Array<string>),
          name,
          owned,
          purchased,
          total,
          wishlist,
        }),
      ),
    name: rows.results[0].profileName,
  };
}
