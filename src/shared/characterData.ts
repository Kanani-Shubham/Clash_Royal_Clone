// Define unique color palettes for characters
export const CHARACTER_COLORS: Record<string, string> = {
  goblin: '#8BC34A', // Green
  skeleton: '#E0E0E0', // Light Grey
  knight: '#FFEB3B', // Yellow
  wizard: '#2196F3', // Blue
  giant: '#795548', // Brown
  barbarian: '#FF9800', // Orange
  golem: '#607D8B', // Blue Grey
  archer: '#4CAF50', // Dark Green
  valkyrie: '#f97316', // Orange
  musketeer: '#6366f1', // Indigo
  hog_rider: '#b45309', // Dark Orange
  mini_pekka: '#374151', // Dark Gray
  bomber: '#ef4444', // Red
  balloon: '#0ea5e9', // Light Blue
};

// Define unique equipment and accessories for characters
export const CHARACTER_EQUIPMENT: Record<string, any> = {
  goblin: { weapon: 'dagger', armor: 'leather scraps', accessory: 'pouch' },
  skeleton: { weapon: 'short sword', armor: 'none', accessory: 'bone' },
  knight: { weapon: 'sword', armor: 'plate mail', accessory: 'shield' },
  wizard: { weapon: 'staff', armor: 'robes', accessory: 'hat' },
  giant: { weapon: 'club', armor: 'none', accessory: 'none' },
  barbarian: { weapon: 'axe', armor: 'fur pelt', accessory: 'belt' },
  golem: { weapon: 'fist', armor: 'rock', accessory: 'none' },
  archer: { weapon: 'bow', armor: 'leather tunic', accessory: 'quiver' },
  valkyrie: { weapon: 'axe', armor: 'leather', accessory: 'helmet' },
  musketeer: { weapon: 'musket', armor: 'leather', accessory: 'helmet' },
  hog_rider: { weapon: 'hammer', armor: 'leather', accessory: 'hog' },
  mini_pekka: { weapon: 'sword', armor: 'metal', accessory: 'horns' },
  bomber: { weapon: 'bomb', armor: 'none', accessory: 'goggles' },
  balloon: { weapon: 'bomb', armor: 'wood', accessory: 'balloon' },
};

// Define animation styles based on character type and role
export const CHARACTER_ANIMATIONS: Record<string, any> = {
  goblin: { idle: 'bouncy', walk: 'quick', attack: 'slash' },
  skeleton: { idle: 'jerky', walk: 'scurrying', attack: 'stab' },
  knight: { idle: 'standing', walk: 'marching', attack: 'swing' },
  wizard: { idle: 'floating', walk: 'smooth', attack: 'cast' },
  giant: { idle: 'heavy idle', walk: 'slow stomp', attack: 'smash' },
  barbarian: { idle: 'aggressive', walk: 'powerful stride', attack: 'heavy swing' },
  golem: { idle: 'rumbling', walk: 'earth shaking', attack: 'ground pound' },
  archer: { idle: 'alert', walk: 'light step', attack: 'shoot' },
  valkyrie: { idle: 'alert', walk: 'marching', attack: 'spin' },
  musketeer: { idle: 'alert', walk: 'marching', attack: 'shoot' },
  hog_rider: { idle: 'bouncy', walk: 'gallop', attack: 'swing' },
  mini_pekka: { idle: 'robotic', walk: 'marching', attack: 'slash' },
  bomber: { idle: 'bouncy', walk: 'quick', attack: 'throw' },
  balloon: { idle: 'floating', walk: 'floating', attack: 'drop' },
};

// Define body types and proportions for character variation
export const CHARACTER_BODY_TYPES: Record<string, any> = {
  small: { head: 1.8, arms: 0.6, body: 0.5, height: 10, radius: 6 },
  medium: { head: 1.2, arms: 1.0, body: 1.0, height: 18, radius: 10 },
  large: { head: 0.8, arms: 1.5, body: 1.8, height: 32, radius: 20 },
  tall: { head: 0.9, arms: 1.2, body: 0.8, height: 28, radius: 9 },
  wide: { head: 1.0, arms: 1.1, body: 1.6, height: 20, radius: 16 },
};

export const CHARACTER_MAPPING: Record<string, string> = {
  goblin: 'small',
  skeleton: 'small',
  knight: 'medium',
  wizard: 'tall',
  giant: 'large',
  barbarian: 'medium',
  golem: 'large',
  archer: 'medium',
  valkyrie: 'medium',
  musketeer: 'medium',
  hog_rider: 'wide',
  mini_pekka: 'small',
  bomber: 'small',
  balloon: 'large',
};
