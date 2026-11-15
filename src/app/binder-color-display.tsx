import { Stack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { useMissingArtwork } from '../binder-preferences';
import { CardScan, cardLightEvents } from '../card-scan';
import { text } from '../i18n/text';
import { MissingCardArtwork } from '../missing-card-artwork';
import { catalog, splitPrinting, type PersonalBinder } from './model';
import './binder-color-display.css';

export function BinderColorDisplay({
  binder,
  onChange,
  value,
}: {
  binder: PersonalBinder;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  const [reveal] = useMissingArtwork();
  const printing = binder.slots.find(Boolean);
  const card = (printing ? splitPrinting(printing).card : undefined) ?? catalog[0];
  return (
    <Stack align="center" direction="horizontal" gap={4}>
      <div className="binder-color-display-control">
        <Switch label={text('Show all cards in full color')} onChange={onChange} value={value} />
      </div>
      <div aria-hidden="true" className="binder-color-display-preview" {...cardLightEvents}>
        {value ? (
          <span className="folio-insert">
            <CardScan foil={card.foil} image={card.image} />
          </span>
        ) : (
          <MissingCardArtwork card={card} reveal={reveal} />
        )}
      </div>
    </Stack>
  );
}
