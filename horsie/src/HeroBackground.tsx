import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { CLOUDS, STAR_DOTS, STAR_SPARKLES, SWIRL } from './swmArt';
import { effectiveSpeed, wrap, type World } from './world';

// Colors from the docs site (src/css/colors.css and the Hero components).
const SKY = {
  light: [
    ['0', '#D1BBF3'],
    ['0.4', '#FFD2D7'],
    ['0.85', '#FFF1B2'],
  ],
  dark: [
    ['0', '#B07EFF'],
    ['0.85', '#232736'],
  ],
} as const;
const SUN = { light: ['#FFE04B', '#FF6259'], dark: ['#E9DBFF', '#B07EFF'] } as const;
const SWIRL_FILL = { light: ['#782AEB', '#FF6259'], dark: ['#FF7774', '#B07EFF'] } as const;

function Crossfade({ w, light, dark }: { w: World; light: React.ReactNode; dark: React.ReactNode }) {
  const dayStyle = useAnimatedStyle(() => ({ opacity: 1 - w.night.value }));
  const nightStyle = useAnimatedStyle(() => ({ opacity: w.night.value }));
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, dayStyle]}>{light}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, nightStyle]}>{dark}</Animated.View>
    </>
  );
}

function Sky({ mode }: { mode: 'light' | 'dark' }) {
  const id = `sky-${mode}`;
  return (
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          {[...SKY[mode], ['1', mode === 'dark' ? '#232736' : '#FFF1B2']].map(([offset, color]) => (
            <Stop key={offset} offset={offset} stopColor={color} />
          ))}
        </LinearGradient>
        <LinearGradient id={`${id}-fade`} x1="0" y1="0.46" x2="0.03" y2="1">
          <Stop offset="0" stopColor="#FCFCFF" stopOpacity="0" />
          <Stop offset="1" stopColor="#FCFCFF" stopOpacity={mode === 'light' ? 1 : 0} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
      <Rect width="100%" height="100%" fill={`url(#${id}-fade)`} />
    </Svg>
  );
}

export function Sun({ mode, size }: { mode: 'light' | 'dark'; size: number }) {
  const id = `sun-${mode}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 344 343">
      <Defs>
        <LinearGradient
          id={id}
          x1={mode === 'light' ? 0.63 : 172.3}
          y1={0.02}
          x2={mode === 'light' ? 318.3 : 172.3}
          y2={mode === 'light' ? 364.7 : 343.4}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={SUN[mode][0]} />
          <Stop offset="1" stopColor={SUN[mode][1]} />
        </LinearGradient>
      </Defs>
      <Circle cx={172} cy={171.4} r={171.4} fill={`url(#${id})`} />
    </Svg>
  );
}

function Swirl({ mode, width }: { mode: 'light' | 'dark'; width: number }) {
  const id = `swirl-${mode}`;
  return (
    <Svg width={width} height={(width * 1048) / 1653} viewBox="0 0 1653 1048">
      <Defs>
        <LinearGradient id={id} x1="867.7" y1="-0.8" x2="867.7" y2="1054.4" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={SWIRL_FILL[mode][0]} />
          <Stop offset="1" stopColor={SWIRL_FILL[mode][1]} />
        </LinearGradient>
      </Defs>
      <Path d={SWIRL} fill={`url(#${id})`} />
    </Svg>
  );
}

function Cloud({
  w,
  index,
  top,
  scale,
  factor,
  drift,
  width,
}: {
  w: World;
  index: number;
  top: number;
  scale: number;
  factor: number;
  drift: number;
  width: number;
}) {
  const c = CLOUDS[index];
  const cw = c.w * scale;
  const span = width + cw + 40;
  const style = useAnimatedStyle(() => ({
    opacity: 0.95 - w.night.value * 0.7,
    transform: [
      {
        translateX: wrap(width * (0.15 + index * 0.3) - w.dist.value * factor - w.time.value * drift, span) - cw,
      },
    ],
  }));
  const id = `cloud-${index}`;
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top }, style]}>
      <Svg width={cw} height={c.h * scale} viewBox={`0 0 ${c.w} ${c.h}`}>
        <Defs>
          <LinearGradient id={id} x1="23.5" y1="120" x2="944" y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={c.d} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

