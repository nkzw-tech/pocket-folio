import { Stack } from '@astryxdesign/core/Stack';
import { text } from '../src/i18n/text';

const sources = [
  {
    credit: 'English and Japanese card data, scans, and set logos.',
    links: [
      ['ShinyBeak', 'https://shinybeak.com/sets'],
      ['Scrydex', 'https://scrydex.com'],
      [
        'Bulbapedia',
        'https://bulbapedia.bulbagarden.net/wiki/Pretend_Comedian_Pikachu_(SM-P_Promo_407)',
      ],
    ],
  },
  {
    credit: 'Multilingual card data, translations, and German scans.',
    links: [['TCGdex', 'https://tcgdex.dev/']],
  },
  {
    credit: 'German Grundset scans.',
    links: [['Bisafans', 'https://www.bisafans.de/sammelkarten/sets/klassisch/basis-set.php']],
  },
  {
    credit: 'Additional German scans through its TCGdex mirror.',
    links: [['CardCosmos', 'https://cardcosmos.de/pages/deutsches-pokemon-set']],
  },
  {
    credit: 'Energy symbols and Pokémon VS retreat costs.',
    links: [['Serebii', 'https://www.serebii.net/card/vs/']],
  },
  {
    credit: 'Dragon and Fairy energy symbols.',
    links: [['Malie', 'https://malie.io/static/draft/html/pkproto_sv.html']],
  },
] as const;

export default function Attribution() {
  return (
    <main className="shell attribution-page">
      <Stack gap={8}>
        <Stack as="header" gap={4}>
          <h1>{text('Attribution')}</h1>
          <p>
            {text(
              'Pocket Folio is a free, noncommercial fan project. It is not affiliated with or endorsed by The Pokémon Company, Nintendo, Creatures, or GAME FREAK.',
            )}
          </p>
          <p>
            {text(
              'Pokémon names, artwork, and trademarks belong to their respective rights holders. The sources below provide data and scans; crediting them does not imply ownership of the underlying artwork or endorsement of Pocket Folio.',
            )}
          </p>
          <a href="https://tcg.pokemon.com/">Pokémon Trading Card Game</a>
          <p>
            {text(
              'The MIT license covers our code, not third-party card artwork, scans, logos, or sourced card data. Those materials remain subject to their own rights and terms.',
            )}
          </p>
        </Stack>
        <p>{text('Thank you to everyone who documents, scans, and preserves these cards.')}</p>
        <Stack as="ul" className="attribution-sources" gap={6}>
          {sources.map(({ credit, links }) => (
            <Stack as="li" gap={1} key={links[0][0]}>
              <Stack direction="horizontal" gap={2}>
                {links.map(([name, href]) => (
                  <a href={href} key={href}>
                    {name}
                  </a>
                ))}
              </Stack>
              <p>{text(credit)}</p>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </main>
  );
}
