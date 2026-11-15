import { readFile, writeFile } from 'node:fs/promises';
const source = JSON.parse(await readFile('source_strings.json', 'utf8'));
const messages = JSON.parse(await readFile('translations/messages.json', 'utf8'));
for (const locale of ['de-DE', 'ja-JP']) {
  const translations = {};
  for (const phrase of source.phrases) {
    for (const [hash, leaf] of Object.entries(phrase.hashToLeaf)) {
      if (!leaf.desc.startsWith('Binder interface:')) {
        continue;
      }
      const translation = messages[leaf.text]?.[locale];
      if (!translation) {
        throw new Error(`Missing ${locale} translation for ${leaf.text}`);
      }
      translations[hash] = {
        description: leaf.desc,
        tokens: [],
        translations: [{ translation, variations: {} }],
        types: [],
      };
    }
  }
  await writeFile(
    `translations/${locale}.json`,
    JSON.stringify({ 'fb-locale': locale, translations }, null, 2) + '\n',
  );
}
