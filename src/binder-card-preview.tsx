import { Button } from '@astryxdesign/core/Button';
import { Link2 } from 'lucide-react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { BinderCard } from './binder-catalog';
import { cardAssetURL } from './card-assets';
import { CardPreview } from './card-preview';
import { cardTextEntries, cardTextLanguages, type CardTextOptions } from './card-text';
import type { CardDetails, Energy, Modifier, Translation } from './catalog/details';
import germanDetails from './german-card-details.json';
import { useCardTranslations, useCardNames } from './i18n/card-language';
import { text as uiText } from './i18n/text';
import { lookup } from './lookup';
import { cardHref } from './share-url';
import vsDetails from './vs-card-details.json';
const detailPacks = new Map<string, Promise<Record<string, CardDetails>>>();
function loadDetails(path: string) {
  let promise = detailPacks.get(path);
  if (!promise) {
    promise = fetch(path)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Card details unavailable');
        }
        return response.json() as Promise<Record<string, CardDetails>>;
      })
      .catch((error: unknown) => {
        detailPacks.delete(path);
        throw error;
      });
    detailPacks.set(path, promise);
  }
  return promise;
}

const energyNames = {
  colorless: { de: 'Farblos', en: 'Colorless', ja: '無色' },
  darkness: { de: 'Finsternis', en: 'Darkness', ja: '悪' },
  dragon: { de: 'Drache', en: 'Dragon', ja: 'ドラゴン' },
  fairy: { de: 'Fee', en: 'Fairy', ja: 'フェアリー' },
  fighting: { de: 'Kampf', en: 'Fighting', ja: '闘' },
  fire: { de: 'Feuer', en: 'Fire', ja: '炎' },
  grass: { de: 'Pflanze', en: 'Grass', ja: '草' },
  lightning: { de: 'Elektro', en: 'Lightning', ja: '雷' },
  metal: { de: 'Metall', en: 'Metal', ja: '鋼' },
  psychic: { de: 'Psycho', en: 'Psychic', ja: '超' },
  water: { de: 'Wasser', en: 'Water', ja: '水' },
};

const kinds = {
  basicEnergy: { de: 'Basis-Energie', en: 'Basic Energy', ja: '基本エネルギー' },
  pokemon: { de: 'Basis-Pokémon', en: 'Basic Pokémon', ja: 'たねポケモン' },
  specialEnergy: { de: 'Spezial-Energie', en: 'Special Energy', ja: '特殊エネルギー' },
  stage1: { de: 'Phase 1', en: 'Stage 1', ja: '1進化' },
  stage2: { de: 'Phase 2', en: 'Stage 2', ja: '2進化' },
  technicalMachine: { de: 'Technische Maschine', en: 'Technical Machine', ja: 'ワザマシン' },
  trainer: { de: 'Trainer', en: 'Trainer', ja: 'トレーナー' },
};

const rarities = {
  common: { de: 'Häufig', en: 'Common', ja: 'コモン' },
  'holo-rare': { de: 'Holo-Selten', en: 'Holo Rare', ja: 'キラ' },
  promo: { de: 'Promo', en: 'Promo', ja: 'プロモ' },
  rare: { de: 'Selten', en: 'Rare', ja: 'レア' },
  secret: { de: 'Geheim selten', en: 'Secret Rare', ja: 'シークレット' },
  uncommon: { de: 'Nicht so häufig', en: 'Uncommon', ja: 'アンコモン' },
};

const CardTextContext = createContext<CardTextOptions>({ interfaceLanguage: 'en', mode: 'both' });
type Language = string;
const cardDetails = {
  de: germanDetails as Record<string, CardDetails>,
  ja: vsDetails as Record<string, CardDetails>,
};
const localText = (values: { en: string } & Record<string, string>, language: string) =>
  (values as Record<string, string>)[language] ?? values.en;
const inlineEnergy = {
  C: 'colorless',
  D: 'darkness',
  F: 'fighting',
  G: 'grass',
  L: 'lightning',
  M: 'metal',
  N: 'dragon',
  P: 'psychic',
  R: 'fire',
  W: 'water',
  Y: 'fairy',
} satisfies Record<string, Energy>;

function EnergySymbol({ energy, language }: { energy: Energy; language: Language }) {
  const names = energyNames[energy];
  const options = useContext(CardTextContext);
  const title = [
    ...new Set(cardTextLanguages(language, options).map((locale) => localText(names, locale))),
  ].join(' / ');
  return (
    <img
      alt={title}
      className="energy-symbol"
      crossOrigin="anonymous"
      height="20"
      src={cardAssetURL(
        `/energy/${energy}.${energy === 'dragon' || energy === 'fairy' ? 'svg' : 'png'}`,
      )}
      title={title}
      width="20"
    />
  );
}

