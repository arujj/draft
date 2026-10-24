# horsie 🐎

The galloping horse from the [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
docs homepage, rebuilt as a React Native app you can play with on your phone. It uses the docs site's own
11-frame SVG flipbook, sun, swirl, clouds and stars, driven by **Reanimated 4** and **Gesture Handler 3**
on Expo SDK 58.

Artwork © Software Mansion, from `software-mansion/react-native-reanimated` (MIT), in `src/swmArt.ts`.

## Interactions

| Gesture | What happens |
| --- | --- |
| Drag ← → anywhere | Playback speed from a standstill up to 3× (1× = the site's 22 fps). Above 1× you get ghost trails, speed lines and dust |
| Tap | Jump with a squash on landing |
| Double-tap | Backflip |
| Hold | Slow motion until you let go |
| Tap the sun | Dark mode, using the site's dark palette (white horse, lilac moon, twinkling stars) |

## Run it on your phone

```bash
npm install
npx expo start      # scan the QR with Expo Go
```

## Single-file web build

```bash
npm run build:web   # → dist/horsie.html
```
