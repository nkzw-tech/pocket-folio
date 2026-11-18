import { lazy, Suspense, useState, type ReactNode } from 'react';
import type { BinderCard } from './binder-catalog';
import { CardPreview } from './card-preview';
import type { CardDetails } from './catalog/details';
import { useCardNames } from './i18n/card-language';
import { text } from './i18n/text';

const CardRules = lazy(() => import('./card-rules'));
type DetailPack = Record<string, CardDetails>;
const packs = new Map<string, Promise<DetailPack | null>>();

function loadPack(path?: string) {
  if (!path) {
    return;
  }
  let pack = packs.get(path);
  if (!pack) {
    pack = fetch(path)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Card details unavailable');
        }
        return response.json() as Promise<DetailPack>;
      })
      .catch(() => {
        packs.delete(path);
        return null;
      });
    packs.set(path, pack);
  }
  return pack;
}

function Details({ card }: { card: BinderCard }) {
  const [pack, setPack] = useState(() => loadPack(card.detailsPath));
  return (
    <Suspense
      fallback={
        <p className="binder-details" role="status">
          {text('Loading card details…')}
        </p>
      }
    >
      <CardRules card={card} pack={pack} retry={() => setPack(loadPack(card.detailsPath))} />
    </Suspense>
  );
}

export function BinderCardPreview({
  actions,
  card,
  close,
}: {
  actions?: ReactNode;
  card: BinderCard;
  close?: () => void;
}) {
  const names = useCardNames()(card);
  return (
    <CardPreview
      className="binder-card-preview"
      close={close}
      foil={card.foil}
      image={card.image}
      imageActions={actions}
      title={names.map((entry) => (
        <span key={entry.language} lang={entry.language}>
          {entry.text}
        </span>
      ))}
    >
      <Details card={card} key={card.id} />
    </CardPreview>
  );
}
