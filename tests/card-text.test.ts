import { describe, expect, it } from 'vitest';
import { cardNameEntries, cardTextEntries, cardTextLanguages } from '../src/card-text';

const value = { en: 'Thunderbolt', local: '10まんボルト' };
describe('card text language', () => {
  it('shows only original text, regardless of the interface language', () => {
    expect(cardTextEntries(value, 'ja', { interfaceLanguage: 'de', mode: 'original' })).toEqual([
      { language: 'ja', text: value.local },
    ]);
  });
  it('shows original then interface text without repeating matching languages or text', () => {
    expect(cardTextEntries(value, 'ja', { interfaceLanguage: 'en', mode: 'both' })).toEqual([
      { language: 'ja', text: value.local },
      { language: 'en', text: value.en },
    ]);
    expect(cardTextLanguages('ja', { interfaceLanguage: 'ja', mode: 'both' })).toEqual(['ja']);
    expect(
      cardTextEntries({ en: 'Pikachu', local: 'Pikachu' }, 'de', {
        interfaceLanguage: 'en',
        mode: 'both',
      }),
    ).toHaveLength(1);
  });
  it('uses catalog translations for the interface language and labels fallback text honestly', () => {
    expect(
      cardTextEntries(value, 'ja', {
        dictionary: { Thunderbolt: 'Donnerblitz' },
        interfaceLanguage: 'de',
        mode: 'interface',
      }),
    ).toEqual([{ language: 'de', text: 'Donnerblitz' }]);
    expect(cardTextEntries(value, 'ja', { interfaceLanguage: 'de', mode: 'interface' })).toEqual([
      { language: 'en', text: 'Thunderbolt' },
    ]);
  });
  it('keeps original text if no English translation exists and omits empty content', () => {
    expect(
      cardTextEntries({ en: '', local: value.local }, 'ja', {
        interfaceLanguage: 'en',
        mode: 'interface',
      }),
    ).toEqual([{ language: 'ja', text: value.local }]);
    expect(
      cardTextEntries({ en: '', local: '' }, 'ja', { interfaceLanguage: 'en', mode: 'both' }),
    ).toEqual([]);
  });
  it('finds card names in the selected language without changing the original printing', () => {
    const card = { english: 'Charizard', language: 'en', localName: 'Charizard' };
    expect(cardNameEntries(card, { interfaceLanguage: 'de', mode: 'interface' })).toEqual([
      { language: 'de', text: 'Glurak' },
    ]);
    expect(card.localName).toBe('Charizard');
  });
});
