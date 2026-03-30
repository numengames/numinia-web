// Animation and environment defaults for VRM viewer

const ANIMATION_BASE = 'https://assets.opensourceavatars.com/animations';

export const DEFAULT_ANIMATION = `${ANIMATION_BASE}/Warrior%20Idle.fbx`;
export const DEFAULT_ENVIRONMENT = 'https://assets.opensourceavatars.com/environments/cubeScene7.glb';

// Available Mixamo animations — displayed in the animation panel
// Names match the FBX filenames on assets.opensourceavatars.com
export const ANIMATIONS = [
  { name: 'T-Pose (Default)', url: '' },
  { name: 'Warrior Idle', url: `${ANIMATION_BASE}/Warrior%20Idle.fbx` },
] as const;

// Pick a random animation for initial load (excluding T-Pose)
export function getRandomAnimation(): string {
  const playable = ANIMATIONS.filter(a => a.url !== '');
  if (playable.length === 0) return '';
  return playable[Math.floor(Math.random() * playable.length)].url;
}
