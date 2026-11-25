import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { Switch } from '@astryxdesign/core/Switch';
import { Link } from '@void/react';
import { Check, LayoutGrid, BookOpen, Plus, Settings2, Share2, Trash2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore, use } from 'react';
import { AutoLoad } from '../auto-load';
import type { BinderCard } from '../binder-catalog';
import { binderCollections, languageName } from '../binder-catalog';
import { useMissingArtwork } from '../binder-preferences';
import { CardScan, cardLightEvents } from '../card-scan';
import { CardSearch } from '../card-search';
import { CardDataSource } from '../card-search-data';
import { CardName } from '../i18n/card-language';
import { useCardTextOptions } from '../i18n/card-language-preference';
import { text } from '../i18n/text';
import { MissingCardArtwork } from '../missing-card-artwork';
import { pickerSearchData } from '../picker-search-data';
import { Select } from '../select';
import { SetSearch } from '../set-search';
import { useCardPreview, useShareParam } from '../share-url';
import { TextField, Checkbox } from '../ui/fields';
import { FormStack } from '../ui/form-stack';
import { BinderColorDisplay } from './binder-color-display';
import { BinderColorPicker } from './binder-color-picker';
import { CardStatusControl } from './card-status';
import { Dialog } from './dialog';
import { Loading } from './loading';
import {
  catalog,
  binderColorSchema,
  binderLayouts,
  binderPreset,
  cardStatus,
  type CardStatus,
  defaultPrinting,
  editionLabel,
  printingId,
  pocketOpeningSchema,
  splitPrinting,
  type CollectionDocument,
  type Command,
  type Edition,
  type PersonalBinder,
} from './model';
import { MoveCard } from './move-card';
import { PageActions } from './page-actions';
import { PocketOpeningPicker } from './pocket-opening-picker';
import { RemovePageDialog } from './remove-page';
import { useWorkspace } from './workspace';
const PhysicalBinder = lazy(async () => ({
  default: (await import('../physical-binder')).PhysicalBinder,
}));
import { BinderCardPreview as CardPreview } from '../binder-card-preview';

export function BinderEditor({ id }: { id: string }) {
  const { dispatch, document, ensureBinder, pending } = useWorkspace();
  const ready = ensureBinder(id);
  if (ready) {
    use(ready);
  }
  const binder = document.binders.find((item) => item.id === id);
  return binder ? (
    <BinderView
      binder={binder}
      dispatch={dispatch}
      ownership={document.ownership}
      pending={pending}
    />
  ) : (
    <main className="shell empty">
      <h1>{text('Binder not found')}</h1>
      <Link href="/">{text('Back to your binders')}</Link>
    </main>
  );
}

