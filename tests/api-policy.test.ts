import { describe, expect, it } from 'vitest';
import {
  authorizeCommands,
  collectionChanges,
  projectCollection,
  type Grant,
} from '../src/api/policy';
import { applyCommand, emptyDocument, makeBinder } from '../src/app/model';

const grant: Grant = {
  binderIds: [],
  id: 'test-key',
  name: 'Test',
  scopes: ['collection:read', 'binders:write'],
  userId: 'owner',
};
describe('agent capabilities', () => {
  it('previews shelf moves by position and requires collection-wide binder access', () => {
    const [one, two, three] = ['One', 'Two', 'Three'].map((name) => makeBinder(name));
    const doc = { ...emptyDocument(), binders: [one, two, three] };
    const move = { beforeId: two.id, binderId: three.id, type: 'shelf.move' } as const;
    const next = authorizeCommands(doc, [move], grant);
    expect(next.binders).toEqual([one, three, two]);
    expect(applyCommand(next, move)).toEqual(next);
    expect(applyCommand(next, { ...move, beforeId: crypto.randomUUID() })).toEqual(next);
    expect(collectionChanges(doc, next).binders).toEqual([
      { action: 'updated', afterPosition: 2, beforePosition: 1, id: two.id, name: 'Two' },
      { action: 'updated', afterPosition: 1, beforePosition: 2, id: three.id, name: 'Three' },
    ]);
    expect(() => authorizeCommands(doc, [move], { ...grant, binderIds: [three.id] })).toThrow(
      'cannot reorder',
    );
  });
  it('prevents ownership and sharing through otherwise allowed binder commands', () => {
    const binder = makeBinder('Test');
    const doc = applyCommand(emptyDocument(), { binder, type: 'binder.create' });
    expect(() =>
      authorizeCommands(
        doc,
        [
          {
            binderId: binder.id,
            position: 0,
            printing: '13:first',
            status: 'owned',
            type: 'binder.slot',
          },
        ],
        grant,
      ),
    ).toThrow('ownership:write');
    expect(() =>
      authorizeCommands(
        doc,
        [
          {
            binder: { ...makeBinder('Shared'), shareToken: crypto.randomUUID() },
            type: 'binder.create',
          },
        ],
        grant,
      ),
    ).toThrow('sharing:write');
    expect(() =>
      authorizeCommands(doc, [{ binderId: binder.id, type: 'binder.delete' }], grant),
    ).toThrow('binders:delete');
    expect(doc.ownership).toEqual({});
  });
  it('restricts status changes to currently placed printings and rejects an entire invalid batch', () => {
    const binder = makeBinder('Allowed');
    binder.slots[0] = '13:first';
    const doc = applyCommand(emptyDocument(), { binder, type: 'binder.create' });
    const restricted: Grant = {
      ...grant,
      binderIds: [binder.id],
      scopes: [...grant.scopes, 'ownership:write'],
    };
    expect(() =>
      authorizeCommands(
        doc,
        [
          { printing: '13:first', status: 'purchased', type: 'ownership.status' },
          { printing: '94:first', status: 'owned', type: 'ownership.status' },
        ],
        restricted,
      ),
    ).toThrow('outside');
    expect(doc.ownership).toEqual({});
    expect(() =>
      authorizeCommands(doc, [{ binder: makeBinder('Other'), type: 'binder.create' }], restricted),
    ).toThrow('cannot create');
    const after = authorizeCommands(
      doc,
      [
        { binderId: binder.id, position: 1, printing: '94:first', type: 'binder.slot' },
        { printing: '94:first', status: 'purchased', type: 'ownership.status' },
      ],
      restricted,
    );
    expect(after.ownership['94:first']).toBe('purchased');
  });
  it('requires binder write access and enforces binder restrictions for page removal', () => {
    const binder = makeBinder('Fossil', 'base3');
    const doc = { ...emptyDocument(), binders: [binder] };
    const commands = [
      { binderId: binder.id, expected: binder, page: 0, type: 'binder.page.remove' as const },
    ];
    expect(() =>
      authorizeCommands(doc, commands, { ...grant, scopes: ['collection:read'] }),
    ).toThrow('binders:write');
    expect(() =>
      authorizeCommands(doc, commands, { ...grant, binderIds: [crypto.randomUUID()] }),
    ).toThrow('outside');
    expect(
      authorizeCommands(doc, commands, { ...grant, binderIds: [binder.id] }).binders[0].slots,
    ).toEqual(binder.slots.slice(9));
  });
  it('does not disclose unrelated binders or unplaced ownership', () => {
    const binder = makeBinder('Allowed');
    binder.slots[0] = '13:first';
    const privateBinder = makeBinder('Private');
    const projection = projectCollection(
      {
        binders: [binder, privateBinder],
        ownership: { '13:first': 'purchased', '94:first': true },
        version: 1,
      },
      { ...grant, binderIds: [binder.id] },
    );
    expect(projection.binders).toEqual([binder]);
    expect(projection.ownership).toEqual({ '13:first': 'purchased' });
  });
});
