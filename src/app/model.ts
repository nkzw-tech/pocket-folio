import { z } from 'zod';
import { binderCollections, type BinderCard } from '../binder-catalog';
import { defaultBinderColor } from '../binder-color';

export const catalog = binderCollections.flatMap((set) =>
  set.cards.map((card) => ({ ...card, setId: set.id, setName: set.label })),
);
export const cardsById = new Map(catalog.map((card) => [card.id, card]));
import type { Edition } from '../binder-catalog';
export type { Edition } from '../binder-catalog';
export const printingId = (cardId: string, edition: Edition) => `${cardId}:${edition}`;
export const splitPrinting = (id: string) => {
  const [cardId, edition] = id.split(':');
  return { card: cardsById.get(cardId), edition: edition as Edition };
};
export const defaultPrinting = (card: BinderCard) => printingId(card.id, card.defaultEdition);
export const editionLabel = (edition: Edition) =>
  edition === 'first'
    ? '1st Edition'
    : edition === 'unlimited'
      ? 'Unlimited'
      : 'Edition unspecified';
export const validPrinting = (id: string) => {
  const { card, edition } = splitPrinting(id);
  return Boolean(card && id === printingId(card.id, edition) && card.editions.includes(edition));
};
const setIdSchema = z
  .string()
  .refine((id) => binderCollections.some((set) => set.id === id), 'Unknown set');
const print = z.string().refine(validPrinting, 'Unknown card printing');
export const cardStatuses = ['missing', 'wishlist', 'purchased', 'owned'] as const;
export type CardStatus = (typeof cardStatuses)[number];
// Keep existing boolean ownership data/backups intact; purchased is an intermediate state.
export const cardStatus = (value: boolean | 'purchased' | 'wishlist' | undefined): CardStatus =>
  value === true ? 'owned' : value === 'purchased' || value === 'wishlist' ? value : 'missing';
export const statusLabel = (status: CardStatus) =>
  status === 'owned'
    ? 'Owned'
    : status === 'purchased'
      ? 'Purchased'
      : status === 'wishlist'
        ? 'Wishlist'
        : 'Missing';
export const binderColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const pocketOpeningSchema = z.enum(['top', 'side', 'none']);
export const binderSchema = z.object({
  color: binderColorSchema.optional(),
  columns: z.number().int().min(2).max(4),
  coverSetId: setIdSchema.nullable().optional(),
  doubleSided: z.boolean(),
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  pocketOpening: pocketOpeningSchema.optional(),
  presetSetId: setIdSchema.optional(),
  rows: z.number().int().min(2).max(4),
  shareToken: z.uuid().nullable(),
  showAllCardsInColor: z.boolean().optional(),
  slots: z.array(print.nullable()).max(2000),
});
export type PersonalBinder = z.infer<typeof binderSchema>;
export const profileSchema = z.object({
  binderIds: z
    .array(z.uuid())
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length),
  name: z.string().trim().min(1).max(80),
  token: z.uuid().nullable(),
});
export const documentSchema = z
  .object({
    binders: z.array(binderSchema).max(100),
    ownership: z.record(print, z.union([z.boolean(), z.enum(['purchased', 'wishlist'])])),
    profile: profileSchema.optional(),
    version: z.literal(1),
  })
  .refine(
    (doc) => new Set(doc.binders.map(({ id }) => id)).size === doc.binders.length,
    'Duplicate binder IDs',
  );
export type CollectionDocument = z.infer<typeof documentSchema>;
export const emptyDocument = (): CollectionDocument => ({ binders: [], ownership: {}, version: 1 });
const binderId = z.uuid();
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ profile: profileSchema, type: z.literal('profile.settings') }),
  z.object({ document: documentSchema, type: z.literal('collection.import') }),
  z.object({ binder: binderSchema, type: z.literal('binder.create') }),
  z.object({ beforeId: binderId.nullable(), binderId, type: z.literal('shelf.move') }),
  z.object({
    binderId,
    color: binderColorSchema.optional(),
    columns: z.number().int().min(2).max(4),
    coverSetId: setIdSchema.nullable().optional(),
    doubleSided: z.boolean(),
    name: z.string().trim().min(1).max(80),
    pocketOpening: pocketOpeningSchema.optional(),
    rows: z.number().int().min(2).max(4),
    showAllCardsInColor: z.boolean().optional(),
    type: z.literal('binder.settings'),
  }),
  z.object({ binderId, token: z.uuid().nullable(), type: z.literal('binder.share') }),
  z.object({ binderId, type: z.literal('binder.delete') }),
  z.object({
    binderId,
    owned: z.boolean().optional(),
    position: z.number().int().min(0).max(1999),
    printing: print.nullable(),
    status: z.enum(cardStatuses).optional(),
    type: z.literal('binder.slot'),
  }),
  z.object({
    binderId,
    from: z.number().int().min(0).max(1999),
    to: z.number().int().min(0).max(1999),
    type: z.literal('binder.move'),
  }),
  z.object({ binderId, type: z.literal('binder.page') }),
  z.object({
    binderId,
    expected: binderSchema.pick({ columns: true, rows: true, slots: true }),
    page: z.number().int().min(0).max(499),
    type: z.literal('binder.page.remove'),
  }),
  z.object({ owned: z.boolean(), printing: print, type: z.literal('ownership.set') }),
  z.object({ printing: print, status: z.enum(cardStatuses), type: z.literal('ownership.status') }),
  z.object({
    owned: z.boolean(),
    printings: z.array(print).max(2000),
    type: z.literal('ownership.bulk'),
  }),
]);
export type Command = z.infer<typeof commandSchema>;
export const operationSchema = z.object({ command: commandSchema, id: z.uuid() });
export type Operation = z.infer<typeof operationSchema>;

