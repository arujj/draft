import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { FRAME_FILL_RULES, HORSE_FRAMES } from './swmArt';
import { effectiveSpeed, FRAME_COUNT, type World } from './world';

export const HORSE_ASPECT = 330 / 400;

export const HORSE_COLORS = {
  light: '#001A72', // --swm-navy-light-100
  dark: '#F8F9FF', // --swm-off-white
  ghostLight: '#782AEB', // --swm-purple-light-100
  ghostDark: '#B07EFF', // --swm-purple-dark-100
};

/** One frame of the flipbook. Only the current frame is opaque, like the site's CSS keyframes. */
function Frame({ w, i, color, lag }: { w: World; i: number; color: string; lag: number }) {
  const style = useAnimatedStyle(() => {
    const idx = (((Math.floor(w.frame.value) - lag) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
    return { opacity: idx === i ? 1 : 0 };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 400 330">
        <Path d={HORSE_FRAMES[i]} fill={color} stroke={color} fillRule={FRAME_FILL_RULES[i]} />
      </Svg>
    </Animated.View>
  );
}

function Flipbook({ w, color, lag = 0 }: { w: World; color: string; lag?: number }) {
  return (
    <>
      {HORSE_FRAMES.map((_, i) => (
        <Frame key={i} w={w} i={i} color={color} lag={lag} />
      ))}
    </>
  );
}

/** Motion-blur ghosts trailing a few frames behind once you push past 1×. */
function Ghost({ w, k, color }: { w: World; k: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const s = effectiveSpeed(w);
    const amount = Math.min(1, Math.max(0, (s - 1.1) / 1.2));
    return {
      opacity: amount * (0.32 - k * 0.08),
      transform: [{ translateX: -k * (8 + 10 * s) }],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Flipbook w={w} color={color} lag={k} />
    </Animated.View>
  );
}

export function HeroHorse({ w, size, isNight }: { w: World; size: number; isNight: boolean }) {
  const height = size * HORSE_ASPECT;

  const rig = useAnimatedStyle(() => {
    const j = w.jump.value;
    const sq = w.squash.value;
    return {
      transform: [
        { translateY: -4 * size * 0.42 * j * (1 - j) + sq * 8 },
        { rotate: `${-Math.sin(Math.PI * j) * 9 + w.spin.value * 360}deg` },
        { scaleY: 1 - sq * 0.1 },
        { scaleX: 1 + sq * 0.06 },
      ],
    };
  });
  const dayLayer = useAnimatedStyle(() => ({ opacity: 1 - w.night.value }));
  const nightLayer = useAnimatedStyle(() => ({ opacity: w.night.value }));

  const shadow = useAnimatedStyle(() => {
    const lift = 4 * w.jump.value * (1 - w.jump.value);
    return {
      opacity: (0.1 + w.night.value * 0.08) * (1 - lift * 0.6),
      transform: [{ scaleX: 1 - lift * 0.4 }],
    };
  });

  const ghost = isNight ? HORSE_COLORS.ghostDark : HORSE_COLORS.ghostLight;

  return (
    <View style={{ width: size, height }} pointerEvents="none">
      <Animated.View
        style={[
          styles.shadow,
          { left: size * 0.2, width: size * 0.55, top: height * 0.86, backgroundColor: isNight ? '#000' : '#4B1F8F' },
          shadow,
        ]}
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Dust key={i} w={w} i={i} size={size} height={height} color={isNight ? '#E9DBFF' : '#FFFFFF'} />
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 80%' }, rig]}>
        {[3, 2, 1].map((k) => (
          <Ghost key={k} w={w} k={k} color={ghost} />
        ))}
        <Animated.View style={[StyleSheet.absoluteFill, dayLayer]}>
          <Flipbook w={w} color={HORSE_COLORS.light} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, nightLayer]}>
          <Flipbook w={w} color={HORSE_COLORS.dark} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function Dust({
  w,
  i,
  size,
  height,
  color,
}: {
  w: World;
  i: number;
  size: number;
  height: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const s = effectiveSpeed(w);
    const k = Math.min(1, Math.max(0, (s - 0.6) / 0.8)) * (1 - Math.sin(Math.PI * w.jump.value));
    const tt = (w.time.value * (0.8 + s * 0.5) + i / 6) % 1;
    return {
      opacity: k * 0.7 * (1 - tt),
      transform: [
        { translateX: -tt * size * 0.45 },
        { translateY: -Math.sin(tt * Math.PI) * (10 + (i % 3) * 7) },
        { scale: 0.35 + tt * 1.3 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.dust,
        { left: size * (i % 2 ? 0.22 : 0.55), top: height * 0.8, backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shadow: { position: 'absolute', height: 12, borderRadius: 999 },
  dust: { position: 'absolute', width: 16, height: 16, borderRadius: 8 },
});
