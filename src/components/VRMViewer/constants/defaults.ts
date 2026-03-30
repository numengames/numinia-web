// Animation and environment defaults for VRM viewer
// Animations are Mixamo-rigged GLB files stored in the data repo or R2.
// The animationLoader auto-detects format (GLB or FBX) from URL extension.

// Fallback to FBX on opensourceavatars.com until GLB versions are uploaded
const ANIMATION_BASE_LEGACY = 'https://assets.opensourceavatars.com/animations';
const ANIMATION_BASE_R2 = 'https://pub-eda9f42266254c179ab493dd1594bb5a.r2.dev/content/animations';

export const DEFAULT_ANIMATION = `${ANIMATION_BASE_LEGACY}/Warrior%20Idle.fbx`;
export const DEFAULT_ENVIRONMENT = 'https://assets.opensourceavatars.com/environments/cubeScene7.glb';

// Available Mixamo animations
// When GLB versions are uploaded to R2, change URLs from LEGACY to R2
// When R2 GLB versions are uploaded, swap ANIMATION_BASE_LEGACY → ANIMATION_BASE_R2
// and change .fbx → .glb for each entry.
export const ANIMATIONS = [
  { name: 'T-Pose (Default)', url: '' },
  { name: 'Warrior Idle', url: `${ANIMATION_BASE_LEGACY}/Warrior%20Idle.fbx` },
  { name: 'Bored', url: `${ANIMATION_BASE_LEGACY}/Bored.fbx` },
  { name: 'Fight Idle', url: `${ANIMATION_BASE_LEGACY}/Fight%20Idle.fbx` },
  { name: 'Looking Around', url: `${ANIMATION_BASE_LEGACY}/Looking%20Around.fbx` },
  { name: 'Offensive Idle', url: `${ANIMATION_BASE_LEGACY}/Offensive%20Idle.fbx` },
  { name: 'Texting While Standing', url: `${ANIMATION_BASE_LEGACY}/Texting%20While%20Standing.fbx` },
] as const;

// Pick a random animation for initial load (excluding T-Pose)
export function getRandomAnimation(): string {
  const playable = ANIMATIONS.filter(a => a.url !== '');
  if (playable.length === 0) return '';
  return playable[Math.floor(Math.random() * playable.length)].url;
}
