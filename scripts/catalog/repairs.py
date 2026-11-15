"""Use independent TCGdex rules for Japanese alternate-art records with missing HP."""
import concurrent.futures
import json
from fetch import CACHE, JA, download


def repair(item):
    sid, card = item
    api_id = sid.removesuffix('_ja').upper() + '-' + card['id'].split('-')[-1].zfill(3)
    path = CACHE / f'repair-{card["id"]}.json'
    value = json.loads(download(f'https://api.tcgdex.net/v2/ja/cards/{api_id}', path))
    assert value.get('hp') or card['supertype'] != 'ポケモン', api_id
    assert value['name'] == card['name'], (api_id, value['name'], card['name'])
    return card['id']


if __name__ == '__main__':
    items = [(sid,card) for sid in JA for card in json.loads((CACHE / f'cards-{sid}.json').read_text()) if (card.get('supertype') == 'ポケモン' and not card.get('hp')) or card['id'] in ['m2a_ja-17','m2a_ja-26','m2a_ja-119','m2a_ja-125','m2a_ja-197','m5_ja-72']]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for index, id in enumerate(pool.map(repair, items),1):
            print(index, len(items), id, flush=True)
