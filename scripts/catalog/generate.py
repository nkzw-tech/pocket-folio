"""Normalize cached sources into stable, lightweight packs and lazy card rules."""
import json
import html
import re
from pathlib import Path
from fetch import CACHE, EN, JA, DE, REFERENCE
from rarities import BASIC_RARITIES, filter_rarity

OUT = Path('public/card-details')
OUT.mkdir(parents=True, exist_ok=True)
SET_ENGLISH_NAMES = {'sv9a_ja': 'Heat Wave Arena', 'swsh7d_ja': 'Towering Perfection'}
ENERGY = dict(zip(['Colorless','Darkness','Dragon','Fairy','Fighting','Fire','Grass','Lightning','Metal','Psychic','Water'], ['colorless','darkness','dragon','fairy','fighting','fire','grass','lightning','metal','psychic','water']))
ENERGY.update(dict(zip(['無','悪','竜','妖','闘','炎','草','雷','鋼','超','水'], ['colorless','darkness','dragon','fairy','fighting','fire','grass','lightning','metal','psychic','water'])))
ENERGY['Unlicht'] = 'darkness'
ENERGY.update(dict(zip(['Farblos','Finsternis','Drache','Fee','Kampf','Feuer','Pflanze','Elektro','Metall','Psycho','Wasser'], ['colorless','darkness','dragon','fairy','fighting','fire','grass','lightning','metal','psychic','water'])))

def energy(value):
    if value not in ENERGY:
        raise ValueError(f'Unknown energy: {value}')
    return ENERGY[value]

def clean(value):
    return re.sub(r'\[([CDFGLMNPRWY])\]', r'{\1}', html.unescape(re.sub(r'<br\s*/?>', '\n', value or '', flags=re.I))).strip()

def pair(local, english=''):
    return {'en': clean(english), 'local': clean(local)}

def move(value):
    return {'name': clean(value.get('name')), 'text': clean(value.get('text') or value.get('effect'))}

def modifier(value):
    return {'energy': energy(value['type']), 'value': value.get('value','')}

def translation_value(field, value):
    # Ignore source-only fields and equivalent spellings of a free attack when
    # deciding whether several reprints offer the same English translation.
    if field == 'attacks' and value:
        return [{**move(a), 'damage': str(a.get('damage') or ''), 'cost': [t for t in a.get('cost') or [] if t != 'Free']} for a in value]
    if field == 'abilities' and value:
        return [move(a) for a in value]
    if field == 'rules' and value:
        return [clean(rule) for rule in value]
    return value

def load(id):
    return json.loads((CACHE / f'cards-{id}.json').read_text())

english = {id: load(id) for id in EN + REFERENCE}
all_en = [card for cards in english.values() for card in cards]
by_name = {}
for card in all_en:
    by_name.setdefault(re.sub(r'^Unown \[(.)\]$', r'Unown \1', card['name']), []).append(card)

def counterpart(card):
    if card['set']['language'] == 'en':
        return card
    candidates = by_name.get(re.sub(r'^Unown \[(.)\]$', r'Unown \1', card.get('englishName') or ''), [])
    def mechanics(c):
        return [[str(a.get('damage') or '').replace('×','x'), [ENERGY.get(t,t) for t in a.get('cost') or [] if t != 'Free']] for a in c.get('attacks') or []]
    candidates = [c for c in candidates if (c.get('hp') == card.get('hp') or card.get('supertype') not in ['Pokémon','Pokemon','ポケモン']) and mechanics(c) == mechanics(card)]
    same_artist = [c for c in candidates if c.get('artist') == card.get('artist')]
    if same_artist:
        candidates = same_artist
    # Prefer known corresponding English printings over other reprints with
    # revised wording, after matching name, HP, attacks and artist above.
    original_sets = {'swsh10b_ja':'pgo','base1_ja':'base1', 'base2_ja':'base2', 'base3_ja':'base3', 'base4_ja':'base5', 'sm8b_ja':'sma'}
    original = [c for c in candidates if c['set']['id'] == original_sets.get(card['set'].get('id'))]
    if original:
        candidates = original
    # Resolve each field independently: a reprint's rule-box wording can differ
    # while its attack and Ability translations remain identical.
    result = {}
    if candidates:
        result['name'] = candidates[0]['name']
        for field in ['attacks','abilities','rules','evolvesFrom']:
            values = {json.dumps(translation_value(field, c.get(field)), sort_keys=True) for c in candidates}
            if len(values) == 1:
                result[field] = json.loads(next(iter(values)))
    return result

