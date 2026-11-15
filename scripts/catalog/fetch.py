"""Cache reviewed catalog sources. Run from the repository root; never touches user data."""
import concurrent.futures
import json
import re
import time
import urllib.request
from pathlib import Path

CACHE = Path('.cache/catalog')
CACHE.mkdir(parents=True, exist_ok=True)


def download(url, path):
    if path.exists():
        return path.read_text()
    for attempt in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'PokemonBinderCatalog/1.0'}), timeout=45) as response:
                data = response.read().decode()
            path.write_text(data)
            return data
        except Exception:
            if attempt == 5:
                raise
            time.sleep(1 + attempt * 2)


def shiny_cards(html):
    # Decode inert Next Flight JSON, never execute the page's JavaScript.
    chunks = [json.loads(m.group(1))[1] for m in re.finditer(r'self\.__next_f\.push\((\[1,.*?\])\)</script>', html)]
    rows = {}
    for line in ''.join(chunks).splitlines():
        key, _, payload = line.partition(':')
        try:
            rows[key] = json.loads(payload)
        except (ValueError, TypeError):
            pass
    def resolve(value):
        if isinstance(value, str) and value.startswith('$'):
            if value == '$undefined':
                return None
            parts = value[1:].split(':')
            if parts[0] in rows:
                ref = rows[parts[0]]
                for part in parts[1:]:
                    ref = ref[3] if part == 'props' and isinstance(ref, list) else ref[int(part)] if isinstance(ref, list) else ref[part]
                return resolve(ref)
        if isinstance(value, list):
            return [resolve(v) for v in value]
        if isinstance(value, dict):
            return {k: resolve(v) for k, v in value.items()}
        return value
    for row in rows.values():
        if isinstance(row, list) and len(row) > 3 and isinstance(row[3], dict) and isinstance(row[3].get('cards'), list):
            cards = resolve(row[3]['cards'])
            if cards:
                return cards
    raise ValueError('No card roster found')


EN = ['base1','base2','base3','base4','base5','base6','basep','gym1','gym2','neo1','neo2','neo3','neo4','ecard1','ecard2','ecard3','ex1','ex2','ex3','ex7','sv3pt5','swsh12pt5','swsh12pt5gg','me1','me2','me2pt5','me3','me4','me5','me55','me55c','me6']
JA = ['gym1_ja','gym2_ja','neo1_ja','neo2_ja','neo3_ja','neo4_ja','sv2a_ja','swsh12a_ja','m1l_ja','m1s_ja','m2_ja','m2a_ja','m3_ja','m4_ja','m5_ja','m6_ja']
# Launch coverage: full Scarlet & Violet, selected Sword & Shield, TAG TEAM and promos.
EN += ['sv1', 'sv2', 'sv3', 'sv4', 'sv5', 'sv6', 'sv7', 'sv8', 'sv9', 'sv10', 'sv4pt5', 'sv6pt5', 'sv8pt5', 'zsv10pt5', 'rsv10pt5', 'sve', 'svp', 'mep', 'swsh7', 'swsh9', 'swsh9tg', 'swsh10', 'swsh10tg', 'swsh11', 'swsh11tg', 'swsh12', 'swsh12tg', 'swshp', 'sm9', 'sm10', 'sm11', 'sm12', 'sm115', 'sma', 'smp']
# Launch coverage: full Scarlet & Violet, selected Sword & Shield, TAG TEAM and promos.
JA += ['base1_ja', 'base2_ja', 'base3_ja', 'base4_ja', 'm6a_ja', 'mp_ja', 'sv1s_ja', 'sv1v_ja', 'sv1a_ja', 'sv2p_ja', 'sv2d_ja', 'sv3_ja', 'sv3a_ja', 'sv4k_ja', 'sv4m_ja', 'sv4a_ja', 'sv5k_ja', 'sv5m_ja', 'sv5a_ja', 'sv6_ja', 'sv6a_ja', 'sv7_ja', 'sv7a_ja', 'sv8_ja', 'sv8a_ja', 'sv9_ja', 'sv9a_ja', 'sv10_ja', 'sv11b_ja', 'sv11w_ja', 'svp_ja', 'swsh6a_ja', 'swsh7d_ja', 'swsh7r_ja', 'swsh8b_ja', 'swsh9_ja', 'swsh9a_ja', 'swsh10d_ja', 'swsh10p_ja', 'swsh10a_ja', 'swsh11_ja', 'swsh11a_ja', 'swsh12_ja', 'swshp_ja', 'sm8b_ja', 'sm9_ja', 'sm9a_ja', 'sm9b_ja', 'sm10_ja', 'sm10a_ja', 'sm10b_ja', 'sm11_ja', 'sm11a_ja', 'sm11b_ja', 'sm12_ja', 'sm12a_ja', 'smp_ja']
# Pokémon GO special expansion, including secret rares.
EN += ['pgo']
JA += ['swsh10b_ja']
# Reference-only English printings supply translations for Japanese reprint sets.
REFERENCE = [f'swsh{i}' for i in range(1,13)] + [f'sv{i}' for i in range(1,11)] + ['sv4pt5','sv6pt5','sv8pt5','xy12','rsv10pt5','zsv10pt5']
REFERENCE += [f'sm{i}' for i in range(1,9)] + ['sm35', 'sm75', 'xy5']
DE = ['neo1','neo2','neo3','neo4','ecard1','ecard2','ecard3','ex1','ex2','ex3','sv03.5','swsh12.5','swsh12.5gg','swsh10.5']


def shiny(id):
    path = CACHE / f'shiny-{id}.html'
    html = download(f'https://shinybeak.com/sets/{id}', path)
    cards = shiny_cards(html)
    (CACHE / f'cards-{id}.json').write_text(json.dumps(cards, ensure_ascii=False))
    print(id, len(cards), cards[0]['set']['name'], flush=True)


def german(id):
    data = json.loads(download(f'https://api.tcgdex.net/v2/de/sets/{id}', CACHE / f'de-set-{id}.json'))
    def card(brief):
        return json.loads(download(f'https://api.tcgdex.net/v2/de/cards/{brief["id"]}', CACHE / f'de-card-{brief["id"]}.json'))
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        cards = list(pool.map(card, data['cards']))
    (CACHE / f'cards-de-{id}.json').write_text(json.dumps(cards, ensure_ascii=False))
    print('de', id, len(cards), flush=True)


if __name__ == '__main__':
    failures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        tasks = {pool.submit(shiny, id): id for id in dict.fromkeys(EN + JA + REFERENCE)}
        for task in concurrent.futures.as_completed(tasks):
            try:
                task.result()
            except Exception as error:
                failures.append(tasks[task])
                print('FAILED', tasks[task], str(error), flush=True)
    if failures:
        raise SystemExit(f'Missing source rosters: {failures}')
    for id in DE:
        german(id)
