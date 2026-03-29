export type PlayerId = string;

export interface Entity {
  id: string;
  type: 'tower' | 'troop';
  owner: PlayerId;
  cardId?: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  speed: number;
  attackSpeed: number;
  lastAttackTime: number;
  targetId?: string;
  targetsBuildingsOnly?: boolean;
}

export interface Projectile {
  id: string;
  owner: PlayerId;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
}

export interface PlayerState {
  id: PlayerId;
  elixir: number;
  crowns: number;
  deck: string[];
  hand: string[];
  nextCard: string;
}

export interface GameState {
  roomId: string;
  players: Record<PlayerId, PlayerState>;
  entities: Entity[];
  projectiles: Projectile[];
  timeRemaining: number;
  status: 'waiting' | 'playing' | 'ended';
  winner?: PlayerId | 'draw';
}

export interface CardData {
  id: string;
  name: string;
  cost: number;
  hp: number;
  damage: number;
  range: number;
  speed: number;
  attackSpeed: number;
  targetsBuildingsOnly?: boolean;
  color: string;
  emoji: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}