def details(card, other, lang):
    pokemon = card.get('supertype') in ['Pokémon','Pokemon','ポケモン']
    subtype = card.get('subtype') or ''
    kind = 'stage2' if any(s in subtype for s in ['Stage 2','2進化','Stage2','Rang 2']) else 'stage1' if any(s in subtype for s in ['Stage 1','1進化','Stage1','Rang 1']) else 'pokemon'
    if not pokemon:
        is_energy = card.get('supertype') in ['Energy','エネルギー','Energie']
        is_basic = any(s in subtype for s in ['Basic','基本','Normal']) or card['name'].startswith('基本')
        kind = 'basicEnergy' if is_energy and is_basic else 'specialEnergy' if is_energy else 'trainer'
    result = {'kind':kind}
    if not pokemon and card.get('hp'):
        result['hp'] = int(card['hp'])
    if card.get('artist'):
        result['artist'] = card['artist']
    rarity = card.get('rarityCanonical') or ''
    result['rarity'] = rarity if rarity in ['common','uncommon','rare','holo-rare','promo'] else 'secret' if any(s in rarity for s in ['secret','illustration','ultra','hyper']) else 'rare'
    types = [energy(t) for t in card.get('types') or []]
    if pokemon:
        result['pokemon'] = {'energy': types[0] if types else 'colorless', 'types': types, **({'hp': int(card['hp'])} if card.get('hp') else {}), 'retreat': len(card.get('retreat') or [])}
        for field in ['weaknesses','resistances']:
            if card.get(field):
                result['pokemon'][field] = [modifier(v) for v in card[field]]
        if card.get('evolvesFrom'):
            result['pokemon']['evolvesFrom'] = pair(', '.join(card['evolvesFrom']), ', '.join(other.get('evolvesFrom') or []))
    elif types:
        result['energy'] = types[0]
    attacks = card.get('attacks') or []
    if lang == 'de' and other.get('attacks'):
        def signature(a):
            return ([energy(t) for t in a.get('cost') or [] if t != 'Free'], str(a.get('damage') or '').replace('×','x'))
        attacks = [next((a for a in attacks if signature(a) == signature(en)), {**en, 'name':'', 'text':'', 'effect':''}) for en in other['attacks']]
    en_attacks = card.get('englishAttacks') or other.get('attacks') or []
    reference = other.get('attacks') or []
    en_attacks = [attack if attack.get('name') else reference[i] if i < len(reference) else attack for i,attack in enumerate(en_attacks)]
    if attacks:
        result['attacks'] = [{'cost': [energy(t) for t in a.get('cost') or [] if t not in ['Free','無0','0']], 'damage': str(a.get('damage') or ''), 'local': move(a), 'en': move(en_attacks[i]) if i < len(en_attacks) else move({})} for i,a in enumerate(attacks)]
    if card.get('abilities'):
        en = other.get('abilities') or []
        result['powers'] = [{'local':move(a), 'en':move(en[i]) if i < len(en) else move({})} for i,a in enumerate(card['abilities'])]
    if card.get('rules'):
        result['rules'] = pair('\n'.join(card['rules']), '\n'.join(other.get('rules') or []))
    return result

packs = []
images = []
audit = []
detail_sets = {}
reprint_references = {}

def emit(source_id, cards, metadata, lang, source):
    id = f'{lang}-{source_id.removesuffix("_ja")}'
    rules = {}
    output = []
    missing_en = 0
    for c in cards:
        other = c.get('_english') or counterpart(c)
        key = c.get('id', '').removeprefix(source_id+'-') or c['number']
        cid = f'{id}-{key}'
        ename = c.get('englishName') or other.get('name') or c['name']
        variants = [v['name'] for v in c.get('variants') or []]
        first = any('firstEdition' in v for v in variants)
        editions = (['unlimited','first'] if any('unlimited' in v.lower() or v in ['normal','holofoil'] for v in variants) else ['first']) if first else ['unlimited'] if metadata['releaseYear'] <= 2002 and lang != 'ja' else ['unspecified']
        # Ordinary set finishes only; exclude stamped, jumbo, error and prize printings.
        finishes = [v for v in variants if v in ['normal','holofoil','reverseHolofoil','unlimited','unlimitedHolofoil']]
        rarity = c.get('rarityCanonical') or ''
        fullart = any(s in rarity for s in ['illustration','ultra','hyper','secret','full-art','amazing','shiny','black-white','futuristic','radiant']) or source_id.endswith(('gg','tg'))
        foil = 'fullart' if fullart else 'modern' if metadata['releaseYear'] >= 2003 and (rarity == 'holo-rare' or ('holofoil' in finishes and 'normal' not in finishes)) else 'base' if source_id == 'base1' and rarity == 'holo-rare' else 'wizards' if rarity == 'holo-rare' else None
        row = {'id':cid, 'localName':c['name'], 'english':ename, 'number':c.get('printedNumber'), 'editions':editions, 'defaultEdition':editions[0], 'image':f'/cards/catalog/{cid}.webp', 'language':lang, 'detailsPath':f'/card-details/{id}.json'}
        row['rarity'] = filter_rarity(c, lang)
        # These source keys are unnumbered oversized promos, not card numbers.
        # https://www.pokemon-card.com/info/003689.html
        if source_id == 'swshp_ja' and c['id'] in [f'swshp_ja-{n}' for n in range(500,506)]:
            row.update({'localName':c['name']+'（ジャンボ）', 'english':ename+' (Jumbo)', 'number':None})
        if c.get('_imagePath'):
            row['image'] = c['_imagePath']
            row['imageLanguage'] = 'en'
        if foil:
            row['foil'] = foil
        if finishes:
            row['finishes'] = list(dict.fromkeys(finishes))
        output.append(row)
        rules[cid] = details(c, other, lang)
        if lang != 'en' and any(not a['en']['name'] for a in rules[cid].get('attacks', [])):
            missing_en += 1
        images.append({'id':cid, 'url':c['imageUrlHiRes'], 'path':'public'+row['image']})
    assert len({c['id'] for c in output}) == len(output), id
    packs.append({**metadata, 'id':id, 'language':lang, 'cards':output})
    detail_sets[id] = rules
    audit.append({'id':id, 'name':metadata['label'], 'language':lang, 'cards':len(output), 'source':source, 'cardsMissingEnglishAttacks':missing_en, 'englishReferenceScans':sum(bool(c.get('imageLanguage')) for c in output), 'reprintRuleReferences':reprint_references.get(source_id, [])})

