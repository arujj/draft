import type { SharedValue } from 'react-native-reanimated';

/** All animation state lives on the UI thread as shared values. */
export type World = {
  time: SharedValue<number>; // seconds since mount
  speed: SharedValue<number>; // playback multiplier, eased toward target (1 = the docs site's 22 fps)
  target: SharedValue<number>; // where the drag throttle wants the speed to be
  slow: SharedValue<number>; // 0..1 slow-motion blend while holding
  frame: SharedValue<number>; // fractional index into the 11-frame gallop
  dist: SharedValue<number>; // px travelled, drives clouds and speed lines
  jump: SharedValue<number>; // 0..1 progress through a jump arc
  squash: SharedValue<number>; // landing squash, 0..1
  spin: SharedValue<number>; // rotation in turns for the double-tap flip
  night: SharedValue<number>; // 0 = light theme, 1 = dark theme
};

export const FRAME_COUNT = 11;
export const BASE_FPS = 22;
export const MAX_SPEED = 3;

/** Effective playback rate after slow motion is applied. */
export function effectiveSpeed(w: World) {
  'worklet';
  return w.speed.value * (1 - 0.85 * w.slow.value);
}

export function wrap(x: number, span: number) {
  'worklet';
  return ((x % span) + span) % span;
}