function EffectText({ language, text }: { language: Language; text: string }) {
  return text.split(/(\{[A-Z]\})/).map((part, index) => {
    const energy = /^\{([A-Z])\}$/.test(part) && lookup(inlineEnergy, part[1]);
    return energy ? <EnergySymbol energy={energy} key={index} language={language} /> : part;
  });
}

function Labels({
  language,
  values,
}: {
  language: string;
  values: { en: string } & Record<string, string>;
}) {
  const options = useContext(CardTextContext);
  const entries = cardTextLanguages(language, options).map((locale) => ({
    language: locale,
    text: localText(values, locale),
  }));
  return entries
    .filter(
      (entry, index) => !entries.slice(0, index).some((previous) => previous.text === entry.text),
    )
    .map((entry) => (
      <span key={entry.language} lang={entry.language}>
        {entry.text}
      </span>
    ));
}

function Stat({
  label,
  language,
  value,
}: {
  label: { en: string } & Record<string, string>;
  language: Language;
  value?: ReactNode;
}) {
  return (
    <div>
      <dt>
        <Labels language={language} values={label} />
      </dt>
      <dd>{value ?? '—'}</dd>
    </div>
  );
}

function DamageModifier({ language, modifier }: { language: Language; modifier: Modifier }) {
  return (
    <>
      <EnergySymbol energy={modifier.energy} language={language} /> {modifier.value}
    </>
  );
}

