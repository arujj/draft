import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  useCompetingGestures,
  useExclusiveGestures,
  useLongPressGesture,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { HeroBackground, Sun } from './src/HeroBackground';
import { HORSE_ASPECT, HeroHorse } from './src/HeroHorse';
import { BASE_FPS, effectiveSpeed, MAX_SPEED, type World } from './src/world';

const haptic = {
  light: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  heavy: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  tick: () => Platform.OS !== 'web' && Haptics.selectionAsync(),
  success: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

function useWorld(): World {
  return {
    time: useSharedValue(0),
    speed: useSharedValue(0),
    target: useSharedValue(1),
    slow: useSharedValue(0),
    frame: useSharedValue(0),
    dist: useSharedValue(0),
    jump: useSharedValue(0),
    squash: useSharedValue(0),
    spin: useSharedValue(0),
    night: useSharedValue(0),
  };
}

function Ripple({ x, y, t, night }: { x: SharedValue<number>; y: SharedValue<number>; t: SharedValue<number>; night: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: t.value > 0 && t.value < 1 ? 0.6 * (1 - t.value) : 0,
    borderColor: interpolateColor(night.value, [0, 1], ['#782AEB', '#E9DBFF']),
    transform: [{ translateX: x.value - 40 }, { translateY: y.value - 40 }, { scale: 0.2 + t.value * 1.3 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, style]} />;
}

function Stage() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const w = useWorld();
  const [isNight, setIsNight] = useState(false);
  const [speedLabel, setSpeedLabel] = useState('1.0×');
  const [slowMo, setSlowMo] = useState(false);

  const horseSize = Math.min(width * 0.92, 440);
  const horseHeight = horseSize * HORSE_ASPECT;
  const horseTop = height * 0.52 - horseHeight / 2;
  const sunSize = Math.min(width * 0.62, 280);

  // One clock drives everything on the UI thread.
  useFrameCallback((f) => {
    const dt = Math.min((f.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    w.time.value += dt;
    w.speed.value += (w.target.value - w.speed.value) * (1 - Math.exp(-dt * 3));
    const s = effectiveSpeed(w);
    w.frame.value += dt * BASE_FPS * s;
    w.dist.value += dt * 240 * s;
  });

  useAnimatedReaction(
    () => Math.round(w.target.value * 10),
    (cur, prev) => {
      if (prev === null || cur === prev) return;
      scheduleOnRN(setSpeedLabel, `${(cur / 10).toFixed(1)}×`);
      if (cur % 5 === 0) scheduleOnRN(haptic.tick);
    },
  );

  // Drag left/right anywhere: playback speed from a standstill up to 3×.
  const panStart = useSharedValue(0);
  const pan = usePanGesture({
    minDistance: 8,
    onActivate: () => {
      panStart.value = w.target.value;
    },
    onUpdate: (e) => {
      const next = panStart.value + (e.translationX / (width * 0.8)) * MAX_SPEED;
      w.target.value = Math.min(MAX_SPEED, Math.max(0, next));
    },
  });

  const rx = useSharedValue(0);
  const ry = useSharedValue(0);
  const rt = useSharedValue(0);
  const ripple = (x: number, y: number) => {
    'worklet';
    rx.value = x;
    ry.value = y;
    rt.value = 0;
    rt.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) });
  };

  // Tap: jump.
  const tap = useTapGesture({
    onActivate: (e) => {
      ripple(e.x, e.y);
      if (w.jump.value > 0) return;
      scheduleOnRN(haptic.light);
      w.jump.value = withTiming(1, { duration: 620, easing: Easing.linear }, (done) => {
        w.jump.value = 0;
        if (!done) return;
        w.squash.value = withSequence(withTiming(1, { duration: 70 }), withSpring(0, { damping: 6, stiffness: 240 }));
        scheduleOnRN(haptic.heavy);
      });
    },
  });

  // Double-tap: backflip.
  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      ripple(e.x, e.y);
      w.spin.value = withSpring(Math.round(w.spin.value) - 1, { damping: 14, stiffness: 90 });
      scheduleOnRN(haptic.success);
    },
  });

  // Hold: slow motion until you let go.
  const longPress = useLongPressGesture({
    minDuration: 300,
    onActivate: () => {
      w.slow.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
      scheduleOnRN(setSlowMo, true);
      scheduleOnRN(haptic.light);
    },
    onFinalize: () => {
      if (w.slow.value === 0) return;
      w.slow.value = withTiming(0, { duration: 600, easing: Easing.inOut(Easing.cubic) });
      scheduleOnRN(setSlowMo, false);
    },
  });

  const taps = useExclusiveGestures(doubleTap, tap);
  const gesture = useCompetingGestures(pan, longPress, taps);

  const toggleNight = () => {
    const next = !isNight;
    setIsNight(next);
    w.night.value = withTiming(next ? 1 : 0, { duration: 900, easing: Easing.inOut(Easing.cubic) });
    haptic.tick();
  };

  // The site's sun drifts on a 45 s loop.
  const sunFloat = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.sin((w.time.value / 45) * 2 * Math.PI) * 18 },
      { translateY: Math.cos((w.time.value / 45) * 2 * Math.PI) * 10 },
      { scale: 1 + 0.02 * Math.sin(w.time.value * 1.3) },
    ],
  }));
  const sunDay = useAnimatedStyle(() => ({ opacity: 1 - w.night.value }));
  const sunNight = useAnimatedStyle(() => ({ opacity: w.night.value }));

  const meterFill = useAnimatedStyle(() => ({
    width: `${(w.speed.value / MAX_SPEED) * 100}%`,
    backgroundColor: interpolateColor(w.night.value, [0, 1], ['#782AEB', '#B07EFF']),
  }));
  const meterThumb = useAnimatedStyle(() => ({ left: `${(w.target.value / MAX_SPEED) * 100}%` }));
  const slowBadge = useAnimatedStyle(() => ({
    opacity: w.slow.value,
    transform: [{ scale: 0.8 + 0.2 * w.slow.value }],
  }));

  const ink = isNight ? '#F8F9FF' : '#001A72';
  const accent = isNight ? '#E9DBFF' : '#782AEB';
  const dash = isNight ? '#C1C6E5' : '#001A72';

  return (
    <View style={styles.fill}>
      <StatusBar style={isNight ? 'light' : 'dark'} />
      <GestureDetector gesture={gesture}>
        <View style={styles.fill} collapsable={false}>
          <HeroBackground
            w={w}
            width={width}
            height={height}
            horseTop={horseTop}
            horseHeight={horseHeight}
            isNight={isNight}
          />
          <View style={{ position: 'absolute', top: horseTop, left: (width - horseSize) / 2 }} pointerEvents="none">
            <HeroHorse w={w} size={horseSize} isNight={isNight} />
          </View>
          <Ripple x={rx} y={ry} t={rt} night={w.night} />
        </View>
      </GestureDetector>

      {/* Sun sits outside the gesture area so it can be a plain button: tap it for dark mode. */}
      <Animated.View style={[styles.sunSlot, { top: insets.top + 64, right: -sunSize * 0.28 }, sunFloat]}>
        <Pressable onPress={toggleNight} accessibilityRole="button" accessibilityLabel="Toggle dark mode">
          <View style={{ width: sunSize, height: sunSize }}>
            <Animated.View style={[StyleSheet.absoluteFill, sunDay]}>
              <Sun mode="light" size={sunSize} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, sunNight]}>
              <Sun mode="dark" size={sunSize} />
            </Animated.View>
          </View>
        </Pressable>
      </Animated.View>

      <View pointerEvents="none" style={[styles.header, { paddingTop: insets.top + 18 }]}>
        <Text style={[styles.overline, { color: ink }]}>React Native</Text>
        <View style={[styles.selection, { borderColor: dash }]}>
          <Text style={[styles.title, { color: accent }]}>horsie</Text>
          {[styles.handleTL, styles.handleTR, styles.handleBL, styles.handleBR].map((h, i) => (
            <View key={i} style={[styles.handle, h, { borderColor: dash, backgroundColor: isNight ? '#232736' : '#FCFCFF' }]} />
          ))}
        </View>
        <Text style={[styles.subtitle, { color: ink }]}>Smooth animations, in your pocket.</Text>
      </View>

      <Animated.View pointerEvents="none" style={[styles.slowBadge, { top: horseTop - 8, borderColor: accent }, slowBadge]}>
        <Text style={[styles.slowText, { color: accent }]}>{slowMo ? 'slow‑mo' : ' '}</Text>
      </Animated.View>

      <View pointerEvents="none" style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.speedRow}>
          <Text style={[styles.speedLabel, { color: ink }]}>speed</Text>
          <Text style={[styles.speedValue, { color: ink }]}>{speedLabel}</Text>
        </View>
        <View style={[styles.meter, { backgroundColor: isNight ? 'rgba(255,255,255,0.15)' : 'rgba(0,26,114,0.12)' }]}>
          <Animated.View style={[styles.meterFill, meterFill]} />
          <Animated.View style={[styles.meterThumb, { borderColor: accent }, meterThumb]} />
        </View>
        <Text style={[styles.hint, { color: ink }]}>drag ←→ speed · tap jump · double‑tap flip · hold slow‑mo · tap ☀︎ theme</Text>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <Stage />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#FCFCFF' },
  ripple: { position: 'absolute', left: 0, top: 0, width: 80, height: 80, borderRadius: 40, borderWidth: 2.5 },
  sunSlot: { position: 'absolute' },
  header: { position: 'absolute', left: 24, right: 24, top: 0, alignItems: 'flex-start' },
  overline: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  selection: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingTop: 2,
    paddingBottom: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  title: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5, lineHeight: 50 },
  handle: { position: 'absolute', width: 9, height: 9, borderWidth: 1.5 },
  handleTL: { left: -5, top: -5 },
  handleTR: { right: -5, top: -5 },
  handleBL: { left: -5, bottom: -5 },
  handleBR: { right: -5, bottom: -5 },
  subtitle: { marginTop: 12, fontSize: 17, fontWeight: '600', opacity: 0.85, maxWidth: 190 },
  slowBadge: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  slowText: { fontSize: 13, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0, gap: 10 },
  speedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  speedLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', opacity: 0.7 },
  speedValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  meter: { width: '100%', height: 8, borderRadius: 4 },
  meterFill: { height: 8, borderRadius: 4 },
  meterThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: 'white',
  },
  hint: { fontSize: 12, fontWeight: '600', textAlign: 'center', opacity: 0.75 },
});