overrides = json.loads(Path('scripts/catalog/overrides.json').read_text())
for source_id in EN + JA:
    cards = load(source_id)
    for card in cards:
        if card['id'] == 'm5_ja-72':
            card['englishName'] = 'Antique Armor Fossil'
        if (CACHE / f'repair-{card["id"]}.json').exists():
            verified = json.loads((CACHE / f'repair-{card["id"]}.json').read_text())
            assert verified['name'] == card['name']
            card.update({'hp':str(verified.get('hp') or card.get('hp')), 'attacks':verified.get('attacks'), 'types':verified.get('types'), 'weaknesses':verified.get('weaknesses'), 'resistances':verified.get('resistances'), 'retreat':['Colorless']*(verified.get('retreat') or 0), 'subtype':verified.get('stage'), 'abilities':verified.get('abilities', card.get('abilities')), 'evolvesFrom':[verified['evolveFrom']] if verified.get('evolveFrom') else None})
        if card['id'] in ['neo4_ja-50', 'neo4_ja-51']:
            # Both original scans print HP50; the source roster incorrectly says HP40.
            card['hp'] = '50'
        if card['id'] in overrides:
            card.update(overrides[card['id']]['fields'])
    # Alternate-art rows sometimes omit their complete rules. Reuse rules only
    # from an unambiguous same-set printing with identical name, HP, stage and
    # types. Keep artwork, printed numbers and IDs specific to each printing.
    for card in cards:
        if card.get('supertype') != 'ポケモン' or card.get('attacks') or card.get('abilities'):
            continue
        candidates = [c for c in cards if (c.get('attacks') or c.get('abilities')) and all(c.get(field) == card.get(field) for field in ['name','hp','subtype','types'])]
        fields = ['attacks','abilities','rules']
        signatures = {json.dumps({field:c.get(field) for field in fields}, sort_keys=True) for c in candidates}
        if len(signatures) == 1:
            reference = candidates[0]
            card.update({field:reference.get(field) for field in fields + ['englishAttacks']})
            reprint_references.setdefault(source_id, []).append({'card':card['id'], 'reference':reference['id']})
    meta = cards[0]['set']
    language = meta['language']
    assert language in ['en','ja']
    assert len(cards) == meta['total'], (source_id,len(cards),meta['total'])
    emit(source_id, cards, {'label':meta['name'], 'englishLabel':SET_ENGLISH_NAMES.get(source_id) or meta.get('englishName') or meta['name'], 'releaseYear':int(meta['releaseDate'][:4]), 'era':meta['series']}, language, f'https://shinybeak.com/sets/{source_id}')

