/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import {
  collectionWriteStatements,
  prepare,
  readCollection,
  type CollectionDatabase,
  type Statement,
} from '../db/collection-store';
import { applyCommand, emptyDocument, makeBinder } from '../src/app/model';
import { mergeWorkspace, WorkspaceRevisionMismatch } from '../src/app/workspace-sync';

const sqlPrepare = (sql: string) => ({
  bind: (...values: Array<string | number | null>) => ({ sql, values }),
});

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../db/migrations/', import.meta.url))
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8'));
  }
  for (const id of ['a', 'b']) {
    sqlite
      .prepare(
        'insert into user (id,name,email,emailVerified,createdAt,updatedAt) values (?,?,?,0,0,0)',
      )
      .run(id, id, `${id}@example.com`);
    sqlite.prepare('insert into workspace_revision (userId,revision) values (?,0)').run(id);
  }
  const db = {
    batch: (statements: Array<Statement>) => {
      sqlite.exec('begin');
      try {
        const results = statements.map(({ sql, values }) => ({
          results: sqlite.prepare(sql).all(...values),
          success: true,
        }));
        sqlite.exec('commit');
        return Promise.resolve(results);
      } catch (error) {
        sqlite.exec('rollback');
        throw error;
      }
    },
    prepare: sqlPrepare,
  } as unknown as CollectionDatabase;
  const commit = async (
    userId: string,
    before: Awaited<ReturnType<typeof readCollection>>,
    next: typeof before.document,
  ) => {
    const statements = collectionWriteStatements(userId, before, next);
    statements.push({
      sql: 'update workspace_revision set revision=revision+1 where userId=? and revision=? returning revision',
      values: [userId, before.revision],
    });
    return db.batch(statements.map((s) => prepare(db, s)));
  };
  return { close: () => sqlite.close(), commit, db, sqlite };
}

