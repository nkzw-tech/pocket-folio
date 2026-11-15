"""Preserve printed Japanese rarity tiers instead of collapsing them into secret rare."""
JAPANESE_RARITIES = {
    '通常': 'Common', '非': 'Uncommon', '希少': 'Rare',
    'レアホロ': 'Holo Rare', 'ホロ': 'Holo Rare', 'プロモ': 'Promo',
    'ダブルレア': 'RR', 'トリプルレア': 'RRR', 'スーパーレア': 'SR',
    'ウルトラレア': 'UR', 'ハイパーレア': 'HR',
    'アートレア': 'AR', 'スペシャルアートレア': 'SAR',
    'キャラクターレア': 'CHR', '超高級キャラクター': 'CSR',
    '色違いレア': 'S', '色違い超レア': 'SSR',
    '超ウルトラレア': 'MUR', 'メガアタックレア': 'MAR',
    'ACE SPEC': 'ACE SPEC', 'プリズムレア': 'Prism Star',
    'ピカチュウレア': 'Pikachu Rare', 'RGBレア': 'RGB Rare',
    'フューチャリスティックレア': 'Futuristic Rare', '黒白稀': 'Black White Rare',
}
BASIC_RARITIES = {
    'common': 'Common', 'uncommon': 'Uncommon', 'rare': 'Rare',
    'holo-rare': 'Holo Rare', 'promo': 'Promo', 'secret': 'Secret Rare',
}
ENGLISH_RARITIES = {
    'Rare Holo': 'Holo Rare', 'Rare Ultra': 'Ultra Rare',
    'Rare Secret': 'Secret Rare', 'Rare Rainbow': 'Rainbow Rare',
    'Rare Prism Star': 'Prism Star', 'ACE SPEC Rare': 'ACE SPEC',
    'Holo Rare V': 'Rare Holo V', 'Holo Rare VMAX': 'Rare Holo VMAX',
    'Holo Rare VSTAR': 'Rare Holo VSTAR',
}

def filter_rarity(card, language):
    raw = card.get('rarity') or ''
    if language == 'ja':
        if raw and raw not in JAPANESE_RARITIES:
            raise ValueError(f'Unmapped Japanese rarity: {raw}')
        return JAPANESE_RARITIES.get(raw, 'Unspecified')
    return ENGLISH_RARITIES.get(raw, raw) or BASIC_RARITIES.get(card.get('rarityCanonical'), 'Unspecified')
