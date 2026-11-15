import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  binderPreset,
  cardStatus,
  commandSchema,
  documentSchema,
  emptyDocument,
  makeBinder,
  publicDocument,
} from '../src/app/model';
import { binderCollections } from '../src/binder-catalog';
import { binderPages, cardSpread, spreadCount } from '../src/binder-pages';

describe('collection semantics', () => {
  it('keeps purchased distinct from owned and supports receiving or cancelling a purchase', () => {
    let doc = emptyDocument();
    const printing = 'base5-83:first';
    doc = applyCommand(doc, { printing, status: 'purchased', type: 'ownership.status' });
    expect(doc.ownership[printing]).toBe('purchased');
    expect(cardStatus(doc.ownership[printing])).toBe('purchased');
    const backup = JSON.stringify(doc);
    expect(documentSchema.parse(JSON.parse(backup))).toEqual(doc);
    doc = applyCommand(doc, { owned: true, printing, type: 'ownership.set' });
    expect(cardStatus(doc.ownership[printing])).toBe('owned');
    doc = applyCommand(doc, { printing, status: 'missing', type: 'ownership.status' });
    expect(cardStatus(doc.ownership[printing])).toBe('missing');
    expect(cardStatus(undefined)).toBe('missing');
  });
  it('presets use purchased editions, prefer owned editions, and bulk receiving clears purchased', () => {
    const printing = 'base3-1:first';
    const doc = applyCommand(emptyDocument(), {
      printing,
      status: 'purchased',
      type: 'ownership.status',
    });
    expect(makeBinder('Fossil', 'base3', doc.ownership).slots[0]).toBe(printing);
    expect(
      makeBinder('Fossil', 'base3', { ...doc.ownership, 'base3-1:unlimited': true }).slots[0],
    ).toBe('base3-1:unlimited');
    expect(
      applyCommand(doc, { owned: true, printings: [printing], type: 'ownership.bulk' }).ownership[
        printing
      ],
    ).toBe(true);
  });
  it('shared views retain purchased without exposing unrelated purchases', () => {
    const binder = makeBinder('Shared');
    binder.slots[0] = 'base1-1:first';
    binder.shareToken = crypto.randomUUID();
    let doc = applyCommand(emptyDocument(), { binder, type: 'binder.create' });
    for (const printing of ['base1-1:first', 'base5-83:first']) {
      doc = applyCommand(doc, { printing, status: 'purchased', type: 'ownership.status' });
    }
    expect(publicDocument(doc, binder.shareToken)?.ownership).toEqual({
      'base1-1:first': 'purchased',
    });
  });
  it('preserves order and intentional gaps through layout changes', () => {
    const binder = makeBinder('Favorites');
    binder.slots = ['base1-1:unlimited', null, '1:first'];
    let doc = applyCommand(emptyDocument(), { binder, type: 'binder.create' });
    doc = applyCommand(doc, {
      binderId: binder.id,
      columns: 4,
      doubleSided: true,
      name: 'Favorites',
      rows: 3,
      type: 'binder.settings',
    });
    expect(doc.binders[0].slots).toEqual(binder.slots);
    expect(doc.ownership).toEqual({});
  });
  it('inserting, moving and removing cards does not conflate placement and ownership', () => {
    const binder = makeBinder('Favorites');
    let doc = applyCommand(emptyDocument(), { binder, type: 'binder.create' });
    doc = applyCommand(doc, {
      binderId: binder.id,
      owned: true,
      position: 0,
      printing: 'base1-1:first',
      type: 'binder.slot',
    });
    doc = applyCommand(doc, {
      binderId: binder.id,
      position: 2,
      printing: 'base1-1:first',
      type: 'binder.slot',
    });
    doc = applyCommand(doc, { binderId: binder.id, from: 0, to: 12, type: 'binder.move' });
    expect(doc.binders[0].slots[0]).toBeNull();
    expect(doc.binders[0].slots[12]).toBe('base1-1:first');
    doc = applyCommand(doc, { binderId: binder.id, type: 'binder.delete' });
    expect(doc.binders).toHaveLength(0);
    expect(doc.ownership['base1-1:first']).toBe(true);
  });
  it('keeps editions separate and presets use existing owned printings', () => {
    const owned = { 'base3-1:first': true, 'base3-5:unlimited': false };
    const binder = makeBinder('Fossil', 'base3', owned);
    expect(binder.slots[0]).toBe('base3-1:first');
    expect(binder.slots[4]).toBe('base3-5:unlimited');
    expect(binder.slots).toHaveLength(62);
  });
  it('shared output contains one binder and only its ownership', () => {
    const visible = makeBinder('Shared');
    visible.shareToken = crypto.randomUUID();
    visible.slots[0] = 'base1-1:first';
    const privateBinder = makeBinder('Private');
    const doc = {
      ...emptyDocument(),
      binders: [visible, privateBinder],
      ownership: { 'base1-1:first': true, 'base5-83:first': true },
    };
    expect(publicDocument(doc, visible.shareToken)?.binders).toEqual([visible]);
    expect(publicDocument(doc, visible.shareToken)?.ownership).toEqual({ 'base1-1:first': true });
    expect(publicDocument(doc, crypto.randomUUID())).toBeNull();
  });
  it('rejects unknown printings, duplicate binder IDs and oversized layouts', () => {
    const binder = makeBinder('One');
    expect(
      documentSchema.safeParse({ ...emptyDocument(), binders: [binder, binder] }).success,
    ).toBe(false);
    expect(
      documentSchema.safeParse({ ...emptyDocument(), ownership: { 'fake:first': true } }).success,
    ).toBe(false);
    expect(
      documentSchema.safeParse({
        ...emptyDocument(),
        ownership: { 'base1-1:first:extra': true },
      }).success,
    ).toBe(false);
    expect(
      documentSchema.safeParse({ ...emptyDocument(), binders: [{ ...binder, columns: 50 }] })
        .success,
    ).toBe(false);
  });
});

