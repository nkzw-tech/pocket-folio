import { lazy, Suspense, useState } from 'react';
import { binderCollections, type BinderCard } from './binder-catalog';
import { CardScan, cardLightEvents } from './card-scan';

const CardPreview = lazy(async () => ({
  default: (await import('./binder-card-preview')).BinderCardPreview,
}));
export function HomeCards({ ids }: { ids: Array<string> }) {
  const cards = ids.flatMap((id) =>
    binderCollections.flatMap(({ cards }) => cards).filter((card) => card.id === id),
  );
  const [preview, setPreview] = useState<BinderCard>();
  return (
    <>
      <div className="welcome-cards">
        {cards.map((card) => (
          <button
            aria-label={`${card.localName} / ${card.english} · ${card.number}`}
            className="welcome-card"
            data-card-id={card.id}
            key={card.id}
            onClick={() => setPreview(card)}
            {...cardLightEvents}
            type="button"
          >
            <CardScan foil={card.foil} image={card.image} />
          </button>
        ))}
      </div>
      {preview && (
        <Suspense fallback={null}>
          <CardPreview card={preview} close={() => setPreview(undefined)} />
        </Suspense>
      )}
    </>
  );
}
