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
  FadeInDown,
  FadeOutUp,
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { HORSE_H, HORSE_W, Horse } from './src/Horse';
import { Scenery } from './src/Scenery';
import { GAITS, gaitIndex, type World } from './src/world';

const haptic = {
  light: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  tick: () => Platform.OS !== 'web' && Haptics.selectionAsync(),
  love: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

function useWorld(): World {
  return {
    time: useSharedValue(0),
    speed: useSharedValue(0),
    target: useSharedValue(0.3),
    phase: useSharedValue(0),
    dist: useSharedValue(0),
    rear: useSharedValue(0),
    jump: useSharedValue(0),
    squash: useSharedValue(0),
    pet: useSharedValue(0),
    night: useSharedValue(0),
  };
}

function Ripple({ x, y, t }: { x: SharedValue<number>; y: SharedValue<number>; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: t.value > 0 && t.value < 1 ? 0.5 * (1 - t.value) : 0,
    transform: [
      { translateX: x.value - 40 },
      { translateY: y.value - 40 },
      { scale: 0.2 + t.value * 1.3 },
    ],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, style]} />;
}

function Stage() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const w = useWorld();
  const [gait, setGait] = useState(0);
  const [isNight, setIsNight] = useState(false);

  const groundY = Math.round(height * 0.68);
  const horseScale = Math.min(1.35, Math.max(0.75, (width * 0.9) / HORSE_W));

  // The one clock that drives everything, entirely on the UI thread.
  useFrameCallback((f) => {
    const dt = Math.min((f.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    w.time.value += dt;
    w.speed.value += (w.target.value - w.speed.value) * (1 - Math.exp(-dt * 2.2));
    const s = w.speed.value;
    const strideHz = interpolate(s, [0, 0.25, 0.5, 1], [0.6, 0.95, 1.4, 2.1]);
    w.phase.value = (w.phase.value + dt * strideHz * Math.min(1, s * 20)) % 1;
    w.dist.value += dt * interpolate(s, [0, 0.25, 0.5, 1], [0, 90, 230, 640]);
  });

  useAnimatedReaction(
    () => gaitIndex(w.speed.value),
    (cur, prev) => {
      if (prev !== null && cur !== prev) {
        scheduleOnRN(setGait, cur);
        scheduleOnRN(haptic.tick);
      }
    },
  );

  const panStart = useSharedValue(0);
  const pan = usePanGesture({
    minDistance: 8,
    onActivate: () => {
      panStart.value = w.target.value;
    },
    onUpdate: (e) => {
      w.target.value = Math.min(1, Math.max(0, panStart.value + e.translationX / (width * 0.75)));
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

  const tap = useTapGesture({
    onActivate: (e) => {
      ripple(e.x, e.y);
      if (w.jump.value > 0) return;
      w.rear.value = withSequence(
        withSpring(1, { damping: 12, stiffness: 140 }),
        withDelay(450, withSpring(0, { damping: 11, stiffness: 90 })),
      );
      scheduleOnRN(haptic.medium);
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: (e) => {
      ripple(e.x, e.y);
      if (w.jump.value > 0 || w.rear.value > 0.1) return;
      scheduleOnRN(haptic.light);
      w.jump.value = withTiming(1, { duration: 700, easing: Easing.linear }, (done) => {
        w.jump.value = 0;
        if (!done) return;
        w.squash.value = withSequence(
          withTiming(1, { duration: 70 }),
          withSpring(0, { damping: 6, stiffness: 220 }),
        );
        scheduleOnRN(haptic.heavy);
      });
    },
  });

  const longPress = useLongPressGesture({
    minDuration: 380,
    onActivate: () => {
      w.pet.value = 0;
      w.pet.value = withTiming(1, { duration: 1800, easing: Easing.linear });
      scheduleOnRN(haptic.love);
    },
  });

  const taps = useExclusiveGestures(doubleTap, tap);
  const gesture = useCompetingGestures(pan, longPress, taps);

  const toggleNight = () => {
    const next = !isNight;
    setIsNight(next);
    w.night.value = withTiming(next ? 1 : 0, { duration: 1200, easing: Easing.inOut(Easing.cubic) });
    haptic.tick();
  };

  const meterFill = useAnimatedStyle(() => ({
    width: `${w.speed.value * 100}%`,
    backgroundColor: interpolateColor(w.speed.value, [0, 0.5, 1], ['#9BE7A1', '#FFD54A', '#FF7A59']),
  }));
  const meterThumb = useAnimatedStyle(() => ({
    left: `${w.target.value * 100}%`,
  }));

  const sunStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(w.night.value, [0, 1], ['#FFD54A', '#F3F0E2']),
    transform: [{ rotate: `${w.night.value * 200}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: (1 - w.night.value * 0.6) * (0.25 + 0.1 * Math.sin(w.time.value * 2)),
    backgroundColor: interpolateColor(w.night.value, [0, 1], ['#FFE58A', '#C9D3FF']),
    transform: [{ scale: 1.5 + 0.08 * Math.sin(w.time.value * 2) }],
  }));
  const craterStyle = useAnimatedStyle(() => ({ opacity: w.night.value }));

  return (
    <View style={styles.fill}>
      <StatusBar style={isNight ? 'light' : 'dark'} />
      <GestureDetector gesture={gesture}>
        <View style={styles.fill} collapsable={false}>
          <Scenery w={w} width={width} height={height} groundY={groundY} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: (width - HORSE_W) / 2 - 10,
              top: groundY - HORSE_H + 46 * horseScale,
              width: HORSE_W,
              height: HORSE_H,
              transform: [{ scale: horseScale }],
              transformOrigin: '50% 100%',
            }}
          >
            <Horse w={w} />
          </View>
          <Ripple x={rx} y={ry} t={rt} />
        </View>
      </GestureDetector>

      {/* HUD */}
      <View pointerEvents="box-none" style={[styles.hud, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>horsie</Text>
          <View style={styles.gaitRow}>
            <Animated.Text
              key={gait}
              entering={FadeInDown.springify().damping(14)}
              exiting={FadeOutUp.duration(150)}
              style={styles.gait}
            >
              {GAITS[gait]}
            </Animated.Text>
          </View>
        </View>
        <Pressable onPress={toggleNight} hitSlop={16} accessibilityLabel="Toggle day and night">
          <View style={styles.sunWrap}>
            <Animated.View style={[styles.sun, styles.glow, glowStyle]} />
            <Animated.View style={[styles.sun, sunStyle]}>
              <Animated.View style={[styles.crater, { left: 12, top: 14, width: 12, height: 12 }, craterStyle]} />
              <Animated.View style={[styles.crater, { left: 30, top: 28, width: 8, height: 8 }, craterStyle]} />
              <Animated.View style={[styles.crater, { left: 20, top: 34, width: 6, height: 6 }, craterStyle]} />
            </Animated.View>
          </View>
        </Pressable>
      </View>

      <View pointerEvents="none" style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.meter}>
          <Animated.View style={[styles.meterFill, meterFill]} />
          <Animated.View style={[styles.meterThumb, meterThumb]} />
        </View>
        <Text style={styles.hint}>drag ←→ to ride · tap rear · 2× tap jump · hold to pet</Text>
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
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#7CC8F2' },
  ripple: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
  },
  hud: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 2 },
  },
  gaitRow: { height: 30, overflow: 'hidden' },
  gait: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 6,
  },
  sunWrap: { width: 56, height: 56, marginTop: 4 },
  sun: { position: 'absolute', width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  glow: { overflow: 'visible' },
  crater: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(120,120,140,0.35)' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 0, alignItems: 'center', gap: 12 },
  meter: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.18)',
    overflow: 'visible',
  },
  meterFill: { height: 10, borderRadius: 5 },
  meterThumb: {
    position: 'absolute',
    top: -5,
    width: 20,
    height: 20,
    marginLeft: -10,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  hint: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowRadius: 4,
  },
});
