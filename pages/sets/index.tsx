import { Link, useRouter, useShared } from '@void/react';
import { useMemo, useState } from 'react';
import { preferredPrinting } from '../../src/app/model';
import { useWorkspace, type Shared } from '../../src/app/workspace';
import { languageName } from '../../src/binder-catalog';
import { catalogEras, catalogLanguages, catalogSets as sets } from '../../src/catalog-navigation';
import { CatalogOwnershipToggle, useCatalogOwnership } from '../../src/catalog-ownership';
import { text } from '../../src/i18n/text';
import { Select } from '../../src/select';
import { SetCover } from '../../src/set-cover';
import { SetSearch, setDataSource } from '../../src/set-search';

function SetOwnershipCount({ set }: { set: (typeof sets)[number] }) {
  const { document } = useWorkspace();
  const owned = set.cards.filter(
    (card) => document.ownership[preferredPrinting(card, document.ownership)] === true,
  ).length;
  return (
    <>
      {owned} / {set.cards.length} {text('owned')}
    </>
  );
}

export default function SetsPage() {
  const router = useRouter();
  const { user } = useShared<Shared>();
  const { showOwnership } = useCatalogOwnership();
  const [language, setLanguage] = useState('');
  const [era, setEra] = useState('');
  const [search, setSearch] = useState('');
  const eligible = useMemo(
    () =>
      sets.filter(
        (set) =>
          (!language || set.language === language) && (!era || (set.era ?? 'Classic') === era),
      ),
    [era, language],
  );
  const source = useMemo(() => setDataSource(eligible), [eligible]);
  const visible = search.trim() ? source.getQueryResults(search).map(({ data }) => data) : eligible;
  return (
    <main className="shell sets-overview catalog-overview">
      <div className="catalog-heading">
        <h1>{text('Sets')}</h1>
      </div>
      <div className="catalog-set-picker">
        <SetSearch
          emptyLabel={text('Find a set')}
          onSearch={setSearch}
          onSelect={(id) => {
            void router.visit(`/sets/${id}`);
          }}
          search={search}
          sets={eligible}
          value=""
        />
        <Select
          aria-label={text('Card language')}
          onChange={(event) => setLanguage(event)}
          value={language}
        >
          <option value="">{text('All languages')}</option>
          {catalogLanguages.map((value) => (
            <option key={value} value={value}>
              {languageName(value)}
            </option>
          ))}
        </Select>
        <Select aria-label={text('Era')} onChange={(event) => setEra(event)} value={era}>
          <option value="">{text('All eras')}</option>
          {catalogEras.map(({ era, range }) => (
            <option key={era} value={era}>
              {era} · {range}
            </option>
          ))}
        </Select>
      </div>
      {user && (
        <div className="catalog-secondary-toolbar">
          <CatalogOwnershipToggle />
        </div>
      )}
      <ul className="set-grid">
        {visible.map((set) => (
          <li key={set.id}>
            <Link className="set-tile" href={`/sets/${set.id}`}>
              <SetCover set={set} />
              <div className="set-tile-caption">
                <h2 lang={set.language}>{set.label}</h2>
                <p>
                  {languageName(set.language)} · {set.releaseYear}
                  <span>
                    {user && showOwnership ? (
                      <SetOwnershipCount set={set} />
                    ) : (
                      <>
                        {set.cards.length} {text('cards')}
                      </>
                    )}
                  </span>
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {!visible.length && <p className="empty">{text('No matching sets.')}</p>}
    </main>
  );
}
