import type { SharedValue } from 'react-native-reanimated';

/** All animation state lives on the UI thread as shared values. */
export type World = {
  time: SharedValue<number>; // seconds since mount
  speed: SharedValue<number>; // 0 (idle) .. 1 (full gallop), eased toward target
  target: SharedValue<number>; // where the rider wants the speed to be
  phase: SharedValue<number>; // 0..1 position within the current stride
  dist: SharedValue<number>; // px travelled, drives the parallax scenery
  rear: SharedValue<number>; // 0..1 rearing pose
  jump: SharedValue<number>; // 0..1 progress through a jump arc
  squash: SharedValue<number>; // landing squash, 0..1
  pet: SharedValue<number>; // 0..1 progress of the hearts burst
  night: SharedValue<number>; // 0 = day, 1 = night
};

export const GAITS = ['Idle', 'Walk', 'Trot', 'Canter', 'Gallop'] as const;

export function gaitIndex(s: number) {
  'worklet';
  if (s < 0.05) return 0;
  if (s < 0.35) return 1;
  if (s < 0.62) return 2;
  if (s < 0.85) return 3;
  return 4;
}

export function mix(a: number, b: number, t: number) {
  'worklet';
  return a + (b - a) * t;
}

export function wrap(x: number, span: number) {
  'worklet';
  return ((x % span) + span) % span;
}

export const rad = (r: number) => {
  'worklet';
  return `${r}rad`;
};

/** Deterministic pseudo-random so scenery is stable between renders. */
export function rand(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
