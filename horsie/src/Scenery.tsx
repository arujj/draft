import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';

import { rand, wrap, type World } from './world';

const DAY = {
  sky: '#7CC8F2',
  horizon: '#D9F1FF',
  farHill: '#A6D99B',
  nearHill: '#7FC474',
  ground: '#6DB35F',
  groundEdge: '#5A9E4E',
  fence: '#F4EBDD',
  cloud: '#FFFFFF',
};
const NIGHT = {
  sky: '#0B1430',
  horizon: '#2A3570',
  farHill: '#2B4660',
  nearHill: '#1F3550',
  ground: '#183A34',
  groundEdge: '#122C28',
  fence: '#7D86A8',
  cloud: '#5A6690',
};
type Palette = keyof typeof DAY;

function useTint(w: World, key: Palette, prop: 'backgroundColor' = 'backgroundColor') {
  return useAnimatedStyle(() => ({
    [prop]: interpolateColor(w.night.value, [0, 1], [DAY[key], NIGHT[key]]),
  }));
}

/** An item that scrolls left with the world and wraps around forever. */
function Parallax({
  w,
  factor,
  baseX,
  span,
  margin,
  style,
  drift = 0,
  children,
}: {
  w: World;
  factor: number;
  baseX: number;
  span: number;
  margin: number;
  style?: ViewStyle;
  drift?: number;
  children?: ReactNode;
}) {
  const anim = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          wrap(baseX - w.dist.value * factor - w.time.value * drift, span) - margin,
      },
    ],
  }));
  return <Animated.View style={[{ position: 'absolute', left: 0 }, style, anim]}>{children}</Animated.View>;
}

function Star({ w, i, width, maxY }: { w: World; i: number; width: number; maxY: number }) {
  const size = 1.5 + rand(i + 50) * 2.5;
  const style = useAnimatedStyle(() => ({
    opacity: w.night.value * (0.45 + 0.55 * Math.sin(w.time.value * (1 + rand(i) * 2) + i)),
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: rand(i + 7) * width,
          top: rand(i + 13) * maxY,
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: 'white',
        },
        style,
      ]}
    />
  );
}

function Cloud({ w, scale }: { w: World; scale: number }) {
  const tint = useTint(w, 'cloud');
  const puff = (l: number, t: number, d: number) => (
    <Animated.View
      style={[
        { position: 'absolute', left: l * scale, top: t * scale, width: d * scale, height: d * scale, borderRadius: 999 },
        tint,
      ]}
    />
  );
  return (
    <View style={{ width: 130 * scale, height: 60 * scale, opacity: 0.9 }}>
      {puff(0, 22, 44)}
      {puff(26, 4, 56)}
      {puff(64, 14, 48)}
      <Animated.View
        style={[
          { position: 'absolute', left: 14 * scale, top: 38 * scale, width: 96 * scale, height: 28 * scale, borderRadius: 14 * scale },
          tint,
        ]}
      />
    </View>
  );
}

function Hill({ w, d, color }: { w: World; d: number; color: Palette }) {
  const tint = useTint(w, color);
  return <Animated.View style={[{ width: d, height: d, borderRadius: d / 2 }, tint]} />;
}