export function BinderView({
  binder,
  dispatch,
  ownership,
  pending = 0,
}: {
  binder: PersonalBinder;
  dispatch?: (command: Command) => Promise<void>;
  ownership: CollectionDocument['ownership'];
  pending?: number;
}) {
  const [layout, setLayout] = useShareParam('view', 'book', (value) => value === 'grid');
  const [reveal] = useMissingArtwork();
  const [search, setSearch] = useShareParam('q');
  const [filter, setFilter] = useShareParam('status', 'all', (value) =>
    ['missing', 'wishlist', 'purchased', 'owned'].includes(value),
  );
  const [controls, setControls] = useState<HTMLDivElement | null>(null);
  const [preview, setPreview] = useCardPreview();
  const [slot, setSlot] = useState<number>();
  const [settings, setSettings] = useState(false);
  const [removingPage, setRemovingPage] = useState<PersonalBinder>();
  const [pageRequest, setPageRequest] = useState<number>();
  const [sharing, setSharing] = useState(false);
  const [savingShare, setSavingShare] = useState(false);
  const [shareExpanded, setShareExpanded] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const capacity = binder.columns * binder.rows;
  const cards = useMemo(
    () =>
      Array.from(
        { length: Math.max(capacity, Math.ceil(binder.slots.length / capacity) * capacity) },
        (_, slotIndex) => {
          const id = binder.slots[slotIndex];
          const card = id ? splitPrinting(id).card : undefined;
          return card ? { ...card, printingId: id!, slotIndex } : undefined;
        },
      ),
    [binder.slots, capacity],
  );
  const occupied = useMemo(
    () => cards.filter((card): card is NonNullable<typeof card> => Boolean(card)),
    [cards],
  );
  const owned = useMemo(
    () => new Set(Object.keys(ownership).filter((id) => ownership[id] === true)),
    [ownership],
  );
  const purchased = useMemo(
    () => new Set(Object.keys(ownership).filter((id) => ownership[id] === 'purchased')),
    [ownership],
  );
  const wishlist = useMemo(
    () => new Set(Object.keys(ownership).filter((id) => ownership[id] === 'wishlist')),
    [ownership],
  );
  const eligible = useMemo(
    () =>
      occupied.filter(
        (card) => filter === 'all' || cardStatus(ownership[card.printingId]) === filter,
      ),
    [occupied, filter, ownership],
  );
  const cardTextOptions = useCardTextOptions();
  const source = useMemo(
    () => new CardDataSource(eligible, undefined, cardTextOptions),
    [eligible, cardTextOptions],
  );
  const matches = search.trim() ? source.getQueryResults(search).map(({ data }) => data) : eligible;
  const filtered = Boolean(search.trim() || filter !== 'all');
  const setIds = new Set(occupied.map((card) => card.setId));
  const releaseYear =
    setIds.size === 1
      ? binderCollections.find((set) => set.id === occupied[0]?.setId)?.releaseYear
      : undefined;
  const collection = useMemo(
    () => ({
      cards,
      color: binder.color,
      columns: binder.columns,
      doubleSided: binder.doubleSided,
      id: binder.id,
      label: binder.name,
      language: 'mixed' as const,
      pocketOpening: binder.pocketOpening,
      releaseYear,
      rows: binder.rows,
      showAllCardsInColor: binder.showAllCardsInColor,
    }),
    [
      binder.id,
      binder.name,
      binder.color,
      binder.columns,
      binder.rows,
      binder.doubleSided,
      binder.pocketOpening,
      binder.showAllCardsInColor,
      cards,
      releaseYear,
    ],
  );
  const run = async (command: Command) => {
    try {
      await dispatch?.(command);
      setError('');
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : text('Could not save this change.'));
      throw error_;
    }
  };
  const setStatus = dispatch
    ? (card: BinderCard, status: CardStatus) =>
        run({
          printing: card.printingId!,
          status,
          type: 'ownership.status',
        })
    : undefined;
  const pageActions = dispatch ? (
    <PageActions
      add={async () => {
        await run({ binderId: binder.id, type: 'binder.page' });
        setPageRequest(cards.length);
      }}
      canRemove={cards.length > capacity}
      remove={() => setRemovingPage(structuredClone(binder))}
    />
  ) : undefined;
  const shareUrl = (() => {
    if (!binder.shareToken || !sharing) {
      return '';
    }
    const url = new URL(`/b/${binder.shareToken}`, location.origin);
    const current = new URLSearchParams(location.search);
    for (const name of ['page', 'view', 'q', 'status']) {
      const value = current.get(name);
      if (value && (name !== 'page' || Number(value) > 1)) {
        url.searchParams.set(name, value);
      }
    }
    if (shareExpanded && layout === 'book') {
      url.searchParams.set('expanded', '1');
    }
    return url.href;
  })();
  const previewPrinting = preview?.printingId ? splitPrinting(preview.printingId) : undefined;
  return (
    <main className="shell binder-editor">
      <div className="intro binder-intro editor-heading">
        <div>
          <h1>{binder.name}</h1>
          <span className="muted">
            {occupied.filter((card) => owned.has(card.printingId)).length} / {occupied.length}{' '}
            {text('owned')}
            {occupied.some((card) => purchased.has(card.printingId)) &&
              ` · ${occupied.filter((card) => purchased.has(card.printingId)).length} ${text('Purchased')}`}
          </span>
        </div>
        <Stack align="center" className="editor-actions" direction="horizontal" gap={4} wrap="wrap">
          {dispatch && (
            <>
              <Button
                aria-label={text('Binder settings')}
                className="control-icon"
                label={text('Binder settings')}
                onClick={() => setSettings(true)}
                type="button"
              >
                <Settings2 size={17} />
              </Button>
              <Button label={text('Share')} onClick={() => setSharing(true)} type="button">
                <Share2 size={16} />
                {text('Share')}
              </Button>
            </>
          )}
          <div aria-label={text('Collection layout')} className="segments" role="group">
            {(['book', 'grid'] as const).map((value) => (
              <Button
                aria-pressed={layout === value}
                key={value}
                label={value === 'book' ? text('Binder') : text('Grid')}
                onClick={() => setLayout(value)}
                type="button"
              >
                {value === 'book' ? <BookOpen size={16} /> : <LayoutGrid size={16} />}
                {value === 'book' ? text('Binder') : text('Grid')}
              </Button>
            ))}
          </div>
        </Stack>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className={`toolbar${layout === 'book' ? ' binder-toolbar-book' : ''}`}>
        {layout === 'book' ? (
          <div className="binder-search-results" ref={setControls} />
        ) : (
          <CardSearch cards={eligible} onChange={setSearch} onSelect={setPreview} value={search} />
        )}
        <div className="segments">
          {['all', 'missing', 'wishlist', 'purchased', 'owned'].map((value) => (
            <Button
              aria-pressed={filter === value}
              key={value}
              label={text(value[0].toUpperCase() + value.slice(1))}
              onClick={() => setFilter(value)}
              type="button"
            >
              {text(value[0].toUpperCase() + value.slice(1))}
            </Button>
          ))}
        </div>
        {layout === 'grid' && pageActions}
      </div>
      {layout === 'book' ? (
        <Suspense fallback={<Loading className="empty">{text('Opening your binder…')}</Loading>}>
          <PhysicalBinder
            collection={collection}
            editSlot={dispatch ? setSlot : undefined}
            key={`${binder.id}:${binder.rows}:${binder.columns}:${binder.doubleSided}`}
            matches={filtered ? matches : undefined}
            onPageRequestHandled={() => setPageRequest(undefined)}
            open={setPreview}
            owned={owned}
            pageActions={pageActions}
            pageRequest={pageRequest}
            purchased={purchased}
            search={search}
            searchCards={eligible}
            searchControls={controls}
            setSearch={setSearch}
            setStatus={setStatus}
            wishlist={wishlist}
          />
        </Suspense>
      ) : (
        <ol className="binder-grid personal-grid">
          {cards.map((card, index) => {
            if (filtered && (!card || !matches.includes(card))) {
              return null;
            }
            return (
              <li
                className={`binder-card${binder.showAllCardsInColor ? ' binder-card-full-color' : ''}${card && owned.has(card.printingId) ? ' binder-card-owned' : ''}${card && purchased.has(card.printingId) ? ' binder-card-purchased' : ''}${card && wishlist.has(card.printingId) ? ' binder-card-wishlist' : ''}`}
                key={index}
                {...cardLightEvents}
              >
                {card ? (
                  <>
                    <button
                      aria-label={`View ${card.english} in pocket ${index + 1}`}
                      className="binder-artwork"
                      onClick={() => setPreview(card)}
                      type="button"
                    >
                      {!binder.showAllCardsInColor &&
                      !reveal &&
                      cardStatus(ownership[card.printingId]) === 'missing' ? (
                        <MissingCardArtwork card={card} reveal={false} />
                      ) : (
                        <CardScan foil={card.foil} image={card.image} lazy />
                      )}
                    </button>
                    <div className="binder-card-names">
                      <div className="binder-card-title">
                        <CardName as="h3" card={card} />
                        <span className="card-number">{card.number ?? text('Unnumbered')}</span>
                      </div>
                      <CardName as="p" card={card} secondary />
                      <small>
                        {editionLabel(splitPrinting(card.printingId).edition)} · {text('Pocket')}{' '}
                        {index + 1}
                      </small>
                    </div>
                    <CardStatusControl
                      name={`${card.english} ${card.number ?? text('Energy')}`}
                      onChange={setStatus ? (status) => setStatus(card, status) : undefined}
                      status={cardStatus(ownership[card.printingId])}
                    />
                  </>
                ) : dispatch ? (
                  <button
                    aria-label={`Add card to pocket ${index + 1}`}
                    className="grid-add"
                    onClick={() => setSlot(index)}
                    type="button"
                  >
                    <Plus size={28} />
                  </button>
                ) : (
                  <div aria-label={text('Empty pocket')} className="grid-add" />
                )}
                {!card && (
                  <div className="binder-card-names">
                    <small>
                      {text('Pocket')} {index + 1}
                    </small>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {dispatch && (
        <Stack
          align="center"
          className="binder-bottom-actions"
          direction="horizontal"
          gap={4}
          wrap="wrap"
        >
          <Button
            isDisabled={!matches.some((card) => !owned.has(card.printingId))}
            label={text('Mark all as owned')}
            onClick={() =>
              void run({
                owned: true,
                printings: matches.map((card) => card.printingId),
                type: 'ownership.bulk',
              }).catch(() => {})
            }
            type="button"
          >
            <Check size={17} />
            {text('Mark all as owned')}
          </Button>
        </Stack>
      )}
      {preview && (
        <CardPreview
          actions={
            <Stack className="card-management" gap={3}>
              <span>
                {previewPrinting && editionLabel(previewPrinting.edition)} ·{' '}
                {languageName(preview.language)}
              </span>
              {dispatch && (
                <>
                  <CardStatusControl
                    name={`${preview.english} ${preview.number ?? text('Energy')}`}
                    onChange={(status) => setStatus!(preview, status)}
                    status={cardStatus(ownership[preview.printingId!])}
                  />
                  <MoveCard
                    from={preview.slotIndex!}
                    key={preview.slotIndex}
                    move={async (to) => {
                      await run({
                        binderId: binder.id,
                        from: preview.slotIndex!,
                        to,
                        type: 'binder.move',
                      });
                      setPreview(undefined);
                    }}
                    slots={binder.slots}
                  />
                  <Stack
                    align="center"
                    className="card-management-buttons"
                    direction="horizontal"
                    gap={4}
                    wrap="wrap"
                  >
                    <Button
                      label={text('Replace')}
                      onClick={() => {
                        setSlot(preview.slotIndex);
                        setPreview(undefined);
                      }}
                      type="button"
                    >
                      {text('Replace')}
                    </Button>
                    <Button
                      label={text('Remove from binder')}
                      onClick={() =>
                        void run({
                          binderId: binder.id,
                          position: preview.slotIndex!,
                          printing: null,
                          type: 'binder.slot',
                        })
                          .then(() => setPreview(undefined))
                          .catch(() => {})
                      }
                      type="button"
                    >
                      <Trash2 size={14} />
                      {text('Remove from binder')}
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          }
          card={preview}
          close={() => setPreview(undefined)}
        />
      )}
      {slot !== undefined && dispatch && (
        <CardPicker
          choose={async (printing, status) => {
            await run({
              binderId: binder.id,
              position: slot,
              printing,
              status,
              type: 'binder.slot',
            });
            setSlot(undefined);
          }}
          close={() => setSlot(undefined)}
        />
      )}
      {removingPage && dispatch && (
        <RemovePageDialog
          binder={removingPage}
          close={() => setRemovingPage(undefined)}
          save={run}
        />
      )}
      {settings && dispatch && (
        <BinderSettings
          binder={binder}
          close={() => setSettings(false)}
          save={async (command) => {
            await run(command);
            setSettings(false);
          }}
        />
      )}
      {sharing && dispatch && (
        <Dialog close={() => setSharing(false)} title={text('Share this binder')}>
          <p>
            {text(
              'Anyone with the link can browse this binder. They can’t edit it or see your other binders.',
            )}
          </p>
          <Switch
            label={text('Open expanded view')}
            onChange={(value) => {
              setShareExpanded(value);
              setCopied(false);
            }}
            value={shareExpanded}
          />
          <TextField
            isReadOnly
            label={text('Read-only link')}
            onFocus={(event) => {
              if (event.target.tagName === 'INPUT') {
                (event.target as HTMLInputElement).select();
              }
            }}
            value={shareUrl}
          />
          <Stack className="binder-share-actions" direction="horizontal" gap={3}>
            <Button
              className="primary-button"
              isDisabled={savingShare || pending > 0}
              label={text(!shareUrl ? 'Create share link' : copied ? 'Copied' : 'Copy link')}
              onClick={async () => {
                if (shareUrl) {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                  return;
                }
                setSavingShare(true);
                setCopied(false);
                try {
                  await run({
                    binderId: binder.id,
                    token: crypto.randomUUID(),
                    type: 'binder.share',
                  });
                } catch {
                  // run exposes mutation failures in the editor.
                } finally {
                  setSavingShare(false);
                }
              }}
              type="button"
              variant="primary"
            >
              <span aria-hidden="true" className="binder-share-label">
                {(['Create share link', 'Copy link', 'Copied'] as const).map((label) => (
                  <span
                    data-visible={
                      label === (!shareUrl ? 'Create share link' : copied ? 'Copied' : 'Copy link')
                    }
                    key={label}
                  >
                    {text(label)}
                  </span>
                ))}
              </span>
            </Button>
            <Button
              className="text-button"
              isDisabled={!shareUrl || savingShare || pending > 0}
              label={text('Stop sharing')}
              onClick={async () => {
                setSavingShare(true);
                setCopied(false);
                try {
                  await run({ binderId: binder.id, token: null, type: 'binder.share' });
                } catch {
                  // run exposes mutation failures in the editor.
                } finally {
                  setSavingShare(false);
                }
              }}
              type="button"
              variant="ghost"
            >
              {text('Stop sharing')}
            </Button>
          </Stack>
        </Dialog>
      )}
    </main>
  );
}

function BinderSettings({
  binder,
  close,
  save,
}: {
  binder: PersonalBinder;
  close: () => void;
  save: (command: Command) => Promise<void>;
}) {
  const preset = binderPreset(binder);
  const [fullColor, setFullColor] = useState(binder.showAllCardsInColor ?? false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <Dialog className="binder-settings-dialog" close={close} title="Binder settings" wide>
      <FormStack
        className="binder-settings-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const form = new FormData(event.currentTarget);
          const [columns, rows] = String(form.get('layout')).split('x').map(Number);
          try {
            await save({
              binderId: binder.id,
              color: binderColorSchema.parse(form.get('color')),
              columns,
              coverSetId: preset && form.has('setCover') ? preset.id : null,
              doubleSided: form.has('doubleSided'),
              name: String(form.get('name')),
              pocketOpening: pocketOpeningSchema.parse(form.get('pocketOpening')),
              rows,
              showAllCardsInColor: fullColor,
              type: 'binder.settings',
            });
          } catch (error_) {
            setError(String(error_));
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="binder-settings-fields">
          <Stack direction="vertical" gap={4}>
            <TextField
              defaultValue={binder.name}
              htmlName="name"
              isRequired
              label={text('Name')}
              maxLength={80}
            />
            {preset && (
              <Checkbox
                defaultValue={Boolean(binder.coverSetId)}
                htmlName="setCover"
                label={text('Use set artwork for cover')}
              />
            )}

            <Select
              defaultValue={`${binder.columns}x${binder.rows}`}
              label={text('Page layout')}
              name="layout"
            >
              {binderLayouts.map(([columns, rows]) => (
                <option key={`${columns}x${rows}`} value={`${columns}x${rows}`}>
                  {columns} × {rows} · {columns * rows} {text('pockets')}
                </option>
              ))}
            </Select>

            <Checkbox
              defaultValue={binder.doubleSided}
              htmlName="doubleSided"
              label={text('Cards on both sides')}
            />
            <p className="muted">
              {text('Card order and empty pockets stay in place when changing layout.')}
            </p>
          </Stack>
          <Stack direction="vertical" gap={4}>
            <h3>{text('Appearance')}</h3>
            <BinderColorPicker value={binder.color} />
            <PocketOpeningPicker value={binder.pocketOpening} />
            <BinderColorDisplay binder={binder} onChange={setFullColor} value={fullColor} />
          </Stack>
        </div>
        {error && <p role="alert">{error}</p>}
        <footer className="binder-settings-footer">
          <Button
            className="danger-button"
            isDisabled={pending}
            label={text('Delete binder')}
            onClick={async () => {
              if (confirm(`Delete “${binder.name}”? Your card ownership will be kept.`)) {
                await save({ binderId: binder.id, type: 'binder.delete' });
                location.assign('/');
              }
            }}
            type="button"
            variant="destructive"
          >
            <Trash2 aria-hidden="true" size={16} />
            {text('Delete binder')}
          </Button>
          <Button
            className="primary-button"
            isDisabled={pending}
            label={text('Save settings')}
            type="submit"
            variant="primary"
          >
            {text('Save settings')}
          </Button>
        </footer>
      </FormStack>
    </Dialog>
  );
}

const noSubscription = () => () => {};

function CardPicker({
  choose,
  close,
}: {
  choose: (printing: string, status: CardStatus) => Promise<void>;
  close: () => void;
}) {
  const [search, setSearch] = useState('');
  const [set, setSet] = useState('');
  const [edition, setEdition] = useState<Edition>('unlimited');
  const [status, setStatus] = useState<CardStatus>('owned');
  const [limit, setLimit] = useState(48);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const eligible = useMemo(
    () => (set ? catalog.filter((card) => card.setId === set) : catalog),
    [set],
  );
  const cardTextOptions = useCardTextOptions();
  const sources = useMemo(
    () => pickerSearchData(eligible, cardTextOptions),
    [eligible, cardTextOptions],
  );
  const source = sources.all;
  useEffect(() => {
    void sources.prepare();
  }, [sources]);
  useSyncExternalStore(
    search.trim() ? source.subscribe : noSubscription,
    source.getSnapshot,
    source.getSnapshot,
  );
  const cards = search.trim() ? source.getQueryResults(search).map(({ data }) => data) : eligible;
  const insert = async (card: (typeof catalog)[number]) => {
    if (pending) {
      return;
    }
    setPending(true);
    try {
      await choose(
        !card.editions.includes(edition) ? defaultPrinting(card) : printingId(card.id, edition),
        status,
      );
    } catch (error_) {
      setError(String(error_));
    } finally {
      setPending(false);
    }
  };
  return (
    <Dialog
      close={close}
      title="Choose a card"
      toolbar={
        <div className="picker-toolbar">
          <CardSearch
            autoFocus
            cards={eligible}
            dataSource={sources.suggestions}
            disabled={pending}
            label={text('Find a card')}
            onChange={(value) => {
              setSearch(value);
              setLimit(48);
            }}
            onSelect={(card) => {
              void insert(card);
            }}
            placeholder={text('Search names or numbers')}
            value={search}
          />
          <SetSearch
            onSelect={(id) => {
              setSet(id);
              setLimit(48);
            }}
            value={set}
          />
          <Select
            aria-label={text('Card edition')}
            className="edition-select"
            onChange={(event) => setEdition(event as Edition)}
            value={edition}
          >
            <option value="unlimited">{text('Unlimited')}</option>
            <option value="first">{text('1st Edition')}</option>
            <option value="unspecified">{text('Edition unspecified')}</option>
          </Select>
          <CardStatusControl
            name="new card"
            onChange={async (value) => setStatus(value)}
            status={status}
          />
        </div>
      }
      wide
    >
      {error && <p role="alert">{error}</p>}
      <div className="picker-cards">
        {cards.slice(0, limit).map((card) => (
          <button
            aria-label={`Insert ${card.localName} ${card.number ?? ''}`}
            className="picker-card"
            {...cardLightEvents}
            disabled={pending}
            key={card.id}
            onClick={() => {
              void insert(card);
            }}
            type="button"
          >
            <CardScan foil={card.foil} image={card.image} lazy />
            <CardName as="strong" card={card} />
            <CardName card={card} secondary />
            <small>
              {card.setName} · {card.number ?? text('Energy')}
            </small>
            <small>
              {languageName(card.language)}
              {card.editions.some((value) => value !== 'unspecified') && (
                <>
                  {' '}
                  ·{' '}
                  {text(
                    editionLabel(card.editions.includes(edition) ? edition : card.defaultEdition),
                  )}
                </>
              )}
            </small>
            {card.imageLanguage && card.imageLanguage !== card.language && (
              <small>{text('English reference scan')}</small>
            )}
          </button>
        ))}
      </div>
      {!cards.length && (
        <p className="empty">{text('No matching cards in the current catalog.')}</p>
      )}
      {cards.length > limit && (
        <AutoLoad onLoad={() => setLimit((value) => Math.min(value + 48, cards.length))} />
      )}
    </Dialog>
  );
}