function Descriptions({ language, text }: { language: Language; text: Translation }) {
  const options = useContext(CardTextContext);
  return cardTextEntries(text, language, options).map((entry) => (
    <p key={entry.language} lang={entry.language}>
      <EffectText language={language} text={entry.text} />
    </p>
  ));
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
  const { language } = card;
  const options = useCardTranslations(language);
  const names = useCardNames()(card);
  const entries = (value: Translation) => cardTextEntries(value, language, options);
  const [loaded, setLoaded] = useState<{
    data?: Record<string, CardDetails>;
    error?: boolean;
    path: string;
  }>();
  const [retry, setRetry] = useState(0);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  useEffect(() => {
    const path = card.detailsPath;
    if (!path) {
      return;
    }
    let active = true;
    void loadDetails(path).then(
      (data) => {
        if (active) {
          setLoaded({ data, path });
        }
      },
      () => {
        if (active) {
          setLoaded({ error: true, path });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [card.detailsPath, retry]);
  const pack = loaded?.path === card.detailsPath ? loaded : undefined;
  const { artist, attacks, energy, hp, kind, pokemon, powers, rarity, rules } = card.details ??
    pack?.data?.[card.id] ??
    lookup(cardDetails, language)?.[card.id] ?? { kind: 'pokemon' };
  const hitPoints = pokemon?.hp ?? hp;
  const cardType = pokemon?.energy ?? energy;
  const types = pokemon?.types?.length ? pokemon.types : cardType ? [cardType] : [];

  return (
    <CardTextContext value={options}>
      <CardPreview
        className="binder-card-preview"
        close={close}
        foil={card.foil}
        image={card.image}
        imageActions={actions}
        title={
          <>
            {names.map((entry) => (
              <span key={entry.language} lang={entry.language}>
                {entry.text}
              </span>
            ))}
          </>
        }
      >
        <div className="binder-details">
          {card.imageLanguage && card.imageLanguage !== card.language && (
            <p className="scan-language-note">{uiText('English reference scan')}</p>
          )}
          {card.detailsPath && !pack && <p role="status">{uiText('Loading card details…')}</p>}
          {pack?.error && (
            <Button
              label={uiText('Retry')}
              onClick={() => setRetry((value) => value + 1)}
              type="button"
            >
              {uiText('Retry')}
            </Button>
          )}
          <div className="binder-preview-meta">
            <span className="card-number">{card.number ?? 'Unnumbered'}</span>
            {types.length > 0 && (
              <span className="energy-symbols">
                {types.map((type) => (
                  <EnergySymbol energy={type} key={type} language={language} />
                ))}
              </span>
            )}
            {hitPoints !== undefined && (
              <strong>
                {hitPoints}{' '}
                {[
                  ...new Set(
                    cardTextLanguages(language, options).map((locale) =>
                      locale === 'de' ? 'KP' : 'HP',
                    ),
                  ),
                ].join(' / ')}
              </strong>
            )}
            {cardTextLanguages(language, options).map((locale) => (
              <span key={locale} lang={locale}>
                {localText(kinds[kind], locale)}
                {rarity && ` · ${localText(rarities[rarity], locale)}`}
              </span>
            ))}
          </div>
          {pokemon?.evolvesFrom && (
            <p className="binder-evolution">
              {entries(pokemon.evolvesFrom).map((entry) => (
                <span key={entry.language} lang={entry.language}>
                  {{ de: 'Entsteht aus', en: 'Evolves from', ja: '進化前' }[entry.language] ??
                    'Evolves from'}{' '}
                  {entry.text}
                </span>
              ))}
            </p>
          )}
          {powers?.map((power) => (
            <section className="binder-move" key={power.local.name}>
              <p className="binder-power-label">
                <Labels
                  language={language}
                  values={{ de: 'Fähigkeit', en: 'Ability', ja: '特性' }}
                />
              </p>
              <h3>
                {entries({ en: power.en.name, local: power.local.name }).map((entry) => (
                  <span key={entry.language} lang={entry.language}>
                    {entry.text}
                  </span>
                ))}
              </h3>
              <Descriptions
                language={language}
                text={{ en: power.en.text, local: power.local.text }}
              />
            </section>
          ))}
          {attacks?.map((attack) => (
            <section className="binder-move" key={attack.local.name}>
              <div className="binder-move-heading">
                <div
                  className="binder-move-cost"
                  title={cardTextLanguages(language, options)
                    .map((locale) =>
                      localText(
                        {
                          de: 'Energiekosten',
                          en: 'Attack Energy cost',
                          ja: 'ワザに必要なエネルギー',
                        },
                        locale,
                      ),
                    )
                    .join(' / ')}
                >
                  {attack.cost.map((type, index) => (
                    <EnergySymbol energy={type} key={index} language={language} />
                  ))}
                </div>
                <h3>
                  {entries({ en: attack.en.name, local: attack.local.name }).map((entry) => (
                    <span key={entry.language} lang={entry.language}>
                      {entry.text}
                    </span>
                  ))}
                </h3>
                {attack.damage && <strong className="binder-damage">{attack.damage}</strong>}
              </div>
              <Descriptions
                language={language}
                text={{ en: attack.en.text, local: attack.local.text }}
              />
            </section>
          ))}
          {pokemon && (
            <dl className="binder-stats">
              <Stat
                label={{ de: 'Schwäche', en: 'Weakness', ja: '弱点' }}
                language={language}
                value={(pokemon.weaknesses ?? (pokemon.weakness ? [pokemon.weakness] : [])).map(
                  (modifier) => (
                    <DamageModifier key={modifier.energy} language={language} modifier={modifier} />
                  ),
                )}
              />
              <Stat
                label={{ de: 'Resistenz', en: 'Resistance', ja: '抵抗力' }}
                language={language}
                value={(
                  pokemon.resistances ?? (pokemon.resistance ? [pokemon.resistance] : [])
                ).map((modifier) => (
                  <DamageModifier key={modifier.energy} language={language} modifier={modifier} />
                ))}
              />
              <Stat
                label={{ de: 'Rückzug', en: 'Retreat', ja: 'にげる' }}
                language={language}
                value={
                  pokemon.retreat === 0
                    ? '0'
                    : Array.from({ length: pokemon.retreat }, (_, index) => (
                        <EnergySymbol energy="colorless" key={index} language={language} />
                      ))
                }
              />
            </dl>
          )}
          {rules && (
            <section className="binder-move">
              <h3>
                <Labels
                  language={language}
                  values={{ de: 'Karteneffekt', en: 'Card effect', ja: 'カードの効果' }}
                />
              </h3>
              <Descriptions language={language} text={rules} />
            </section>
          )}
          {kind === 'basicEnergy' && energy && (
            <section className="binder-move">
              {cardTextLanguages(language, options).map((locale) => (
                <p key={locale} lang={locale}>
                  {locale === 'de'
                    ? `Liefert eine ${energyNames[energy].de}-Energie.`
                    : locale === 'ja'
                      ? `${energyNames[energy].ja}エネルギー1個ぶんとしてはたらく。`
                      : `Provides one ${energyNames[energy].en} Energy.`}
                </p>
              ))}
            </section>
          )}
          {artist && (
            <p className="binder-artist">
              <Labels
                language={language}
                values={{ de: 'Illustration', en: 'Illustration', ja: 'イラスト' }}
              />{' '}
              · {artist}
            </p>
          )}
          <div>
            <Button
              icon={<Link2 size={16} />}
              label={uiText(copyState === 'copied' ? 'Copied' : 'Copy link')}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    new URL(cardHref(card.id), location.origin).href,
                  );
                  setCopyState('copied');
                } catch {
                  setCopyState('manual');
                }
              }}
              size="sm"
              variant="ghost"
            />
            {copyState === 'manual' && (
              <a href={cardHref(card.id)}>{new URL(cardHref(card.id), location.origin).href}</a>
            )}
          </div>
        </div>
      </CardPreview>
    </CardTextContext>
  );
}
