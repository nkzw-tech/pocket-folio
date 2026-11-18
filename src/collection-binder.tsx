import { Button } from '@astryxdesign/core/Button';
import { useShared } from '@void/react';
import { BookOpen, Plus, ZoomIn } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { CardStatusControl } from './app/card-status';
import {
  cardStatus,
  catalog as allCards,
  preferredPrinting,
  type CollectionDocument,
  type Command,
} from './app/model';
import { useWorkspace, type Shared } from './app/workspace';
import { AutoLoad } from './auto-load';
import { languageName, type BinderCard, type BinderSet } from './binder-catalog';
import { CardScan, cardLightEvents } from './card-scan';
import { CardSearch } from './card-search';
import { CardDataSource, CardDataSourceView } from './card-search-data';
import { catalogLanguages, catalogSets, groupSetsByYear } from './catalog-navigation';
import { CatalogOwnershipToggle, useCatalogOwnership } from './catalog-ownership';
import { cardRarityKey, groupRarities, rarityLabel } from './catalog-rarity';
import { CardName } from './i18n/card-language';
import { useCardTextOptions } from './i18n/card-language-preference';
import { text } from './i18n/text';
import { Select } from './select';
import { cardHref, useCardPreview, useShareParam } from './share-url';
const NewBinderDialog = lazy(async () => ({
  default: (await import('./app/new-binder')).NewBinderDialog,
}));
const CardPreview = lazy(async () => ({
  default: (await import('./binder-card-preview')).BinderCardPreview,
}));
export function CollectionBinder({ collection }: { collection?: BinderSet }) {
  const { user } = useShared<Shared>();
  return user ? (
    <OwnedCatalog collection={collection} />
  ) : (
    <Catalog collection={collection} ownership={{}} />
  );
}
function OwnedCatalog({ collection }: { collection?: BinderSet }) {
  const { dispatch, document } = useWorkspace();
  return <Catalog collection={collection} dispatch={dispatch} ownership={document.ownership} />;
}
function Catalog({
  collection,
  dispatch,
  ownership,
}: {
  collection?: BinderSet;
  dispatch?: (command: Command) => Promise<void>;
  ownership: CollectionDocument['ownership'];
}) {
  const [creating, setCreating] = useState(false);
  const { showOwnership } = useCatalogOwnership();
  const ownershipVisible = Boolean(dispatch && showOwnership);
  const [limit, setLimit] = useState(60);
  const [search, setSearch] = useShareParam('q');
  const [language, setLanguage] = useShareParam(
    'lang',
    '',
    (value) => !collection && catalogLanguages.some((lang) => lang === value),
  );
  const availableSets = useMemo(
    () => catalogSets.filter((set) => !language || set.language === language),
    [language],
  );
  const yearGroups = useMemo(() => groupSetsByYear(availableSets), [availableSets]);
  const [setId, setSetId] = useShareParam(
    'set',
    '',
    (value) => !collection && availableSets.some((set) => set.id === value),
  );
  const selectedCollection = collection ?? availableSets.find((set) => set.id === setId);
  const title = collection?.label ?? text('Cards');
  const cards = useMemo(
    () =>
      selectedCollection
        ? selectedCollection.cards.map((card) => ({ ...card, setName: selectedCollection.label }))
        : language
          ? allCards.filter((card) => card.language === language)
          : allCards,
    [language, selectedCollection],
  );
  const [preview, setPreview] = useCardPreview();
  const rarityGroups = useMemo(() => groupRarities(cards), [cards]);
  const [rarity, setRarity] = useShareParam('rarity');
  const activeRarity = rarityGroups.some(({ rarities }) =>
    rarities.some(({ value }) => value === rarity),
  )
    ? rarity
    : '';
  // Clear a stale selection when navigating to a set without that rarity.
  useEffect(() => {
    if (rarity !== activeRarity) {
      setRarity(activeRarity);
    }
  }, [rarity, activeRarity, setRarity]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useShareParam('status', 'all', (value) =>
    ['missing', 'wishlist', 'purchased', 'owned'].includes(value),
  );
  const [markingAll, setMarkingAll] = useState(false);
  const printingFor = (card: BinderCard) => preferredPrinting(card, ownership);
  const accepts = useMemo(
    () =>
      activeRarity || (ownershipVisible && filter !== 'all')
        ? (card: BinderCard) =>
            (!activeRarity || cardRarityKey(card) === activeRarity) &&
            (!ownershipVisible ||
              filter === 'all' ||
              cardStatus(ownership[preferredPrinting(card, ownership)]) === filter)
        : undefined,
    [activeRarity, filter, ownership, ownershipVisible],
  );
  const cardTextOptions = useCardTextOptions();
  const source = useMemo(
    () => new CardDataSource(cards, undefined, cardTextOptions),
    [cards, cardTextOptions],
  );
  const suggestions = useMemo(() => new CardDataSourceView(source, accepts, 12), [source, accepts]);
  const visible = useMemo(() => {
    const matches = search.trim() ? source.getQueryResults(search).map(({ data }) => data) : cards;
    return accepts ? matches.filter(accepts) : matches;
  }, [cards, search, source, accepts]);
  const ownedCount = useMemo(
    () => cards.filter((card) => ownership[preferredPrinting(card, ownership)] === true).length,
    [cards, ownership],
  );
  const run = async (command: Command) => {
    try {
      await dispatch?.(command);
      setError('');
    } catch (error_) {
      setError(String(error_));
    }
  };
  return (
    <main className="shell catalog catalog-overview">
      <div className="catalog-heading">
        <div className="intro-copy">
          <h1>{title}</h1>
        </div>
      </div>
      <div className="catalog-set-picker catalog-card-picker">
        <CardSearch
          cards={cards}
          dataSource={suggestions}
          onChange={(value) => {
            setSearch(value);
            setLimit(60);
          }}
          onSelect={setPreview}
          placeholder={collection || language || setId ? undefined : text('Search all cards')}
          value={search}
        />
        {!collection && (
          <>
            <Select
              aria-label={text('Card language')}
              onChange={(event) => {
                const value = event;
                setLanguage(value);
                if (value && selectedCollection?.language !== value) {
                  setSetId('');
                }
                setLimit(60);
              }}
              value={language}
            >
              <option value="">{text('All languages')}</option>
              {catalogLanguages.map((value) => (
                <option key={value} value={value}>
                  {languageName(value)}
                </option>
              ))}
            </Select>
            <Select
              aria-label={text('Card sets')}
              onChange={(event) => {
                setSetId(event);
                setLimit(60);
              }}
              value={setId}
            >
              <option value="">{text('All sets')}</option>
              {yearGroups.map(({ sets, year }) => (
                <optgroup key={year} label={String(year)}>
                  {sets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.label} · {languageName(set.language)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </>
        )}
        <Select
          aria-label={text('Filter by rarity')}
          className="catalog-rarity-filter"
          onChange={(value) => {
            setRarity(value);
            setLimit(60);
          }}
          value={activeRarity}
        >
          <option value="">{text('All rarities')}</option>
          {rarityGroups.map(({ language: rarityLanguage, rarities }) => {
            const options = rarities.map(({ rarity, value }) => (
              <option key={value} value={value}>
                {rarityLabel(rarity)}
                {rarityGroups.length > 1 ? ` · ${languageName(rarityLanguage)}` : ''}
              </option>
            ));
            return rarityGroups.length > 1 ? (
              <optgroup key={rarityLanguage} label={languageName(rarityLanguage)}>
                {options}
              </optgroup>
            ) : (
              options
            );
          })}
        </Select>
        {collection && (
          <div className="language catalog-set-meta">
            <span aria-hidden="true" className={`flag flag-${collection.language}`} />
            {languageName(collection.language)} {text('Pokémon cards ·')} {collection.releaseYear}
          </div>
        )}
      </div>
      {dispatch && (
        <div className="catalog-secondary-toolbar">
          {collection && (
            <Button
              className="primary-button"
              label={text('Create binder')}
              onClick={() => setCreating(true)}
              type="button"
              variant="primary"
            >
              <Plus size={17} />
              {text('Create binder')}
            </Button>
          )}
          <CatalogOwnershipToggle>
            {ownershipVisible && (
              <Select
                aria-label={text('Filter by ownership')}
                className="catalog-ownership-filter"
                onChange={(value) => {
                  setFilter(value);
                  setLimit(60);
                }}
                size="sm"
                value={filter}
              >
                {['all', 'missing', 'wishlist', 'purchased', 'owned'].map((value) => (
                  <option key={value} value={value}>
                    {text(value[0].toUpperCase() + value.slice(1))}
                  </option>
                ))}
              </Select>
            )}
          </CatalogOwnershipToggle>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <ul className="binder-grid">
        {visible.slice(0, limit).map((card) => (
          <li
            className={`binder-card${!ownershipVisible || ownership[printingFor(card)] === true ? ' binder-card-owned' : ''}${ownershipVisible && ownership[printingFor(card)] === 'purchased' ? ' binder-card-purchased' : ''}`}
            key={card.id}
            {...cardLightEvents}
          >
            <a
              aria-label={`View ${card.english}`}
              className="binder-artwork"
              href={cardHref(card.id)}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
                  return;
                }
                event.preventDefault();
                setPreview(card);
              }}
            >
              <CardScan foil={card.foil} image={card.image} lazy />
              <span aria-hidden="true" className="binder-zoom">
                <ZoomIn size={15} />
              </span>
            </a>
            <div className="binder-card-names">
              <div className="binder-card-title">
                <CardName as="h3" card={card} />
                <span className="catalog-card-number">
                  <span className="card-number">{card.number ?? text('Unnumbered')}</span>
                  {dispatch && (
                    <span
                      aria-hidden={!ownershipVisible}
                      className="catalog-card-status"
                      data-visible={ownershipVisible}
                      inert={!ownershipVisible}
                    >
                      <CardStatusControl
                        compact
                        name={`${card.english} ${card.number ?? text('Energy')}`}
                        onChange={(status) =>
                          run({ printing: printingFor(card), status, type: 'ownership.status' })
                        }
                        status={cardStatus(ownership[printingFor(card)])}
                      />
                    </span>
                  )}
                </span>
              </div>
              <CardName as="p" card={card} secondary />
              {!collection && (
                <small className="binder-card-set">
                  {card.setName} · {languageName(card.language)}
                </small>
              )}
              {card.imageLanguage && card.imageLanguage !== card.language && (
                <small className="scan-language-note">{text('English reference scan')}</small>
              )}
              {card.tag && <span className="binder-promo">{card.tag}</span>}
            </div>
          </li>
        ))}
      </ul>
      {visible.length > limit && (
        <AutoLoad onLoad={() => setLimit((value) => Math.min(value + 60, visible.length))} />
      )}
      {!visible.length && (
        <p className="empty">{text('No matching cards in the current catalog.')}</p>
      )}
      {dispatch && ownershipVisible && (
        <div className="binder-bottom-actions catalog-summary">
          <div className="progress-card">
            <div className="progress-label">
              <BookOpen aria-hidden="true" size={17} />
              {text('Collection progress')}
            </div>
            <div className="progress-count">
              <strong>{ownedCount}</strong>
              <span>
                {' '}
                / {cards.length} {text('owned')}
              </span>
            </div>
            <progress aria-label={`${title} cards owned`} max={cards.length} value={ownedCount} />
          </div>
          <Button
            isDisabled={!visible.length || markingAll}
            label={text('Mark all as owned')}
            onClick={async () => {
              setMarkingAll(true);
              setError('');
              try {
                const printings = visible.map(printingFor);
                for (let index = 0; index < printings.length; index += 2000) {
                  await dispatch({
                    owned: true,
                    printings: printings.slice(index, index + 2000),
                    type: 'ownership.bulk',
                  });
                }
              } catch (error_) {
                setError(String(error_));
              } finally {
                setMarkingAll(false);
              }
            }}
            type="button"
          >
            {text('Mark all as owned')}
          </Button>
        </div>
      )}
      {creating && dispatch && collection && (
        <Suspense>
          <NewBinderDialog
            close={() => setCreating(false)}
            dispatch={dispatch}
            ownership={ownership}
            presetId={collection.id}
          />
        </Suspense>
      )}
      {preview && (
        <Suspense>
          <CardPreview
            actions={
              dispatch ? (
                <CardStatusControl
                  name={`${preview.english} ${preview.number ?? text('Energy')}`}
                  onChange={(status) =>
                    run({ printing: printingFor(preview), status, type: 'ownership.status' })
                  }
                  status={cardStatus(ownership[printingFor(preview)])}
                />
              ) : undefined
            }
            card={preview}
            close={() => setPreview(undefined)}
          />
        </Suspense>
      )}
    </main>
  );
}