describe('configurable pages', () => {
  it('pairs each side with the mirrored opposite face, including an unfilled final back', () => {
    for (const [columns, rows] of [
      [2, 2],
      [3, 3],
      [4, 3],
      [4, 4],
    ]) {
      const size = columns * rows;
      const cards = binderCollections[0].cards.slice(0, size * 3);
      const mirror = (face: typeof cards) =>
        Array.from(
          { length: size },
          (_, index) =>
            face[Math.floor(index / columns) * columns + columns - 1 - (index % columns)],
        );
      const opening = binderPages(cards, 0, true, columns, rows);
      expect(opening.right.reverseCards).toEqual(mirror(cards.slice(size, size * 2)));
      const second = binderPages(cards, 1, true, columns, rows);
      expect(second.left.reverseCards).toEqual(mirror(cards.slice(0, size)));
      expect(spreadCount(cards.length, true, size)).toBe(3);
      const last = binderPages(cards, 2, true, columns, rows);
      expect(last.left.cards).toEqual([]);
      expect(last.left.reverseCards).toEqual(mirror(cards.slice(size * 2)));
      expect(last.right.kind).toBe('cover');
    }
  });
  for (const [columns, rows] of [
    [2, 2],
    [3, 3],
    [4, 3],
    [4, 4],
  ]) {
    for (const doubleSided of [false, true]) {
      it(`${columns}×${rows}, double-sided ${doubleSided}: every position stays reachable, including gaps`, () => {
        const cards = binderCollections[0].cards.slice(0, 31);
        const slots = cards.map((card, i) => (i === 3 ? undefined : card));
        const pages = Array.from(
          { length: spreadCount(slots.length, doubleSided, columns * rows) },
          (_, spread) => binderPages(slots, spread, doubleSided, columns, rows),
        );
        expect(pages.flatMap(({ left, right }) => [...left.cards, ...right.cards])).toEqual(slots);
        for (let index = 0; index < slots.length; index++) {
          const page = pages[cardSpread(index, doubleSided, columns * rows)];
          expect([...page.left.cards, ...page.right.cards]).toContain(slots[index]);
        }
      });
    }
  }
});

