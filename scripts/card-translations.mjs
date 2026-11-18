import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

// Reuse catalog translations only when the English phrase has one unambiguous translation.
const files = await readdir('public/card-details');
await mkdir('public/card-translations', { recursive: true });
for (const language of ['de', 'ja']) {
  const phrases = new Map();
  function pair(english, local) {
    if (typeof english === 'string' && typeof local === 'string') {
      if (english && local && english !== local) {
        const values = phrases.get(english) ?? new Set();
        values.add(local);
        phrases.set(english, values);
      }
    } else if (english && local && typeof english === 'object' && typeof local === 'object') {
      for (const key of Object.keys(english)) {
        pair(english[key], local[key]);
      }
    }
  }
  function visit(value) {
    if (value && typeof value === 'object') {
      pair(value.en, value.local);
      for (const entry of Object.values(value)) {
        visit(entry);
      }
    }
  }
  const paths = [
    language === 'de' ? 'src/german-card-details.json' : 'src/vs-card-details.json',
    ...files
      .filter((file) => file.startsWith(`${language}-`))
      .map((file) => `public/card-details/${file}`),
  ];
  for (const path of paths) {
    visit(JSON.parse(await readFile(path, 'utf8')));
  }
  const translations = Object.fromEntries(
    Array.from(
      phrases
        .entries()
        .filter(([, values]) => values.size === 1)
        .map(([key, values]) => [key, values.values().next().value]),
    ).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(`public/card-translations/${language}.json`, JSON.stringify(translations) + '\n');
}
