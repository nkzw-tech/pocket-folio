import { describe, expect, it } from 'vitest';
import { authorizeCommands, type Grant } from '../src/api/policy';
import {
  applyCommand,
  commandSchema,
  documentSchema,
  emptyDocument,
  makeBinder,
  type CollectionDocument,
  type Command,
} from '../src/app/model';

const merge = (current: CollectionDocument, document: CollectionDocument) =>
  applyCommand(current, { document, type: 'collection.import' });
describe('collection portability', () => {
  it('round-trips the export shape, including gaps, editions, covers and unplaced statuses, without restoring shares', () => {
    const binder = makeBinder(
      'My Fossil',
      'base3',
      {},
      {
        color: '#705091',
        columns: 4,
        coverSetId: 'base3',
        doubleSided: true,
        pocketOpening: 'side',
        rows: 3,
      },
    );
    binder.shareToken = crypto.randomUUID();
    binder.slots = ['base3-1:first', null, 'base3-1:unlimited', 'base3-1:first'];
    const exported: CollectionDocument = {
      ...emptyDocument(),
      binders: [binder],
      ownership: {
        'base1-1:first': false,
        'base3-1:first': true,
        'base3-1:unlimited': 'purchased',
      },
    };
    const serialized = JSON.stringify(exported);
    const imported = merge(emptyDocument(), documentSchema.parse(JSON.parse(serialized)));
    expect(imported).toEqual({ ...exported, binders: [{ ...binder, shareToken: null }] });
    expect(exported.binders[0].shareToken).not.toBeNull();
    expect(merge(imported, exported)).toEqual(imported);
  });
  it('merges monotonically and keeps existing binders and sharing intact', () => {
    const binder = makeBinder('Current');
    binder.shareToken = crypto.randomUUID();
    const current: CollectionDocument = {
      ...emptyDocument(),
      binders: [binder],
      ownership: { 'base1-1:first': true, 'base1-2:first': 'purchased', 'base1-3:first': false },
    };
    const incoming: CollectionDocument = {
      ...emptyDocument(),
      binders: [{ ...binder, name: 'Old backup', slots: ['base1-1:first'] }, makeBinder('New')],
      ownership: {
        'base1-1:first': 'purchased',
        'base1-2:first': false,
        'base1-3:first': 'purchased',
        'base1-4:first': true,
      },
    };
    const result = merge(current, incoming);
    expect(result.binders[0]).toEqual(binder);
    expect(result.binders).toHaveLength(2);
    expect(result.ownership).toEqual({
      'base1-1:first': true,
      'base1-2:first': 'purchased',
      'base1-3:first': 'purchased',
      'base1-4:first': true,
    });
    expect(current.ownership['base1-3:first']).toBe(false);
    expect(current.binders).toHaveLength(1);
    expect(merge(result, incoming)).toEqual(result);
  });
  it('rejects incompatible files and combined binder limits without partially mutating data', () => {
    const binder = makeBinder('Test');
    for (const document of [
      { ...emptyDocument(), version: 2 },
      { ...emptyDocument(), binders: [binder, binder] },
      { ...emptyDocument(), ownership: { 'unknown:first': true } },
      { ...emptyDocument(), ownership: { 'base1-1:first': 'maybe' } },
      { ...emptyDocument(), binders: [{ ...binder, columns: 9 }] },
    ]) {
      expect(commandSchema.safeParse({ document, type: 'collection.import' }).success).toBe(false);
    }
    const current = {
      ...emptyDocument(),
      binders: Array.from({ length: 100 }, () => makeBinder('Existing')),
    };
    expect(() =>
      merge(current, {
        ...emptyDocument(),
        binders: [binder],
        ownership: { 'base1-1:first': true },
      }),
    ).toThrow('100 binders');
    expect(current.binders).toHaveLength(100);
    expect(current.ownership).toEqual({});
  });
  it('requires account-wide binder and ownership scopes for agent imports', () => {
    const binder = makeBinder('Imported');
    binder.shareToken = crypto.randomUUID();
    const commands: Array<Command> = [
      {
        document: { ...emptyDocument(), binders: [binder], ownership: { 'base1-1:first': true } },
        type: 'collection.import',
      },
    ];
    const grant: Grant = {
      binderIds: [],
      id: 'key',
      name: 'Test',
      scopes: ['collection:read', 'binders:write', 'ownership:write'],
      userId: 'user',
    };
    for (const scopes of [
      ['collection:read', 'ownership:write'],
      ['collection:read', 'binders:write'],
    ] as const) {
      expect(() =>
        authorizeCommands(emptyDocument(), commands, { ...grant, scopes: [...scopes] }),
      ).toThrow('requires');
    }
    expect(() =>
      authorizeCommands(emptyDocument(), commands, { ...grant, binderIds: [binder.id] }),
    ).toThrow('restricted');
    const imported = authorizeCommands(emptyDocument(), commands, grant);
    expect(imported.binders[0].shareToken).toBeNull();
    expect(imported.ownership['base1-1:first']).toBe(true);
  });
});