const ownershipRank = (value: boolean | 'purchased' | 'wishlist' | undefined) =>
  value === true ? 3 : value === 'purchased' ? 2 : value === 'wishlist' ? 1 : 0;

export function applyCommand(current: CollectionDocument, command: Command): CollectionDocument {
  const doc = structuredClone(current);
  if (command.type === 'profile.settings') {
    if (command.profile.binderIds.some((id) => !doc.binders.some((binder) => binder.id === id))) {
      throw new Error('A selected binder no longer exists.');
    }
    doc.profile = structuredClone(command.profile);
  } else if (command.type === 'shelf.move') {
    const from = doc.binders.findIndex(({ id }) => id === command.binderId);
    const before =
      command.beforeId === null
        ? doc.binders.length
        : doc.binders.findIndex(({ id }) => id === command.beforeId);
    // A concurrent deletion can remove either end of a queued move.
    if (from >= 0 && before >= 0 && from !== before) {
      const [binder] = doc.binders.splice(from, 1);
      doc.binders.splice(before > from ? before - 1 : before, 0, binder);
    }
  } else if (command.type === 'collection.import') {
    const existing = new Set(doc.binders.map(({ id }) => id));
    for (const binder of command.document.binders) {
      if (!existing.has(binder.id)) {
        doc.binders.push({ ...structuredClone(binder), shareToken: null });
        existing.add(binder.id);
      }
    }
    for (const [printing, status] of Object.entries(command.document.ownership)) {
      if (
        !(printing in doc.ownership) ||
        ownershipRank(status) > ownershipRank(doc.ownership[printing])
      ) {
        doc.ownership[printing] = status;
      }
    }
    if (JSON.stringify(doc).length > 8_000_000) {
      throw new Error('The combined collection is too large to import.');
    }
  } else if (command.type === 'ownership.status') {
    doc.ownership[command.printing] =
      command.status === 'purchased' || command.status === 'wishlist'
        ? command.status
        : command.status === 'owned';
  } else if (command.type === 'ownership.set') {
    doc.ownership[command.printing] = command.owned;
  } else if (command.type === 'ownership.bulk') {
    for (const id of command.printings) {
      doc.ownership[id] = command.owned;
    }
  } else if (command.type === 'binder.create') {
    if (!doc.binders.some(({ id }) => id === command.binder.id)) {
      doc.binders.push(command.binder);
    }
  } else {
    const index = doc.binders.findIndex(({ id }) => id === command.binderId);
    if (index < 0) {
      throw new Error('This binder was removed on another device.');
    }
    const binder = doc.binders[index];
    if (command.type === 'binder.delete') {
      doc.binders.splice(index, 1);
      if (doc.profile) {
        doc.profile.binderIds = doc.profile.binderIds.filter((id) => id !== binder.id);
      }
    } else if (command.type === 'binder.settings') {
      Object.assign(binder, {
        columns: command.columns,
        doubleSided: command.doubleSided,
        name: command.name,
        rows: command.rows,
      });
      if (command.showAllCardsInColor !== undefined) {
        binder.showAllCardsInColor = command.showAllCardsInColor;
      }
      if (command.color !== undefined) {
        binder.color = command.color;
      }
      if (command.pocketOpening !== undefined) {
        binder.pocketOpening = command.pocketOpening;
      }
      if (command.coverSetId !== undefined) {
        binder.coverSetId = command.coverSetId;
        if (command.coverSetId && !binder.presetSetId) {
          binder.presetSetId = command.coverSetId;
        }
      }
    } else if (command.type === 'binder.share') {
      binder.shareToken = command.token;
    } else if (command.type === 'binder.page') {
      const size = binder.rows * binder.columns;
      binder.slots.length = Math.ceil(binder.slots.length / size) * size + size;
      binder.slots = Array.from(binder.slots, (slot) => slot ?? null);
    } else if (command.type === 'binder.page.remove') {
      const size = binder.rows * binder.columns;
      const { expected, page } = command;
      if (
        binder.columns !== expected.columns ||
        binder.rows !== expected.rows ||
        binder.slots.length !== expected.slots.length ||
        binder.slots.some((slot, index) => slot !== expected.slots[index])
      ) {
        throw new Error('This binder changed. Reopen the page picker before removing a page.');
      }
      const pages = Math.ceil(binder.slots.length / size);
      if (pages <= 1) {
        throw new Error('Keep at least one page in the binder.');
      }
      if (!Number.isInteger(page) || page < 0 || page >= pages) {
        throw new Error('This page does not exist.');
      }
      binder.slots.splice(page * size, size);
    } else if (command.type === 'binder.slot') {
      while (binder.slots.length <= command.position) {
        binder.slots.push(null);
      }
      binder.slots[command.position] = command.printing;
      if (command.printing && command.status !== undefined) {
        doc.ownership[command.printing] =
          command.status === 'purchased' || command.status === 'wishlist'
            ? command.status
            : command.status === 'owned';
      } else if (command.printing && command.owned !== undefined) {
        doc.ownership[command.printing] = command.owned;
      }
    } else if (command.type === 'binder.move') {
      while (binder.slots.length <= Math.max(command.from, command.to)) {
        binder.slots.push(null);
      }
      [binder.slots[command.from], binder.slots[command.to]] = [
        binder.slots[command.to],
        binder.slots[command.from],
      ];
    }
  }
  if (doc.binders.length > 100 || doc.binders.some((binder) => binder.slots.length > 2000)) {
    throw new Error('A collection supports 100 binders with up to 2,000 pockets each.');
  }
  return doc;
}