mapping = {'swsh10.5':'pgo','sv03.5':'sv3pt5','swsh12.5':'swsh12pt5','swsh12.5gg':'swsh12pt5gg'}
for source_id in DE:
    raw = load('de-'+source_id)
    meta = json.loads((CACHE / f'de-set-{source_id}.json').read_text())
    en_cards = {str(c['number']).lstrip('0'):c for c in english[mapping.get(source_id,source_id)]}
    converted = []
    for c in raw:
        key = re.sub(r'^H0', 'H', c['localId']).lstrip('0')
        en = en_cards.get(key) or en_cards.get(re.sub(r'[ab]$', '', key)) or {}
        variants = c.get('variants', {})
        rarity = en.get('rarityCanonical') or ('holo-rare' if variants.get('holo') and not variants.get('normal') else 'rare')
        image = c['image']+'/high.webp' if c.get('image') else en.get('imageUrlHiRes')
        assert image, ('Missing scan and reference', source_id, c['localId'])
        converted.append({'name':c['name'],'number':c['localId'], 'printedNumber':f'{c["localId"]}/{meta["cardCount"]["official"]}', 'supertype':c.get('category'),'subtype':c.get('stage') or c.get('energyType'),'hp':str(c['hp']) if c.get('hp') else None,'artist':c.get('illustrator'),'types':c.get('types'),'attacks':c.get('attacks'),'abilities':c.get('abilities'),'rules':[c['effect']] if c.get('effect') else None,'weaknesses':c.get('weaknesses'),'resistances':c.get('resistances'),'retreat':['Colorless']*(c.get('retreat') or 0),'evolvesFrom':[c['evolveFrom']] if c.get('evolveFrom') else None,'rarityCanonical':rarity,'variants':[{'name':v} for key,v in [('normal','normal'),('holo','holofoil'),('reverse','reverseHolofoil'),('firstEdition','firstEdition')] if variants.get(key)],'imageUrlHiRes':image, '_imagePath':f'/cards/catalog/en-{en["id"]}.webp' if not c.get('image') else None, '_english':en,'set':{'language':'de'}})
    emit(source_id, converted, {'label':meta['name'], 'englishLabel':english[mapping.get(source_id,source_id)][0]['set']['name'], 'releaseYear':int(meta['releaseDate'][:4]), 'era':english[mapping.get(source_id,source_id)][0]['set']['series']}, 'de', f'https://api.tcgdex.net/v2/de/sets/{source_id}')

# Reuse already verified translations across exact Japanese reprint text.
powers_bank = {}
rules_bank = {}
for sid, cards in detail_sets.items():
    if sid.startswith('ja-'):
        for card in cards.values():
            for power in card.get('powers', []):
                if power['en']['name']:
                    powers_bank.setdefault(json.dumps(power['local'],sort_keys=True), set()).add(json.dumps(power['en'],sort_keys=True))
            rule = card.get('rules')
            if rule and rule['en']:
                rules_bank.setdefault(rule['local'], set()).add(rule['en'])
for sid, cards in detail_sets.items():
    if sid.startswith('ja-'):
        for card in cards.values():
            for power in card.get('powers', []):
                found = powers_bank.get(json.dumps(power['local'],sort_keys=True), set())
                if not power['en']['name'] and len(found) == 1:
                    power['en'] = json.loads(next(iter(found)))
            rule = card.get('rules')
            if rule and not rule['en'] and len(rules_bank.get(rule['local'], set())) == 1:
                rule['en'] = next(iter(rules_bank[rule['local']]))
    (OUT / f'{sid}.json').write_text(json.dumps(cards, ensure_ascii=False, separators=(',',':'))+'\n')
for entry in audit:
    cards = detail_sets[entry['id']]
    entry['cardsMissingEnglishPowers'] = sum(any(not power['en']['name'] for power in card.get('powers', [])) for card in cards.values())
    entry['cardsMissingEnglishRules'] = sum(bool(card.get('rules', {}).get('local')) and not card['rules']['en'] for card in cards.values())

compact = [{**{k:v for k,v in pack.items() if k != 'cards'}, 'cards': [[card['id'].removeprefix(pack['id']+'-'), card['localName'], card['english'], card['number'], card['editions'], card.get('foil'), card.get('finishes', []), card['image'] if card.get('imageLanguage') else None, card.get('imageLanguage'), card['rarity']] for card in pack['cards']]} for pack in packs]
Path('src/catalog/packs.json').write_text(json.dumps(compact,ensure_ascii=False,separators=(',',':'))+'\n')
(CACHE / 'images.json').write_text(json.dumps(images,ensure_ascii=False))
Path('src/catalog/sources.json').write_text(json.dumps({'retrieved':'2026-11-17','sets':audit},ensure_ascii=False,indent=2)+'\n')
print(len(packs),'sets;',sum(len(p['cards']) for p in packs),'cards')
print('English attack gaps:', [(a['id'],a['cardsMissingEnglishAttacks']) for a in audit if a['cardsMissingEnglishAttacks']])

# Original embedded collections also need lightweight rarity metadata for browsing.
original_rarities = {}
for filename in ['german-card-details', 'vs-card-details']:
    for card_id, card in json.loads(Path(f'src/{filename}.json').read_text()).items():
        original_rarities[card_id] = BASIC_RARITIES.get(card.get('rarity'), 'Unspecified')
Path('src/catalog/original-rarities.json').write_text(json.dumps(original_rarities, ensure_ascii=False, separators=(',', ':'))+'\n')
