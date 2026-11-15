import type { BinderCard } from './binder-catalog';
import { CardScan } from './card-scan';
import { CardName } from './i18n/card-language';
import { text } from './i18n/text';
import './physical-binder.css';

export function MissingCardArtwork({ card, reveal }: { card: BinderCard; reveal: boolean }) {
  return reveal ? (
    <span className="folio-insert is-reference">
      <CardScan foil={card.foil} image={card.image} />
    </span>
  ) : (
    <span className="folio-placeholder">
      <span className="folio-placeholder-number">{card.number?.split('/')[0] ?? '✧'}</span>
      <CardName card={card} />
      <CardName as="small" card={card} secondary />
      <em>{text('Missing')}</em>
    </span>
  );
}
