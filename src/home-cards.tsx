import { BinderCardPreview as CardPreview } from './binder-card-preview';
import { binderCollections } from './binder-catalog';
import { CardScan, cardLightEvents } from './card-scan';
import { useCardPreview } from './share-url';

export function HomeCards({ ids }: { ids: Array<string> }) {
  const cards = ids.flatMap((id) =>
    binderCollections.flatMap(({ cards }) => cards).filter((card) => card.id === id),
  );
  const [preview, setPreview] = useCardPreview();
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
      {preview && <CardPreview card={preview} close={() => setPreview(undefined)} />}
    </>
  );
}
