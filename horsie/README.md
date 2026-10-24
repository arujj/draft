# horsie 🐎

A procedurally animated horse built with **React Native Reanimated 4** and **Gesture Handler 3**,
running on Expo SDK 58. Everything moves on the UI thread from one `useFrameCallback` clock.
There are no sprites or Lottie files: the horse is about 30 `Animated.View`s in a nested rig.

## Interactions

| Gesture | What happens |
| --- | --- |
| Drag ← → anywhere | Throttle: idle → walk → trot → canter → gallop, with gait-correct leg phasing |
| Tap | Rears up with a "NEIGH!" bubble (medium haptic) |
| Double-tap | Jumps and tucks its legs, then squashes on landing (heavy haptic) |
| Long-press | Pets the horse: happy eyes, nuzzle and a burst of hearts |
| Tap the sun | Fades to night with twinkling stars and a moon |

There's also parallax scenery (clouds, two hill layers, fence, grass and flowers), hoof dust at speed,
a flowing mane and tail, blinking, ear twitches and breathing while idle.

## Run it on your phone

```bash
npm install
npx expo start      # scan the QR with Expo Go
```

## Single-file web build

```bash
npm run build:web   # → dist/horsie.html, one self-contained page
```