describe('relational collection storage', () => {
  it('round trips full-color presentation through saved, shared, and incremental reads without changing ownership', async () => {
    const f = fixture();
    try {
      const binder = makeBinder('Pretty Cards');
      delete binder.showAllCardsInColor;
      binder.shareToken = crypto.randomUUID();
      binder.slots[0] = 'base1-1:unlimited';
      const initial = await readCollection(f.db, 'a');
      await f.commit('a', initial, {
        ...emptyDocument(),
        binders: [binder],
        ownership: { 'base1-1:unlimited': false },
      });
      let saved = await readCollection(f.db, 'a');
      expect(saved.document.binders[0].showAllCardsInColor).toBeUndefined();
      for (const enabled of [true, false]) {
        const next = applyCommand(saved.document, {
          binderId: binder.id,
          columns: 3,
          doubleSided: false,
          name: binder.name,
          rows: 3,
          showAllCardsInColor: enabled,
          type: 'binder.settings',
        });
        await f.commit('a', saved, next);
        const delta = await readCollection(f.db, 'a', { since: saved.revision });
        expect(delta.document.binders[0].showAllCardsInColor).toBe(enabled);
        const shared = await readCollection(f.db, 'a', { shareToken: binder.shareToken });
        expect(shared.document).toEqual(next);
        saved = await readCollection(f.db, 'a');
        expect(saved.document).toEqual(next);
        expect(saved.document.ownership).toEqual({ 'base1-1:unlimited': false });
      }
    } finally {
      f.close();
    }
  });

  it('stores only occupied pockets, preserves trailing empty pages, and isolates same binder IDs across accounts', async () => {
    const f = fixture();
    try {
      const binder = makeBinder('Private');
      binder.slots = ['base1-1:unlimited', ...Array(17).fill(null)];
      for (const owner of ['a', 'b']) {
        const current = await readCollection(f.db, owner);
        await f.commit(owner, current, {
          binders: [binder],
          ownership: { 'base1-1:unlimited': owner === 'a' },
          version: 1,
        });
      }
      expect(f.sqlite.prepare('select count(*) n from binder_pocket').get()?.n).toBe(2);
      const a = await readCollection(f.db, 'a'),
        b = await readCollection(f.db, 'b');
      expect(a.document.binders[0]).toEqual(binder);
      expect(a.document.ownership['base1-1:unlimited']).toBe(true);
      expect(b.document.ownership['base1-1:unlimited']).toBe(false);
      expect(() =>
        f.sqlite
          .prepare('insert into binder_pocket values (?,?,?,?)')
          .run('a', 'not-a-binder', 0, 'base1-1:unlimited'),
      ).toThrow();
    } finally {
      f.close();
    }
  });
  it('writes only changed rows, produces deltas, and rejects stale batches atomically', async () => {
    const f = fixture();
    try {
      const one = makeBinder('One'),
        two = makeBinder('Two');
      one.slots[0] = two.slots[0] = 'base1-1:unlimited';
      await f.commit('a', await readCollection(f.db, 'a'), {
        binders: [one, two],
        ownership: {},
        version: 1,
      });
      const current = await readCollection(f.db, 'a');
      const next = applyCommand(current.document, {
        printing: 'base1-1:unlimited',
        status: 'purchased',
        type: 'ownership.status',
      });
      const statements = collectionWriteStatements('a', current, next);
      expect(statements).toHaveLength(1);
      expect(statements[0].sql).toContain('insert into card_ownership');
      await f.commit('a', current, next);
      await f.commit(
        'a',
        current,
        applyCommand(current.document, { binderId: one.id, type: 'binder.delete' }),
      );
      expect((await readCollection(f.db, 'a')).document.binders).toHaveLength(2);
      const delta = await readCollection(f.db, 'a', { since: 1 });
      expect(delta.document.binders).toEqual([]);
      expect(delta.document.ownership).toEqual({ 'base1-1:unlimited': 'purchased' });
      const scoped = await readCollection(f.db, 'a', { binderIds: [one.id] });
      expect(scoped.document.binders.map((b) => b.id)).toEqual([one.id]);
    } finally {
      f.close();
    }
  });
  it('moves and removes pockets without duplicating cards; deletion removes profile selections and revokes sharing', async () => {
    const f = fixture();
    try {
      const binder = makeBinder('Shared');
      binder.shareToken = crypto.randomUUID();
      binder.slots = ['base1-1:unlimited', 'base1-2:unlimited', ...Array(16).fill(null)];
      const profile = { binderIds: [binder.id], name: 'Public', token: crypto.randomUUID() };
      await f.commit('a', await readCollection(f.db, 'a'), {
        binders: [binder],
        ownership: {},
        profile,
        version: 1,
      });
      let current = await readCollection(f.db, 'a');
      await f.commit(
        'a',
        current,
        applyCommand(current.document, {
          binderId: binder.id,
          from: 0,
          to: 1,
          type: 'binder.move',
        }),
      );
      current = await readCollection(f.db, 'a');
      expect(current.document.binders[0].slots.slice(0, 2)).toEqual([
        'base1-2:unlimited',
        'base1-1:unlimited',
      ]);
      const publicView = await readCollection(f.db, 'a', {
        binderIds: [binder.id],
        profileToken: profile.token,
      });
      expect(publicView.document.binders).toHaveLength(1);
      expect(
        (
          await readCollection(f.db, 'a', {
            binderIds: [binder.id],
            shareToken: crypto.randomUUID(),
          })
        ).document.binders,
      ).toHaveLength(0);
      await f.commit(
        'a',
        current,
        applyCommand(current.document, { binderId: binder.id, type: 'binder.delete' }),
      );
      const changed = await readCollection(f.db, 'a', { since: 2 });
      expect(changed.deleted).toEqual([binder.id]);
      expect(changed.document.profile?.binderIds).toEqual([]);
      expect(f.sqlite.prepare('select count(*) n from binder_pocket').get()?.n).toBe(0);
      expect(f.sqlite.prepare('select shareToken from binder').get()?.shareToken).toBe(null);
    } finally {
      f.close();
    }
  });
  it('loads shelf counts without pocket arrays, then hydrates just the opened binder', async () => {
    const f = fixture();
    try {
      const first = makeBinder('First'),
        second = makeBinder('Second');
      first.slots[0] = 'base1-1:unlimited';
      second.slots[0] = 'base1-2:unlimited';
      await f.commit('a', await readCollection(f.db, 'a'), {
        binders: [first, second],
        ownership: { 'base1-1:unlimited': true },
        version: 1,
      });
      const shelf = await readCollection(f.db, 'a', { loadedBinderIds: [] });
      expect(shelf.document.binders.map((b) => b.slots)).toEqual([[], []]);
      expect(shelf.counts?.map(({ coverPrintings }) => coverPrintings)).toEqual([
        ['base1-1:unlimited'],
        ['base1-2:unlimited'],
      ]);
      expect(shelf.counts?.map(({ owned, total }) => ({ owned, total }))).toEqual([
        { owned: 1, total: 1 },
        { owned: 0, total: 1 },
      ]);
      const opened = await readCollection(f.db, 'a', {
        hydrateBinderIds: [first.id],
        loadedBinderIds: [first.id],
        since: shelf.revision,
      });
      expect(opened.document.binders).toEqual([first]);
      expect(opened.document.ownership).toEqual({});
      const reconciled = mergeWorkspace(shelf.document, shelf.revision, {
        delta: { binders: opened.document.binders, deleted: [], ownership: {}, profile: null },
        fromRevision: shelf.revision,
        revision: opened.revision,
      });
      expect(reconciled.binders[0]).toEqual(first);
      expect(reconciled.binders[1].slots).toEqual([]);
      expect(reconciled.ownership).toEqual({ 'base1-1:unlimited': true });
    } finally {
      f.close();
    }
  });
  it('rolls back the entire batch if a constraint fails', async () => {
    const f = fixture();
    try {
      const first = makeBinder('One'),
        second = makeBinder('Two');
      first.shareToken = second.shareToken = crypto.randomUUID();
      await expect(async () =>
        f.commit('a', await readCollection(f.db, 'a'), {
          binders: [first, second],
          ownership: {},
          version: 1,
        }),
      ).rejects.toThrow();
      const current = await readCollection(f.db, 'a');
      expect(current.document).toEqual(emptyDocument());
      expect(current.revision).toBe(0);
    } finally {
      f.close();
    }
  });
  it('reconciles deletion and re-import of the same binder ID in its new shelf position', async () => {
    const f = fixture();
    try {
      const first = makeBinder('First'),
        second = makeBinder('Second');
      await f.commit('a', await readCollection(f.db, 'a'), {
        binders: [first, second],
        ownership: {},
        version: 1,
      });
      const before = await readCollection(f.db, 'a');
      await f.commit(
        'a',
        before,
        applyCommand(before.document, { binderId: first.id, type: 'binder.delete' }),
      );
      const removed = await readCollection(f.db, 'a');
      await f.commit(
        'a',
        removed,
        applyCommand(removed.document, { binder: first, type: 'binder.create' }),
      );
      const delta = await readCollection(f.db, 'a', { since: before.revision });
      const merged = mergeWorkspace(before.document, before.revision, {
        delta: {
          binders: delta.document.binders,
          deleted: delta.deleted,
          ownership: delta.document.ownership,
          profile: null,
        },
        fromRevision: before.revision,
        order: delta.order,
        revision: delta.revision,
      });
      expect(merged.binders.map(({ id }) => id)).toEqual([second.id, first.id]);
      const current = await readCollection(f.db, 'a');
      const reordered = applyCommand(
        applyCommand(current.document, { binderId: second.id, type: 'binder.delete' }),
        { binder: second, type: 'binder.create' },
      );
      await f.commit('a', current, reordered);
      expect((await readCollection(f.db, 'a')).document.binders.map(({ id }) => id)).toEqual([
        first.id,
        second.id,
      ]);
    } finally {
      f.close();
    }
  });
  it('stores a collection beyond D1’s old 2 MB row ceiling in bounded relational writes', async () => {
    const f = fixture();
    try {
      const binders = Array.from({ length: 100 }, (_, i) => ({
        ...makeBinder(`Binder ${i}`),
        slots: Array(2000).fill('base1-1:unlimited'),
      }));
      const document = { binders, ownership: {}, version: 1 as const };
      expect(JSON.stringify(document).length).toBeGreaterThan(2_000_000);
      const before = await readCollection(f.db, 'a');
      const statements = collectionWriteStatements('a', before, document);
      expect(statements.length).toBeLessThan(50);
      for (const statement of statements) {
        expect(statement.values.length).toBeLessThan(100);
        expect(statement.sql.length).toBeLessThan(100_000);
        for (const value of statement.values) {
          if (typeof value === 'string') {
            expect(new TextEncoder().encode(value).length).toBeLessThan(1_000_001);
          }
        }
      }
      await f.commit('a', before, document);
      expect((await readCollection(f.db, 'a')).document).toEqual(document);
    } finally {
      f.close();
    }
  });
});

describe('incremental client reconciliation', () => {
  it('merges against server state before replaying unsent edits and rejects gaps', () => {
    const binder = makeBinder('One');
    const server = { binders: [binder], ownership: {}, version: 1 as const };
    const change = {
      delta: {
        binders: [],
        deleted: [],
        ownership: { 'base1-1:unlimited': 'purchased' as const },
        profile: null,
      },
      fromRevision: 1,
      revision: 2,
    };
    const merged = mergeWorkspace(server, 1, change);
    const optimistic = applyCommand(merged, {
      owned: true,
      printing: 'base1-1:unlimited',
      type: 'ownership.set',
    });
    expect(merged.ownership['base1-1:unlimited']).toBe('purchased');
    expect(optimistic.ownership['base1-1:unlimited']).toBe(true);
    expect(merged.binders[0]).toEqual(binder);
    expect(() => mergeWorkspace(server, 0, change)).toThrow(WorkspaceRevisionMismatch);
  });
});
