import { Button } from '@astryxdesign/core/Button';
import { Stack } from '@astryxdesign/core/Stack';
import { ArrowLeft, ArrowRight, BookOpen, Maximize2, Minimize2 } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal, flushSync } from 'react-dom';
import { CardStatusControl } from './app/card-status';
import { Loading } from './app/loading';
import type { CardStatus } from './app/model';
import { BinderCanvas, type BinderCanvasController } from './binder-canvas';
import type { BinderCard } from './binder-catalog';
import { binderColorStyle } from './binder-color';
import {
  binderPages,
  binderUnderlay,
  cardSpread,
  pageRange,
  spreadCount,
  type BinderPage,
  type BinderPresentation,
} from './binder-pages';
import { useMissingArtwork } from './binder-preferences';
import { cardAssetURL } from './card-assets';
import { CardScan, cardLightEvents } from './card-scan';
import { CardSearch } from './card-search';
import { clamp, type PageGrip } from './flexible-page-math';
import { text } from './i18n/text';
import { MissingCardArtwork } from './missing-card-artwork';
import { Select } from './select';
import { replaceParams } from './share-url';
import { useBinderFit } from './use-binder-fit';
import './physical-binder.css';

const narrowScreen =
  typeof window !== 'undefined' ? window.matchMedia('(max-width: 700px)') : undefined;
function subscribeToScreen(change: () => void) {
  narrowScreen?.addEventListener('change', change);
  return () => narrowScreen?.removeEventListener('change', change);
}

function CardBack({ card, className = '' }: { card: BinderCard; className?: string }) {
  return (
    <span className={`folio-card-back ${className}`} data-language={card.language}>
      <img
        alt=""
        crossOrigin="anonymous"
        src={cardAssetURL(
          card.language === 'ja'
            ? '/cards/japanese-card-sides.png'
            : '/cards/back-international.jpg',
        )}
      />
    </span>
  );
}

function Pocket({
  backCard,
  card,
  edit,
  fullColor = false,
  highlighted,
  open,
  owned,
  purchased,
  reveal,
  reverse = false,
  setStatus,
  wishlist,
}: {
  backCard?: BinderCard;
  card?: BinderCard;
  edit?: () => void;
  fullColor?: boolean;
  highlighted: boolean;
  open: (card: BinderCard) => void;
  owned: boolean;
  purchased: boolean;
  reveal: boolean;
  reverse?: boolean;
  setStatus?: (card: BinderCard, status: CardStatus) => Promise<void>;
  wishlist: boolean;
}) {
  if (reverse) {
    const showBack = card && (owned || purchased || wishlist);
    return (
      <li
        className={`folio-pocket${owned ? ' is-occupied is-owned' : purchased ? ' is-purchased' : wishlist ? ' is-wishlist' : ''}`}
        data-card-id={card?.id}
      >
        <span
          aria-label={showBack ? `${text('Back of')} ${card.english}` : text('Empty pocket')}
          className="folio-empty-pocket"
          role="img"
        >
          {showBack && (
            <CardBack
              card={card}
              className={fullColor || owned ? '' : purchased ? 'is-purchased' : 'is-wishlist'}
            />
          )}
        </span>
      </li>
    );
  }
  const visibleCard = card ?? backCard;
  const showBack = Boolean(backCard);
  return (
    <li
      className={`folio-pocket${owned || backCard ? ' is-occupied' : ''}${owned ? ' is-owned' : purchased ? ' is-purchased' : wishlist ? ' is-wishlist' : ''}${highlighted ? '' : ' is-muted'}`}
      data-back-card-id={backCard?.id}
      data-card-id={card?.id}
      {...cardLightEvents}
    >
      {visibleCard ? (
        <>
          <button
            aria-label={`${showBack ? text('Back of') : text('View')} ${(backCard ?? visibleCard).english} ${(backCard ?? visibleCard).number ?? text('Energy')}${showBack ? '' : owned ? ', owned' : purchased ? ', purchased' : wishlist ? ', wishlist' : ', missing'}`}
            className="folio-card"
            onClick={() => (card ? open(card) : edit ? edit() : open(visibleCard))}
            type="button"
          >
            {showBack ? (
              <CardBack card={backCard ?? visibleCard} />
            ) : owned || purchased || wishlist || fullColor ? (
              <span
                className={`folio-insert${owned || fullColor ? '' : purchased ? ' is-purchased' : ' is-wishlist'}`}
              >
                <CardScan foil={visibleCard.foil} image={visibleCard.image} />
              </span>
            ) : (
              <MissingCardArtwork card={visibleCard} reveal={reveal} />
            )}
          </button>
          <div className="folio-pocket-label">
            <span>{card ? (card.number ?? text('Energy')) : ''}</span>
            {edit && (
              <button
                aria-label={card ? text('Replace card') : text('Add card to pocket')}
                className="folio-edit"
                onClick={edit}
                type="button"
              >
                <span aria-hidden="true">…</span>
              </button>
            )}
            {card && (
              <CardStatusControl
                compact
                name={`${card.english} ${card.number ?? text('Energy')}`}
                onChange={setStatus ? (status) => setStatus(card, status) : undefined}
                status={
                  owned ? 'owned' : purchased ? 'purchased' : wishlist ? 'wishlist' : 'missing'
                }
              />
            )}
          </div>
        </>
      ) : (
        <>
          {edit ? (
            <button
              aria-label={text('Add card to pocket')}
              className="folio-empty-pocket folio-add"
              onClick={edit}
              type="button"
            >
              +
            </button>
          ) : (
            <span aria-label={text('Empty pocket')} className="folio-empty-pocket" />
          )}
        </>
      )}
    </li>
  );
}