describe('page removal', () => {
  for (const [columns, rows] of [
    [2, 2],
    [3, 3],
    [4, 3],
    [4, 4],
  ]) {
    for (const doubleSided of [false, true]) {
      it(`removes a middle page at ${columns}×${rows}, double-sided ${doubleSided}, keeping order and ownership`, () => {
        const binder = makeBinder('Fossil', 'base3', {}, { columns, doubleSided, rows });
        binder.slots[1] = null;
        const size = columns * rows;
        const doc = {
          ...emptyDocument(),
          binders: [binder],
          ownership: { 'base3-1:unlimited': true, 'base3-5:unlimited': 'purchased' as const },
        };
        const command = commandSchema.parse({
          binderId: binder.id,
          expected: binder,
          page: 1,
          type: 'binder.page.remove',
        });
        const after = applyCommand(doc, command);
        expect(after.binders[0].slots).toEqual([
          ...binder.slots.slice(0, size),
          ...binder.slots.slice(size * 2),
        ]);
        expect(after.ownership).toEqual(doc.ownership);
        expect(doc.binders[0].slots).toHaveLength(62);
        expect(() => applyCommand(after, command)).toThrow('changed');
      });
    }
  }
  it('removes empty and partial last pages and keeps the final page', () => {
    const binder = makeBinder('Test');
    let doc = applyCommand(emptyDocument(), { binder, type: 'binder.create' });
    doc = applyCommand(doc, { binderId: binder.id, type: 'binder.page' });
    doc = applyCommand(doc, {
      binderId: binder.id,
      expected: doc.binders[0],
      page: 1,
      type: 'binder.page.remove',
    });
    expect(doc.binders[0].slots).toEqual(binder.slots);
    expect(() =>
      applyCommand(doc, {
        binderId: binder.id,
        expected: doc.binders[0],
        page: 0,
        type: 'binder.page.remove',
      }),
    ).toThrow('at least one');
    doc = applyCommand(doc, {
      binderId: binder.id,
      position: 10,
      printing: 'base3-1:first',
      type: 'binder.slot',
    });
    const expected = structuredClone(doc.binders[0]);
    doc = applyCommand(doc, { binderId: binder.id, expected, page: 1, type: 'binder.page.remove' });
    expect(doc.binders[0].slots).toHaveLength(9);
  });
  it('rejects missing pages and snapshots changed by edits or layout changes', () => {
    const binder = makeBinder('Fossil', 'base3');
    const doc = { ...emptyDocument(), binders: [binder] };
    for (const page of [-1, 7, 1.5]) {
      expect(() =>
        applyCommand(doc, {
          binderId: binder.id,
          expected: binder,
          page,
          type: 'binder.page.remove',
        }),
      ).toThrow('does not exist');
    }
    for (const expected of [
      { ...binder, columns: 4 },
      { ...binder, slots: binder.slots.map(() => null) },
    ]) {
      expect(() =>
        applyCommand(doc, { binderId: binder.id, expected, page: 0, type: 'binder.page.remove' }),
      ).toThrow('changed');
    }
  });
});

describe('binder covers', () => {
  it('keeps legacy binders readable and infers only an unambiguous set', () => {
    const binder = makeBinder('Legacy');
    delete binder.coverSetId;
    binder.slots = ['base3-1:unlimited', null, 'base3-5:first'];
    const doc = { ...emptyDocument(), binders: [binder] };
    expect(documentSchema.parse(doc)).toEqual(doc);
    expect(binderPreset(binder)?.id).toBe('base3');
    binder.slots.push('base1-1:first');
    expect(binderPreset(binder)).toBeUndefined();
    binder.slots = [];
    expect(binderPreset(binder)).toBeUndefined();
  });
  it('retains preset and cover through card changes, old settings commands, and sharing', () => {
    const binder = makeBinder('Fossil', 'base3', {}, { coverSetId: 'base3' });
    binder.shareToken = crypto.randomUUID();
    let doc = applyCommand(emptyDocument(), { binder, type: 'binder.create' });
    doc = applyCommand(doc, {
      binderId: binder.id,
      position: 0,
      printing: 'base1-1:first',
      type: 'binder.slot',
    });
    const settings = {
      binderId: binder.id,
      columns: 3,
      doubleSided: false,
      name: 'Favorites',
      rows: 3,
      type: 'binder.settings' as const,
    };
    doc = applyCommand(doc, settings);
    expect(binderPreset(doc.binders[0])?.id).toBe('base3');
    expect(publicDocument(doc, binder.shareToken)?.binders[0].coverSetId).toBe('base3');
    const after = applyCommand(doc, { ...settings, coverSetId: null });
    expect(after.binders[0].coverSetId).toBeNull();
    expect(after.binders[0].presetSetId).toBe('base3');
    expect(after.binders[0].slots).toEqual(doc.binders[0].slots);
    expect(after.ownership).toEqual(doc.ownership);
  });
  it('remembers a legacy preset when selecting its cover and rejects unknown sets', () => {
    const binder = makeBinder('Legacy');
    binder.slots[0] = 'base3-1:first';
    const settings = {
      binderId: binder.id,
      columns: 3,
      coverSetId: 'base3',
      doubleSided: false,
      name: binder.name,
      rows: 3,
      type: 'binder.settings' as const,
    };
    const doc = applyCommand({ ...emptyDocument(), binders: [binder] }, settings);
    expect(doc.binders[0].presetSetId).toBe('base3');
    expect(commandSchema.safeParse({ ...settings, coverSetId: 'nonexistent' }).success).toBe(false);
    expect(
      documentSchema.safeParse({
        ...emptyDocument(),
        binders: [{ ...binder, presetSetId: 'nonexistent' }],
      }).success,
    ).toBe(false);
  });
});

