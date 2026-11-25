"""Acquire the reviewed pre-release Japanese M7 printings and their English translations."""
import concurrent.futures
import copy
import html
import json
import re

from fetch import CACHE, download

PRODUCT = 'https://www.pokemon-card.com/ex/m7/'
DATABASE = 'https://limitlesstcg.com/cards/jp/M7'
SYMBOLS = dict(zip('GRWLPFDMNC', ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic',
                                  'Fighting', 'Darkness', 'Metal', 'Dragon', 'Colorless']))
# Number, corresponding main-set printing and illustrator printed on the alternate art.
ALTERNATES = [(81, 16, 'Nurikabe'), (84, 36, 'mashu'), (86, 46, 'GOSSAN'),
              (110, 57, 'REND'), (113, 76, 'Tetsuo Hara')]
RARITIES = {'C': ('通常', 'common'), 'U': ('非', 'uncommon'), 'R': ('希少', 'holo-rare'),
            'RR': ('ダブルレア', 'double-rare'), 'AR': ('アートレア', 'illustration-rare'),
            'SAR': ('スペシャルアートレア', 'special-illustration-rare')}


def plain(markup):
    return ' '.join(html.unescape(re.sub('<[^>]+>', '', markup)).split())


def extract(markup, field, tag='p'):
    return re.findall(fr'<{tag} class="card-text-{field}">(.*?)</{tag}>', markup, re.S)


def parse(markup):
    name = plain(extract(markup, 'name', 'span')[0])
    stage = plain(extract(markup, 'type')[0])
    result = {'name': name, 'artist': plain(re.search(r'Illustrated by\s*<a[^>]*>(.*?)</a>', markup, re.S)[1])}
    if stage.startswith('Trainer'):
        result.update(supertype='Trainer', subtype=stage, rules=[plain(extract(markup, 'section', 'div')[1])])
        return result
    header = plain(extract(markup, 'title')[0])
    energy, hp = re.search(r' - (\w+) - (\d+) HP$', header).groups()
    result.update(supertype='Pokémon', subtype=stage, hp=hp, types=[energy])
    wrr = plain(extract(markup, 'wrr')[0])
    weakness, resistance, retreat = re.fullmatch(r'Weakness: (\w+) Resistance: (\w+) Retreat: (\d+)', wrr).groups()
    result['retreat'] = ['Colorless'] * int(retreat)
    for key, value, amount in [('weaknesses', weakness, '×2'), ('resistances', resistance, '-30')]:
        if value != 'none':
            result[key] = [{'type': value, 'value': amount}]
    result['abilities'] = [{'name': plain(info).removeprefix('Ability: '), 'text': plain(effect)}
                           for info, effect in zip(extract(markup, 'ability-info'), extract(markup, 'ability-effect'), strict=True)]
    result['attacks'] = []
    for info, effect in zip(extract(markup, 'attack-info'), extract(markup, 'attack-effect'), strict=True):
        cost, title = re.search(r'<span class="ptcg-symbol">(.*?)</span>(.*)', info, re.S).groups()
        name, damage = re.fullmatch(r'(.+?)(?: (\d+[×+\-]?))?', plain(title)).groups()
        result['attacks'].append({'name': name, 'damage': damage or '', 'text': plain(effect),
                                  'cost': [SYMBOLS[symbol] for symbol in cost if symbol != '0']})
    assert result['attacks'] or result['abilities'], header
    return result


def acquire():
    cache = CACHE / 'aura-seeker'
    cache.mkdir(exist_ok=True)
    listing = json.loads(download(PRODUCT + 'assets/json/cardlist.json', cache / 'cards.json'))
    listed = {card['number']: card for card in listing}
    def main_card(number):
        url = f'{DATABASE}/{number}'
        local = parse(download(url, cache / f'{number}-ja.html'))
        english = parse(download(url + '?translate=en', cache / f'{number}-en.html'))
        assert local.get('hp') == english.get('hp')
        return {**local, '_english': english, 'englishName': english['name']}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        cards = dict(zip(range(1, 79), pool.map(main_card, range(1, 79)), strict=True))
    for number, original, artist in ALTERNATES:
        cards[number] = {**copy.deepcopy(cards[original]), 'artist': artist}
    meta = {'id': 'm7_ja', 'name': 'ハドウシーカー', 'englishName': 'Aura Seeker',
            'language': 'ja', 'series': 'Mega Evolution', 'releaseDate': '2026-11-27',
            'total': len(cards), 'sourceUrl': PRODUCT,
            'logoUrl': 'https://www.serebii.net/card/logo/auraseeker.png'}
    for number, card in cards.items():
        if number in listed:
            row = listed[number]
            rarity = row['rarity']
            scan = PRODUCT + 'assets/images/card/' + row['name'] + '.webp'
        else:
            rarity = 'AR' if number in (81, 84, 86) else 'SAR'
            scan = f'https://www.serebii.net/card/auraseeker/{number}.jpg'
        raw, canonical = RARITIES[rarity]
        card.update(id=f'm7_ja-{number}', number=str(number), printedNumber=f'{number:03}/078',
                    imageUrlHiRes=scan, set=meta, rarity=raw, rarityCanonical=canonical,
                    variants=[{'name': 'normal' if rarity in ('C', 'U') else 'holofoil'}])
    (CACHE / 'cards-m7_ja.json').write_text(json.dumps(list(cards.values()), ensure_ascii=False))
