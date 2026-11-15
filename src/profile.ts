import { splitPrinting, type CollectionDocument, type PersonalBinder } from './app/model';

export function binderCoverImages(printings: ReadonlyArray<string>) {
  return [
    ...new Set(
      printings.flatMap((id) => {
        const image = splitPrinting(id).card?.image;
        return image ? [image] : [];
      }),
    ),
  ].slice(0, 3);
}

export function binderSummary(binder: PersonalBinder, ownership: CollectionDocument['ownership']) {
  const cards = binder.slots.filter((id): id is string => Boolean(id));
  return {
    color: binder.color,
    coverSetId: binder.coverSetId,
    id: binder.id,
    images: binderCoverImages(cards),
    name: binder.name,
    owned: cards.filter((id) => ownership[id] === true).length,
    purchased: cards.filter((id) => ownership[id] === 'purchased').length,
    total: cards.length,
    wishlist: cards.filter((id) => ownership[id] === 'wishlist').length,
  };
}
export type BinderSummary = ReturnType<typeof binderSummary>;
export function profileSummary(doc: CollectionDocument, token: string) {
  if (!doc.profile?.token || doc.profile.token !== token) {
    return null;
  }
  return {
    binders: doc.binders
      .filter((binder) => doc.profile!.binderIds.includes(binder.id))
      .map((binder) => binderSummary(binder, doc.ownership)),
    name: doc.profile.name,
  };
}
export function profileBinderDocument(
  doc: CollectionDocument,
  token: string,
  binderId: string,
): CollectionDocument | null {
  if (
    !doc.profile?.token ||
    doc.profile.token !== token ||
    !doc.profile.binderIds.includes(binderId)
  ) {
    return null;
  }
  const binder = doc.binders.find(({ id }) => id === binderId);
  if (!binder) {
    return null;
  }
  return {
    binders: [{ ...binder, shareToken: null }],
    ownership: Object.fromEntries(
      binder.slots
        .filter((id): id is string => Boolean(id))
        .map((id) => [id, doc.ownership[id] ?? false]),
    ),
    version: 1,
  };
}
