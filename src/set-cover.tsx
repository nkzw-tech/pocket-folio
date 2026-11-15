import { binderCollections, type BinderSet } from './binder-catalog';
import { cardAssetURL } from './card-assets';
import { CardImage } from './card-image';
import covers from './catalog/set-covers.json';

const logos: Record<string, { image: string }> = covers;
const coverCards = (set: BinderSet) => {
  const unique = [
    ...new Map(set.cards.filter((card) => card.foil).map((card) => [card.english, card])).values(),
  ];
  const favorites = unique.filter((card) =>
    /Charizard|Lugia|Umbreon|Dragonite|Mewtwo|Rayquaza|Pikachu/.test(card.english),
  );
  return [
    ...new Map([...favorites, ...unique, ...set.cards].map((card) => [card.id, card])).values(),
  ].slice(0, 3);
};
const art = new Map(binderCollections.map((set) => [set.id, coverCards(set)]));

export function CardFan({ images }: { images: ReadonlyArray<string> }) {
  return (
    <div className="set-cover-fan">
      {images.map((image) => (
        <CardImage
          alt=""
          crossOrigin="anonymous"
          decoding="async"
          height="342"
          key={image}
          loading="lazy"
          src={cardAssetURL(image)}
          width="245"
        />
      ))}
    </div>
  );
}

export function SetCover({ set }: { set: BinderSet }) {
  return (
    <div aria-hidden="true" className={`set-cover${logos[set.id] ? ' has-logo' : ''}`}>
      <CardFan images={art.get(set.id)?.map(({ image }) => image) ?? []} />
      {logos[set.id] && (
        <CardImage
          alt=""
          className="set-cover-logo"
          crossOrigin="anonymous"
          decoding="async"
          loading="lazy"
          src={cardAssetURL(logos[set.id].image)}
        />
      )}
    </div>
  );
}