function StarLayer({
  w,
  parity,
  period,
  width,
  left,
  top,
  flip,
}: {
  w: World;
  parity: number;
  period: number;
  width: number;
  left: number;
  top: number;
  flip?: boolean;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: w.night.value * (0.575 + 0.425 * Math.cos((w.time.value / period) * 2 * Math.PI + parity * 2)),
  }));
  const scale = (width * 1.6) / 1021;
  return (
    <Animated.View style={[{ position: 'absolute', left, top, transform: [{ scaleX: flip ? -1 : 1 }] }, style]}>
      <Svg width={1021 * scale} height={113 * scale} viewBox="0 0 1021 113">
        {STAR_SPARKLES.filter((_, i) => i % 2 === parity).map((d, i) => (
          <Path key={i} d={d} fill="white" />
        ))}
        {STAR_DOTS.filter((_, i) => i % 2 === parity).map((c, i) => (
          <Circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="white" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** The site blinks alternating stars on different periods; two layers per strip give the same feel. */
function Stars({ w, width, top }: { w: World; width: number; top: number }) {
  return (
    <>
      <StarLayer w={w} parity={0} period={2.4} width={width} left={-width * 0.05} top={top} />
      <StarLayer w={w} parity={1} period={3.2} width={width} left={-width * 0.05} top={top} />
      {/* a mirrored, offset strip so the narrow phone sky isn't empty */}
      <StarLayer w={w} parity={0} period={2.9} width={width} left={-width * 0.55} top={top + 120} flip />
      <StarLayer w={w} parity={1} period={4.6} width={width} left={-width * 0.55} top={top + 120} flip />
    </>
  );
}

function SpeedLine({ w, i, width, y, color }: { w: World; i: number; width: number; y: number; color: string }) {
  const len = 40 + ((i * 37) % 70);
  const span = width + len + 20;
  const style = useAnimatedStyle(() => {
    const s = effectiveSpeed(w);
    return {
      opacity: Math.min(1, Math.max(0, (s - 1.2) / 1)) * 0.5,
      transform: [{ translateX: wrap(i * 97 - w.dist.value * 2.2, span) - len }],
    };
  });
  return (
    <Animated.View
      style={[{ position: 'absolute', left: 0, top: y, width: len, height: 2.5, borderRadius: 2, backgroundColor: color }, style]}
    />
  );
}

export function HeroBackground({
  w,
  width,
  height,
  horseTop,
  horseHeight,
  isNight,
}: {
  w: World;
  width: number;
  height: number;
  horseTop: number;
  horseHeight: number;
  isNight: boolean;
}) {
  const swirl = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.sin(w.time.value * 0.25) * 2}deg` }, { scale: 1 + Math.sin(w.time.value * 0.4) * 0.015 }],
  }));
  const swirlWidth = width * 1.8;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Crossfade w={w} light={<Sky mode="light" />} dark={<Sky mode="dark" />} />
      <Stars w={w} width={width} top={height * 0.05} />
      <Animated.View
        style={[{ position: 'absolute', top: height * 0.3, left: width - swirlWidth + width * 0.35 }, swirl]}
      >
        <View style={{ width: swirlWidth, height: (swirlWidth * 1048) / 1653 }}>
          <Crossfade w={w} light={<Swirl mode="light" width={swirlWidth} />} dark={<Swirl mode="dark" width={swirlWidth} />} />
        </View>
      </Animated.View>
      <Cloud w={w} index={0} top={height * 0.12} scale={0.42} factor={0.08} drift={9} width={width} />
      <Cloud w={w} index={1} top={height * 0.3} scale={0.36} factor={0.14} drift={6} width={width} />
      <Cloud w={w} index={2} top={height * 0.48} scale={0.4} factor={0.2} drift={7} width={width} />
      {Array.from({ length: 7 }, (_, i) => (
        <SpeedLine
          key={i}
          w={w}
          i={i}
          width={width}
          y={horseTop + horseHeight * (0.2 + ((i * 0.13) % 0.7))}
          color={isNight ? '#E9DBFF' : '#782AEB'}
        />
      ))}
    </View>
  );
}