export function Scenery({
  w,
  width,
  height,
  groundY,
}: {
  w: World;
  width: number;
  height: number;
  groundY: number;
}) {
  const sky = useTint(w, 'sky');
  const horizon = useTint(w, 'horizon');
  const ground = useTint(w, 'ground');
  const groundEdge = useTint(w, 'groundEdge');
  const fence = useTint(w, 'fence');

  const cloudSpan = width + 300;
  const farD = width * 0.95;
  const nearD = width * 0.75;
  const hillSpan = (d: number, n: number) => Math.max(width + d, n * d * 0.75);
  const postSpan = Math.ceil((width + 80) / 70) * 70;
  const tuftSpan = width + 60;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, sky]} />
      {/* fake vertical gradient toward the horizon */}
      {Array.from({ length: 14 }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            { position: 'absolute', left: 0, right: 0, top: groundY - 300 + i * 20, bottom: height - groundY, opacity: 0.09 },
            horizon,
          ]}
        />
      ))}
      {Array.from({ length: 45 }, (_, i) => (
        <Star key={i} w={w} i={i} width={width} maxY={groundY * 0.65} />
      ))}

      {[0, 1, 2, 3].map((i) => (
        <Parallax
          key={`c${i}`}
          w={w}
          factor={0.04 + i * 0.015}
          drift={6 + i * 3}
          baseX={(i * cloudSpan) / 4 + rand(i) * 60}
          span={cloudSpan}
          margin={150}
          style={{ top: groundY * (0.12 + rand(i + 3) * 0.32) }}
        >
          <Cloud w={w} scale={0.6 + rand(i + 9) * 0.6} />
        </Parallax>
      ))}

      {[0, 1, 2, 3].map((i) => (
        <Parallax
          key={`fh${i}`}
          w={w}
          factor={0.08}
          baseX={(i * hillSpan(farD, 4)) / 4}
          span={hillSpan(farD, 4)}
          margin={farD}
          style={{ top: groundY - farD * 0.32 }}
        >
          <Hill w={w} d={farD} color="farHill" />
        </Parallax>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Parallax
          key={`nh${i}`}
          w={w}
          factor={0.22}
          baseX={(i * hillSpan(nearD, 4)) / 4 + nearD * 0.4}
          span={hillSpan(nearD, 4)}
          margin={nearD}
          style={{ top: groundY - nearD * 0.2 }}
        >
          <Hill w={w} d={nearD} color="nearHill" />
        </Parallax>
      ))}

      {/* ground */}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: groundY - 6, bottom: 0 }, ground]} />
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: groundY - 6, height: 6 }, groundEdge]} />

      {/* fence behind the horse */}
      {[0, 1].map((r) => (
        <Animated.View
          key={`rail${r}`}
          style={[{ position: 'absolute', left: 0, right: 0, top: groundY - 44 + r * 18, height: 5, borderRadius: 3 }, fence]}
        />
      ))}
      {Array.from({ length: postSpan / 70 }, (_, i) => (
        <Parallax key={`p${i}`} w={w} factor={0.6} baseX={i * 70} span={postSpan} margin={40} style={{ top: groundY - 52 }}>
          <Animated.View style={[{ width: 8, height: 50, borderRadius: 3 }, fence]} />
        </Parallax>
      ))}

      {/* grass tufts and flowers on the track */}
      {Array.from({ length: 16 }, (_, i) => {
        const y = groundY + 8 + rand(i + 21) * (height - groundY - 30);
        const near = (y - groundY) / (height - groundY);
        const flower = i % 4 === 0;
        return (
          <Parallax
            key={`t${i}`}
            w={w}
            factor={1 + near * 0.6}
            baseX={rand(i + 40) * tuftSpan}
            span={tuftSpan}
            margin={30}
            style={{ top: y }}
          >
            {flower ? (
              <View style={styles.flower}>
                <View style={[styles.petal, { backgroundColor: ['#FFD54A', '#FF8FB1', '#FFFFFF'][i % 3] }]} />
                <View style={styles.flowerCore} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', transform: [{ scale: 0.7 + near * 0.8 }] }}>
                {[-0.4, 0, 0.4].map((r, k) => (
                  <Animated.View
                    key={k}
                    style={[
                      {
                        width: 4,
                        height: 12 + (k === 1 ? 6 : 0),
                        borderRadius: 2,
                        marginHorizontal: -0.5,
                        transform: [{ rotate: `${r}rad` }],
                      },
                      groundEdge,
                    ]}
                  />
                ))}
              </View>
            )}
          </Parallax>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flower: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  petal: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  flowerCore: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E07A2F' },
});
