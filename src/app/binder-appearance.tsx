import { Switch } from '@astryxdesign/core/Switch';
import { useMissingArtwork } from '../binder-preferences';
import { text } from '../i18n/text';
import { MissingCardArtwork } from '../missing-card-artwork';
import { cardsById } from './model';

const card = cardsById.get('base1-2')!;

export function BinderAppearance() {
  const [reveal, setReveal] = useMissingArtwork();
  return (
    <section className="settings-section binder-appearance">
      <div>
        <h2>{text('Binder appearance')}</h2>
        <Switch
          label={text('Show missing artwork in binders')}
          onChange={setReveal}
          value={reveal}
        />
      </div>
      <div aria-label={text('Missing card preview')} className="missing-artwork-preview">
        <div className="folio-pocket">
          <div className="folio-card">
            <MissingCardArtwork card={card} reveal={reveal} />
          </div>
          <div className="folio-pocket-label">
            <span>{card.number}</span>
            <span>{text('Missing')}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
