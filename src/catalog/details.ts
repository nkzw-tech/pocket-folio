const locales = ['en', 'local'] as const;
export type Translation<T = string> = Record<(typeof locales)[number], T>;
export type Energy =
  | 'colorless'
  | 'darkness'
  | 'dragon'
  | 'fairy'
  | 'fighting'
  | 'fire'
  | 'grass'
  | 'lightning'
  | 'metal'
  | 'psychic'
  | 'water';
export type Modifier = { energy: Energy; value: string };
type MoveText = Translation<{ name: string; text: string }>;
type Attack = MoveText & { cost: Array<Energy>; damage: string };
export type CardDetails = {
  artist?: string;
  attacks?: Array<Attack>;
  energy?: Energy;
  hp?: number;
  kind:
    | 'basicEnergy'
    | 'pokemon'
    | 'specialEnergy'
    | 'stage1'
    | 'stage2'
    | 'technicalMachine'
    | 'trainer';
  pokemon?: {
    energy: Energy;
    evolvesFrom?: Translation;
    hp?: number;
    resistance?: Modifier;
    resistances?: Array<Modifier>;
    retreat: number;
    types?: Array<Energy>;
    weakness?: Modifier;
    weaknesses?: Array<Modifier>;
  };
  powers?: Array<MoveText>;
  rarity?: 'common' | 'holo-rare' | 'promo' | 'rare' | 'secret' | 'uncommon';
  rules?: Translation;
};