describe('pocket openings', () => {
  it('reads legacy binders, defaults new binders to top, and preserves side-loading through old commands and sharing', () => {
    const binder = makeBinder('Sleeves');
    expect(binder.pocketOpening).toBe('top');
    delete binder.pocketOpening;
    binder.shareToken = crypto.randomUUID();
    const original = { ...emptyDocument(), binders: [binder] };
    expect(documentSchema.parse(original)).toEqual(original);
    const settings = {
      binderId: binder.id,
      columns: 3,
      doubleSided: false,
      name: binder.name,
      rows: 3,
      type: 'binder.settings' as const,
    };
    const changed = applyCommand(original, { ...settings, pocketOpening: 'side' });
    const preserved = applyCommand(changed, settings);
    expect(preserved.binders[0].pocketOpening).toBe('side');
    expect(preserved.binders[0].slots).toEqual(original.binders[0].slots);
    expect(preserved.ownership).toEqual(original.ownership);
    expect(publicDocument(preserved, binder.shareToken)?.binders[0].pocketOpening).toBe('side');
    const backup = JSON.stringify(preserved);
    expect(documentSchema.parse(JSON.parse(backup))).toEqual(preserved);
    expect(
      applyCommand(preserved, { ...settings, pocketOpening: 'top' }).binders[0].pocketOpening,
    ).toBe('top');
    expect(commandSchema.safeParse({ ...settings, pocketOpening: 'bottom' }).success).toBe(false);
    const clean = applyCommand(preserved, { ...settings, pocketOpening: 'none' });
    expect(applyCommand(clean, settings).binders[0].pocketOpening).toBe('none');
    expect(publicDocument(clean, binder.shareToken)?.binders[0].pocketOpening).toBe('none');
    expect(clean.binders[0].slots).toEqual(original.binders[0].slots);
  });
});

describe('binder colors', () => {
  it('keeps legacy binders valid and preserves custom colors across settings and sharing', () => {
    const binder = makeBinder('Color');
    expect(binder.color).toBe('#323236');
    delete binder.color;
    binder.shareToken = crypto.randomUUID();
    const legacy = { ...emptyDocument(), binders: [binder] };
    expect(documentSchema.parse(legacy)).toEqual(legacy);
    const settings = {
      binderId: binder.id,
      columns: 3,
      doubleSided: false,
      name: binder.name,
      rows: 3,
      type: 'binder.settings' as const,
    };
    const colored = applyCommand(legacy, { ...settings, color: '#aBc123' });
    const preserved = applyCommand(colored, settings);
    expect(preserved.binders[0].color).toBe('#aBc123');
    expect(preserved.binders[0].slots).toEqual(binder.slots);
    expect(preserved.ownership).toEqual(legacy.ownership);
    expect(publicDocument(preserved, binder.shareToken)?.binders[0].color).toBe('#aBc123');
    for (const color of ['red', '#fff', '#12345678', 'url(https://example.com)', '']) {
      expect(commandSchema.safeParse({ ...settings, color }).success).toBe(false);
    }
  });
});

describe('binder full-color presentation', () => {
  it('preserves ownership, old settings commands, sharing, and backups', () => {
    const binder = makeBinder('Pretty Cards');
    expect(binder.showAllCardsInColor).toBe(false);
    delete binder.showAllCardsInColor;
    binder.slots[0] = 'base1-1:first';
    binder.shareToken = crypto.randomUUID();
    const original = {
      ...emptyDocument(),
      binders: [binder],
      ownership: { 'base1-1:first': false },
    };
    expect(documentSchema.parse(original)).toEqual(original);
    const settings = {
      binderId: binder.id,
      columns: 3,
      doubleSided: false,
      name: binder.name,
      rows: 3,
      type: 'binder.settings' as const,
    };
    const changed = applyCommand(
      original,
      commandSchema.parse({ ...settings, showAllCardsInColor: true }),
    );
    const preserved = applyCommand(changed, settings);
    expect(preserved.binders[0].showAllCardsInColor).toBe(true);
    expect(preserved.binders[0].slots).toEqual(original.binders[0].slots);
    expect(preserved.ownership).toEqual(original.ownership);
    expect(publicDocument(preserved, binder.shareToken)?.binders[0].showAllCardsInColor).toBe(true);
    const backup = JSON.stringify(preserved);
    expect(documentSchema.parse(JSON.parse(backup))).toEqual(preserved);
    const imported = applyCommand(emptyDocument(), {
      document: preserved,
      type: 'collection.import',
    });
    expect(imported.binders[0].showAllCardsInColor).toBe(true);
    expect(
      applyCommand(preserved, { ...settings, showAllCardsInColor: false }).binders[0]
        .showAllCardsInColor,
    ).toBe(false);
  });
});
