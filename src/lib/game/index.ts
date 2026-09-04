// Game registry — all games available in CLAWCADE

import { GameFactory } from '@/components/game/GameCanvas';
import { createCryptoSmash } from './games/crypto-smash';
import { createChomper } from './games/chomper';
import { createSwarm } from './games/swarm';
import { createCascade } from './games/cascade';
import { createRocketRide } from './games/rocket-ride';

export const GAMES: GameFactory[] = [
  {
    id: 'crypto-smash',
    name: 'Crypto Smash',
    category: 'action',
    description: 'Punch and kick rug-pull scammers! Combo attacks for bonus points. Watch out for honeypots and dumpster fires.',
    controls: '←→ / A D to move • Z to attack (facing) • X projectile • Up/W to jump (tap)',
    create: createCryptoSmash,
  },
  {
    id: 'chomper',
    name: '$CLAW Chomper',
    category: 'maze',
    description: 'Navigate the maze and collect all the $CLAW coins! Avoid the bear ghosts — or grab Diamond Hands to turn the tables.',
    controls: 'Arrow keys / WASD to move',
    create: createChomper,
  },
  {
    id: 'swarm',
    name: 'Crypto Swarm',
    category: 'survival',
    description: 'Survive the endless swarm! Auto-attack enemies as they close in. Level up your weapon and fight for every second.',
    controls: 'Arrow keys / WASD to move (auto-attack)',
    create: createSwarm,
  },
  {
    id: 'cascade',
    name: 'Cascade',
    category: 'puzzle',
    description: 'Match 3+ crypto symbols to clear them! Chain combos for massive multipliers. How high can your score go?',
    controls: 'Tap/click select→swap • Arrows move cursor • Z select • Enter swap',
    create: createCascade,
  },
  {
    id: 'rocket-ride',
    name: 'Rocket Ride',
    category: 'runner',
    description: 'Ride the rocket to the moon! Dodge FUD clouds and bear candles. Collect green candles for points and boosts.',
    controls: '← → / A D to steer · drag/touch toward where you want to go',
    mobilePad: 'horizontal',
    create: createRocketRide,
  },
];

export function getGameBySlug(slug: string): GameFactory | undefined {
  return GAMES.find((g) => g.id === slug);
}