const PageUnderlay = memo(function PageUnderlay({
  collection,
  owned,
  page,
  purchased,
  wishlist,
}: {
  collection: BinderPresentation;
  owned: ReadonlySet<string>;
  page: BinderPage;
  purchased: ReadonlySet<string>;
  wishlist: ReadonlySet<string>;
}) {
  const reverse = page.kind === 'reverse';
  const fullColor = collection.showAllCardsInColor;
  const cards = useMemo(
    () =>
      binderUnderlay(
        collection.cards,
        page,
        (card) => {
          const id = card.printingId ?? card.id;
          return (
            owned.has(id) || purchased.has(id) || wishlist.has(id) || Boolean(fullColor && !reverse)
          );
        },
        collection.columns,
        collection.rows,
      ),
    [
      collection.cards,
      collection.columns,
      collection.rows,
      page,
      owned,
      purchased,
      wishlist,
      fullColor,
      reverse,
    ],
  );
  if (!cards.some(Boolean)) {
    return null;
  }
  return (
    <div aria-hidden="true" className="folio-page folio-stack-page" inert>
      <ol className="folio-pockets">
        {cards.map((entry, pocket) => {
          const id = entry?.card.printingId ?? entry?.card.id;
          const appearance =
            fullColor || (id && owned.has(id))
              ? ''
              : id && purchased.has(id)
                ? 'is-purchased'
                : 'is-wishlist';
          return (
            <li className="folio-pocket" key={pocket}>
              <span className="folio-empty-pocket">
                {entry && (
                  <span
                    className="folio-stack-artwork"
                    data-stack-slot={entry.slot}
                    key={entry.slot}
                    style={{ opacity: 0.94 ** Math.min(entry.depth, 12) }}
                  >
                    {reverse ? (
                      <CardBack card={entry.card} className={appearance} />
                    ) : (
                      <span className={`folio-insert ${appearance}`}>
                        <CardScan image={entry.card.image} />
                      </span>
                    )}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
});

const Page = memo(function Page({
  collection,
  editSlot,
  matches,
  open,
  owned,
  page,
  purchased,
  reveal,
  setStatus,
  wishlist,
}: {
  collection: BinderPresentation;
  editSlot?: (index: number) => void;
  matches?: ReadonlySet<string>;
  open: (card: BinderCard) => void;
  owned: ReadonlySet<string>;
  page: BinderPage;
  purchased: ReadonlySet<string>;
  reveal: boolean;
  setStatus?: (card: BinderCard, status: CardStatus) => Promise<void>;
  wishlist: ReadonlySet<string>;
}) {
  if (page.kind === 'inside' || page.kind === 'cover') {
    return (
      <div className="folio-inside-cover">
        <div className="folio-cover-stamp">
          <BookOpen aria-hidden="true" size={32} strokeWidth={1} />
          <span>{text('THE COLLECTION')}</span>
          <h2>{collection.label}</h2>
          <p>
            {collection.cards.filter(Boolean).length} {text('CARDS')}
          </p>
          <div className="folio-cover-rule" />
          <small>{collection.releaseYear}</small>
        </div>
      </div>
    );
  }

  const reverse = page.kind === 'reverse';
  return (
    <div
      className={`folio-page${reverse ? ' folio-page-reverse' : ''}`}
      data-pocket-edge={page.kind === 'back' || reverse ? 'right' : 'left'}
      data-pocket-opening={collection.pocketOpening ?? 'top'}
    >
      <ol aria-label={`Sheet ${page.sheet} ${page.kind}`} className="folio-pockets">
        {Array.from({ length: (collection.columns ?? 3) * (collection.rows ?? 3) }, (_, index) => {
          const card = reverse ? page.reverseCards?.[index] : page.cards[index];
          const isOwned = Boolean(card && owned.has(card.printingId ?? card.id));
          const opposite = page.reverseCards?.[index];
          // Planned cards keep their own artwork or placeholder in every status.
          // Only an unassigned pocket shows the opposite side through the sleeve.
          const backCard =
            !reverse &&
            !card &&
            opposite &&
            (collection.showAllCardsInColor || owned.has(opposite.printingId ?? opposite.id))
              ? opposite
              : undefined;
          return (
            <Pocket
              backCard={backCard}
              card={card}
              edit={editSlot && !reverse ? () => editSlot(page.start + index) : undefined}
              fullColor={collection.showAllCardsInColor}
              highlighted={reverse || !matches || Boolean(card && matches.has(card.id))}
              key={index}
              open={open}
              owned={isOwned}
              purchased={Boolean(card && purchased.has(card.printingId ?? card.id))}
              reveal={reveal}
              reverse={reverse}
              setStatus={setStatus}
              wishlist={Boolean(card && wishlist.has(card.printingId ?? card.id))}
            />
          );
        })}
      </ol>
    </div>
  );
});

type Turn = {
  cancel?: boolean;
  direction: 'next' | 'previous';
  grip?: PageGrip;
  progress?: number;
  side?: 'left' | 'right';
  to: number;
};
type PageDrag = {
  active: boolean;
  direction: -1 | 1;
  grip: PageGrip;
  height: number;
  lastTime: number;
  lastX: number;
  offset: number;
  pointerId: number;
  progress: number;
  reducedMotion: boolean;
  valid: boolean;
  velocity: number;
  visualTurn: boolean;
  width: number;
  x: number;
  y: number;
};

export function PhysicalBinder({
  collection,
  editSlot,
  matches,
  onPageRequestHandled,
  open,
  owned,
  pageActions,
  pageRequest,
  purchased,
  search,
  searchCards,
  searchControls,
  setSearch,
  setStatus,
  wishlist,
}: {
  collection: BinderPresentation;
  editSlot?: (index: number) => void;
  matches?: ReadonlyArray<BinderCard>;
  onPageRequestHandled?: () => void;
  open: (card: BinderCard) => void;
  owned: ReadonlySet<string>;
  pageActions?: ReactNode;
  pageRequest?: number;
  purchased: ReadonlySet<string>;
  search: string;
  searchCards: ReadonlyArray<BinderCard>;
  searchControls: HTMLElement | null;
  setSearch: (value: string) => void;
  setStatus?: (card: BinderCard, status: CardStatus) => Promise<void>;
  wishlist: ReadonlySet<string>;
}) {
  const columns = collection.columns ?? 3;
  const rows = collection.rows ?? 3;
  const capacity = columns * rows;
  const doubleSided = collection.doubleSided ?? collection.id === 'base1';
  const count = spreadCount(collection.cards.length, doubleSided, capacity);
  const [spread, setSpread] = useState(() => {
    const params = new URLSearchParams(location.search);
    return Math.max(
      0,
      Math.min(count - 1, Math.trunc(Number(params.get('page') ?? params.get('spread'))) - 1 || 0),
    );
  });
  useEffect(() => {
    replaceParams({ page: spread ? String(spread + 1) : '', spread: '' });
  }, [spread]);
  const [turn, setTurn] = useState<Turn>();
  const activeTurn = useRef<Turn | undefined>(undefined);
  const [destination, setDestination] = useState(spread);

  const updateTurn = useCallback((next: Turn | undefined) => {
    activeTurn.current = next;
    setTurn(next);
  }, []);
  const [mobileSide, setMobileSide] = useState<'left' | 'right'>(() =>
    binderPages(collection.cards, spread, doubleSided, columns, rows).right.kind === 'cover'
      ? 'left'
      : 'right',
  );
  const requestedPage = useRef({ side: mobileSide, spread });
  const finishTurn = useCallback((completed: Turn | undefined) => {
    // A superseded animation must never restore an older page.
    if (!completed || activeTurn.current !== completed) {
      return;
    }
    if (!completed.cancel) {
      setSpread(completed.to);
      setMobileSide(completed.side ?? requestedPage.current.side);
    }
    activeTurn.current = undefined;
    setTurn(undefined);
  }, []);

  const [reveal] = useMissingArtwork();
  const [immersive, setImmersive] = useState(
    () => new URLSearchParams(location.search).get('expanded') === '1',
  );

  useEffect(() => {
    replaceParams({ expanded: immersive ? '1' : '' });
  }, [immersive]);
  const narrow = useSyncExternalStore(
    subscribeToScreen,
    () => narrowScreen?.matches ?? false,
    () => false,
  );
  const suppressClick = useRef(false);
  const gesture = useRef<PageDrag | undefined>(undefined);
  const binderCanvas = useRef<BinderCanvasController | null>(null);
  const [presented, setPresented] = useState(false);
  const present = useCallback(() => setPresented(true), []);
  const table = useRef<HTMLDivElement>(null);
  useBinderFit(table, immersive, columns, rows, narrow);
  const [dragging, setDragging] = useState(false);
  const previousLength = useRef(collection.cards.length);
  useLayoutEffect(() => {
    const length = collection.cards.length;
    const shrank = length < previousLength.current;
    previousLength.current = length;
    const requested = pageRequest !== undefined && pageRequest < length;
    if (!requested && !shrank) {
      return;
    }
    // Keep the renderer mounted. Focus a locally added side, or keep the current
    // side within the remaining pockets after removal (including on mobile).
    const currentSlot =
      spread * capacity * (doubleSided ? 2 : 1) -
      (doubleSided && mobileSide === 'left' ? capacity : 0);
    const slot = Math.max(0, Math.min(length - 1, requested ? pageRequest : currentSlot));
    const next = cardSpread(slot, doubleSided, capacity);
    const side = doubleSided && Math.floor(slot / capacity) % 2 ? 'left' : 'right';
    binderCanvas.current?.cancel();
    updateTurn(undefined);
    const pointerId = gesture.current?.pointerId;
    if (pointerId !== undefined && table.current?.hasPointerCapture(pointerId)) {
      table.current.releasePointerCapture(pointerId);
    }
    gesture.current = undefined;
    setDragging(false);
    table.current?.removeAttribute('data-page-motion');
    table.current?.style.removeProperty('--page-drag-offset');
    requestedPage.current = { side, spread: next };
    setSpread(next);
    setDestination(next);
    setMobileSide(side);
    if (requested) {
      onPageRequestHandled?.();
    }
  }, [
    capacity,
    collection.cards.length,
    doubleSided,
    mobileSide,
    onPageRequestHandled,
    pageRequest,
    spread,
    updateTurn,
  ]);
  const pages = useMemo(
    () => binderPages(collection.cards, spread, doubleSided, columns, rows),
    [collection.cards, spread, doubleSided, columns, rows],
  );
  const nextPages = useMemo(
    () =>
      binderPages(collection.cards, Math.min(count - 1, spread + 1), doubleSided, columns, rows),
    [collection.cards, spread, count, doubleSided, columns, rows],
  );
  const previousPages = useMemo(
    () => binderPages(collection.cards, Math.max(0, spread - 1), doubleSided, columns, rows),
    [collection.cards, spread, doubleSided, columns, rows],
  );

  // Promote already-mounted pages at settlement. Replacing src on the old
  // spread's images can briefly expose undecoded images and transfer focus.
  const mountedPages = new Map<
    string,
    { page: BinderPage; role: string; side: 'left' | 'right' }
  >();
  for (const [pair, role] of [
    [previousPages, 'folio-preload'],
    [nextPages, 'folio-preload'],
  ] as const) {
    for (const side of ['left', 'right'] as const) {
      const page = pair[side];
      mountedPages.set(`${page.kind}:${page.sheet}`, { page, role, side });
    }
  }
  for (const [page, side] of [
    [previousPages.left, 'left'],
    [nextPages.right, 'right'],
  ] as const) {
    mountedPages.set(`${page.kind}:${page.sheet}`, { page, role: 'folio-under', side });
  }
  for (const side of ['left', 'right'] as const) {
    const page = pages[side];
    mountedPages.set(`${page.kind}:${page.sheet}`, { page, role: 'folio-rest', side });
  }
  const matchIds = useMemo(() => matches && new Set(matches.map((card) => card.id)), [matches]);
  const pageProps = {
    collection,
    editSlot,
    matches: matchIds,
    open,
    owned,
    purchased,
    reveal,
    setStatus,
    wishlist,
  };

  useEffect(() => {
    if (!immersive) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !(event.target as Element | null)?.closest?.('[role="menu"]') &&
        !document.querySelector('dialog[open], [popover]:popover-open')
      ) {
        setImmersive(false);
      }
    };
    window.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', escape);
    };
  }, [immersive]);

  function goTo(next: number, side: 'left' | 'right' = 'right') {
    if (next < 0 || next >= count) {
      return;
    }
    const nextPages = binderPages(collection.cards, next, doubleSided, columns, rows);
    const nextSide = nextPages.right.kind === 'cover' ? 'left' : side;
    requestedPage.current = { side: nextSide, spread: next };
    setDestination(next);

    const interrupted = Boolean(activeTurn.current);
    binderCanvas.current?.cancel();
    updateTurn(undefined);
    if (next === spread) {
      setMobileSide(nextSide);
      setSpread(next);
      return;
    }
    if (
      interrupted ||
      !binderCanvas.current?.ready() ||
      Math.abs(next - spread) !== 1 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setSpread(next);
      setMobileSide(nextSide);
    } else {
      const direction = next > spread ? 'next' : 'previous';
      table.current?.setAttribute('data-page-motion', '');
      updateTurn({
        direction,
        side: nextSide,
        to: next,
      });
    }
  }

  function navigate(direction: -1 | 1) {
    const { side, spread: requested } = requestedPage.current;
    const requestedPages = binderPages(collection.cards, requested, doubleSided, columns, rows);
    if (narrow && doubleSided) {
      if (direction === 1 && side === 'left' && requestedPages.right.kind !== 'cover') {
        goTo(requested, 'right');
        return;
      }
      if (direction === -1 && side === 'right' && requested > 0) {
        goTo(requested, 'left');
        return;
      }
    }
    goTo(requested + direction, narrow && doubleSided && direction === 1 ? 'left' : 'right');
  }

  function jumpToCard(card: BinderCard) {
    const index = card.slotIndex ?? collection.cards.findIndex((item) => item?.id === card.id);
    if (index >= 0) {
      goTo(
        cardSpread(index, doubleSided, capacity),
        doubleSided && Math.floor(index / capacity) % 2 ? 'left' : 'right',
      );
    }
  }

  const canPrevious = destination > 0;
  const compactNavigation = immersive || narrow;
  const navigationSize = immersive && !narrow ? 'sm' : undefined;
  const canNext =
    destination < count - 1 ||
    (narrow &&
      doubleSided &&
      mobileSide === 'left' &&
      binderPages(collection.cards, destination, doubleSided, columns, rows).right.kind !==
        'cover');
  function finishDrag(allowCommit: boolean) {
    const drag = gesture.current;
    gesture.current = undefined;
    if (!drag) {
      return;
    }
    const element = table.current;
    if (element?.hasPointerCapture(drag.pointerId)) {
      element.releasePointerCapture(drag.pointerId);
    }
    element?.style.removeProperty('--page-drag-offset');
    setDragging(false);
    if (!drag.active || !drag.valid) {
      return;
    }
    const commit =
      allowCommit &&
      (drag.visualTurn
        ? drag.progress > 0.32 ||
          (drag.velocity * Math.exp(-(performance.now() - drag.lastTime) / 80) > 0.5 &&
            drag.progress > 0.08)
        : drag.offset >= Math.min(90, drag.width * 0.25));
    if (drag.visualTurn) {
      const direction = drag.direction === 1 ? 'next' : 'previous';
      const side =
        drag.direction === 1 && (nextPages.right.kind === 'cover' || (narrow && doubleSided))
          ? 'left'
          : 'right';
      if (commit) {
        requestedPage.current = { side, spread: spread + drag.direction };
        setDestination(spread + drag.direction);
      }
      updateTurn({
        cancel: !commit,
        direction,
        grip: drag.grip,
        side,
        to: spread + drag.direction,
      });
    } else if (commit) {
      navigate(drag.direction);
    }
  }

  return (
    <section
      aria-label={text('Physical card binder')}
      aria-modal={immersive ? true : undefined}
      className={`folio${immersive ? ' folio-immersive' : ''}`}
      onKeyDown={(event) => {
        if (!immersive || event.key !== 'Tab') {
          return;
        }
        const focusable = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, select:not(:disabled), [tabindex="0"]',
          ),
        ].filter((element) => element.getClientRects().length > 0 && !element.closest('[inert]'));
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      role={immersive ? 'dialog' : 'region'}
      style={
        {
          ...binderColorStyle(collection.color),
          '--card-stock-layers': doubleSided ? 2 : 1,
          '--pocket-columns': columns,
          '--pocket-rows': rows,
        } as CSSProperties
      }
    >
      <div className="folio-topbar">
        {!immersive && (
          <div>
            <h2>
              {collection.label} <small>{collection.releaseYear}</small>
            </h2>
          </div>
        )}
        <div className="folio-options">
          <Button
            aria-label={immersive ? text('Exit immersive view') : text('Enter immersive view')}
            aria-pressed={immersive}
            className="folio-icon-button"
            icon={<>{immersive ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</>}
            isIconOnly
            label={immersive ? text('Exit immersive view') : text('Enter immersive view')}
            onClick={() => setImmersive((value) => !value)}
            type="button"
          ></Button>
        </div>
      </div>
      {searchControls &&
        createPortal(
          <CardSearch
            cards={searchCards}
            onChange={setSearch}
            onSelect={jumpToCard}
            value={search}
          />,
          searchControls,
        )}
      <div
        aria-busy={!presented}
        aria-label={text('Binder pages. Use left and right arrow keys to turn pages.')}
        className={`folio-table${dragging ? ' is-dragging' : ''}`}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail !== 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && gesture.current?.active) {
            event.preventDefault();
            event.stopPropagation();
            finishDrag(false);
            return;
          }
          if (gesture.current?.active) {
            return;
          }
          if (
            ['SELECT', 'INPUT'].includes((event.target as HTMLElement).tagName) ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          ) {
            return;
          }
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            navigate(event.key === 'ArrowRight' ? 1 : -1);
          }
        }}
        onLostPointerCapture={(event) => {
          if (
            event.target === event.currentTarget &&
            gesture.current?.pointerId === event.pointerId
          ) {
            finishDrag(false);
          }
        }}
        onPointerCancel={(event) => {
          if (gesture.current?.pointerId === event.pointerId) {
            finishDrag(false);
          }
        }}
        onPointerDown={(event) => {
          suppressClick.current = false;
          if (!turn) {
            event.currentTarget.removeAttribute('data-page-motion');
          }
          if (
            !presented ||
            turn ||
            !event.isPrimary ||
            event.button !== 0 ||
            (event.target as HTMLElement).closest('.card-status, .folio-add, .folio-edit')
          ) {
            return;
          }
          const book = event.currentTarget.querySelector('.folio-book');
          const bounds = book?.getBoundingClientRect();
          const width = (bounds?.width ?? 600) / (narrow ? 1 : 2);
          const spine =
            bounds &&
            (narrow
              ? mobileSide === 'right'
                ? bounds.left
                : bounds.right
              : bounds.left + bounds.width / 2);

          gesture.current = {
            active: false,
            direction: 1,
            grip: {
              pull: 0,
              x: spine === undefined ? 1 : clamp(Math.abs(event.clientX - spine) / width),
              y: bounds ? clamp((event.clientY - bounds.top) / bounds.height) : 0.5,
            },
            height: bounds?.height ?? 600,
            lastTime: event.timeStamp,
            lastX: event.clientX,
            offset: 0,
            pointerId: event.pointerId,
            progress: 0,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            valid: false,
            velocity: 0,
            visualTurn: false,
            width,
            x: event.clientX,
            y: event.clientY,
          };
        }}
        onPointerMove={(event) => {
          const drag = gesture.current;
          if (!turn && !drag) {
            event.currentTarget.removeAttribute('data-page-motion');
          }
          if (!drag || drag.pointerId !== event.pointerId) {
            return;
          }
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          let starting = false;
          if (!drag.active) {
            const threshold = event.pointerType === 'touch' ? 12 : 8;
            if (Math.abs(dy) > threshold && Math.abs(dy) > Math.abs(dx)) {
              suppressClick.current = true;
              gesture.current = undefined;
              return;
            }
            if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.25) {
              return;
            }
            starting = true;
            event.currentTarget.setAttribute('data-page-motion', '');
            drag.active = true;
            drag.direction = dx < 0 ? 1 : -1;
            drag.valid = drag.direction === 1 ? canNext : canPrevious;
            const changeSide =
              narrow &&
              doubleSided &&
              ((mobileSide === 'left' && drag.direction === 1) ||
                (mobileSide === 'right' && drag.direction === -1));
            drag.visualTurn =
              drag.valid &&
              !drag.reducedMotion &&
              Boolean(binderCanvas.current?.ready()) &&
              !changeSide;
            suppressClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            event.currentTarget.focus({ preventScroll: true });
            setDragging(true);
          }
          drag.offset = Math.max(0, -drag.direction * dx);
          const elapsed = event.timeStamp - drag.lastTime;
          if (elapsed > 0) {
            drag.velocity = (-drag.direction * (event.clientX - drag.lastX)) / elapsed;
          }
          drag.lastX = event.clientX;
          drag.lastTime = event.timeStamp;
          drag.grip.pull = dy / drag.height;
          drag.progress = drag.visualTurn
            ? Math.acos(
                clamp(1 - drag.offset / (drag.width * Math.max(0.55, drag.grip.x)), -1, 1),
              ) / Math.PI
            : Math.min(1, drag.offset / drag.width);
          if (drag.visualTurn) {
            const nextTurn: Turn = {
              direction: drag.direction === 1 ? 'next' : 'previous',
              grip: { ...drag.grip },
              progress: drag.progress,
              to: spread + drag.direction,
            };
            binderCanvas.current?.update(nextTurn);
            if (starting) {
              updateTurn(nextTurn);
            }
          } else if (drag.valid && !drag.reducedMotion) {
            event.currentTarget.style.setProperty(
              '--page-drag-offset',
              `${-drag.direction * Math.min(drag.offset * 0.25, 55)}px`,
            );
          }
        }}
        onPointerUp={(event) => {
          if (gesture.current?.pointerId === event.pointerId) {
            finishDrag(true);
          }
        }}
        ref={table}
        tabIndex={0}
      >
        {!presented && <Loading className="folio-loading" />}
        <div
          className="folio-book"
          data-mobile-side={mobileSide}
          data-turn={turn?.direction}
          inert={!presented}
        >
          <div aria-hidden="true" className="folio-lining folio-lining-left" />
          <div aria-hidden="true" className="folio-lining folio-lining-right" />
          <div aria-hidden="true" className="folio-spine">
            <i />
            <i />
            <i />
          </div>
          {[...mountedPages].map(([key, { page, role, side }]) => (
            <div
              aria-hidden={role !== 'folio-rest' ? true : undefined}
              className={`${role} ${role === 'folio-rest' ? 'folio' : role}-${side}`}
              data-face-side={side}
              data-sheet={page.sheet}
              inert={role !== 'folio-rest' || Boolean(turn) || (narrow && mobileSide !== side)}
              key={key}
            >
              {!doubleSided && <PageUnderlay {...pageProps} page={page} />}
              <Page {...pageProps} page={page} />
            </div>
          ))}
          <BinderCanvas
            complete={() => flushSync(() => finishTurn(activeTurn.current))}
            onReady={present}
            ref={binderCanvas}
            turn={turn}
            view={{
              color: collection.color ?? '#323236',
              columns,
              doubleSided,
              mobileSide,
              narrow,
              rows,
              sheets: Math.ceil(collection.cards.length / (capacity * (doubleSided ? 2 : 1))),
              spread,
            }}
          />
        </div>
      </div>
      <div className="folio-navigation">
        <Stack direction="horizontal" gap={1}>
          <Button
            icon={<span aria-hidden="true">⏮︎</span>}
            isDisabled={!canPrevious}
            isIconOnly
            label={text('First binder page')}
            onClick={() => goTo(0)}
            size={navigationSize}
            type="button"
          />
          <Button
            aria-label={text('Previous binder page')}
            icon={compactNavigation ? <ArrowLeft size={17} /> : undefined}
            isDisabled={!canPrevious}
            isIconOnly={compactNavigation}
            label={text('Previous binder page')}
            onClick={() => navigate(-1)}
            size={navigationSize}
            type="button"
          >
            {!compactNavigation && (
              <>
                <ArrowLeft size={17} />
                <span>{text('Previous')}</span>
              </>
            )}
          </Button>
        </Stack>
        <div className="folio-page-picker">
          <Select
            aria-label={text('Jump to binder page')}
            onChange={(event) => goTo(Number(event))}
            size={navigationSize}
            value={destination}
          >
            {Array.from({ length: count }, (_, index) => {
              const entry = binderPages(collection.cards, index, doubleSided, columns, rows);
              return (
                <option key={index} value={index}>
                  {text('Page')} {index + 1} / {count} ·{' '}
                  {entry.left.cards.length ? `${pageRange(entry.left)} / ` : ''}
                  {pageRange(entry.right)}
                </option>
              );
            })}
          </Select>
          {!immersive && pageActions}
        </div>
        <Stack direction="horizontal" gap={1}>
          <Button
            aria-label={text('Next binder page')}
            icon={compactNavigation ? <ArrowRight size={17} /> : undefined}
            isDisabled={!canNext}
            isIconOnly={compactNavigation}
            label={text('Next binder page')}
            onClick={() => navigate(1)}
            size={navigationSize}
            type="button"
          >
            {!compactNavigation && (
              <>
                <span>{text('Next')}</span>
                <ArrowRight size={17} />
              </>
            )}
          </Button>
          <Button
            icon={<span aria-hidden="true">⏭︎</span>}
            isDisabled={!canNext}
            isIconOnly
            label={text('Last binder page')}
            onClick={() => goTo(count - 1)}
            size={navigationSize}
            type="button"
          />
        </Stack>
      </div>
    </section>
  );
}