export const binderLayouts = [
  [2, 2],
  [3, 3],
  [4, 3],
  [4, 4],
] as const;

export function makeBinder(
  name: string,
  setId?: string,
  ownership: CollectionDocument['ownership'] = {},
  options: Partial<
    Pick<
      PersonalBinder,
      | 'color'
      | 'columns'
      | 'rows'
      | 'doubleSided'
      | 'coverSetId'
      | 'pocketOpening'
      | 'showAllCardsInColor'
    >
  > = {},
): PersonalBinder {
  const set = binderCollections.find(({ id }) => id === setId);
  const { columns = 3, doubleSided = set?.doubleSided ?? false, rows = 3 } = options;
  const binder: PersonalBinder = {
    color: options.color ?? defaultBinderColor,
    columns,
    coverSetId: options.coverSetId ?? null,
    doubleSided,
    id: crypto.randomUUID(),
    name: name.trim() || set?.label || 'My pretty binder',
    pocketOpening: options.pocketOpening ?? 'top',
    rows,
    shareToken: null,
    showAllCardsInColor: options.showAllCardsInColor ?? false,
    slots: set
      ? set.cards.map((card) => preferredPrinting(card, ownership))
      : Array(columns * rows).fill(null),
  };
  if (set) {
    binder.presetSetId = set.id;
  }
  return binder;
}
export function preferredPrinting(card: BinderCard, ownership: CollectionDocument['ownership']) {
  const printings = card.editions.map((edition) => printingId(card.id, edition));
  return (
    printings.find((id) => ownership[id] === true) ??
    printings.find((id) => ownership[id] === 'purchased') ??
    printings.find((id) => ownership[id] === 'wishlist') ??
    defaultPrinting(card)
  );
}
export function publicDocument(doc: CollectionDocument, token: string) {
  const binder = doc.binders.find((item) => item.shareToken === token);
  if (!binder) {
    return null;
  }
  const ids = new Set(binder.slots.filter((id): id is string => Boolean(id)));
  return {
    binders: [binder],
    ownership: Object.fromEntries([...ids].map((id) => [id, doc.ownership[id] ?? false])),
    version: 1 as const,
  };
}

// Older binders did not retain their preset. Infer it only when every placed card belongs to one set.
export function binderPreset(binder: PersonalBinder) {
  const explicit = binder.coverSetId ?? binder.presetSetId;
  if (explicit) {
    return binderCollections.find((set) => set.id === explicit);
  }
  const setIds = new Set(binder.slots.filter(Boolean).map((id) => splitPrinting(id!).card?.setId));
  return setIds.size === 1 ? binderCollections.find((set) => set.id === [...setIds][0]) : undefined;
}
