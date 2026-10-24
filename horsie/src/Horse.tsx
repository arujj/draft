import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { mix, rad, type World } from './world';

export const HORSE_W = 320;
export const HORSE_H = 250; // hooves touch the ground at the bottom edge

const C = {
  coat: '#C46A2C',
  coatFar: '#93491A',
  shine: 'rgba(255,255,255,0.1)',
  mane: '#3A2216',
  maneFar: '#2A170E',
  hoof: '#2B1A10',
  blaze: '#FFF4E6',
  muzzle: '#A2531F',
  eye: '#1A0F08',
};

const CLAMP = Extrapolation.CLAMP;

// Stride phase offset per leg for [walk, trot, gallop]. Interpolating
// between them gives smooth gait transitions as the speed changes.
const OFFSETS: Record<LegId, [number, number, number]> = {
  rearFar: [0, 0, 0],
  rearNear: [0.5, 0.5, 0.1],
  frontFar: [0.25, 0.5, 0.45],
  frontNear: [0.75, 1.0, 0.55],
};

type LegId = 'rearFar' | 'rearNear' | 'frontFar' | 'frontNear';

function legAngles(w: World, id: LegId) {
  'worklet';
  const s = w.speed.value;
  const t = w.time.value;
  const front = id === 'frontFar' || id === 'frontNear';
  const o = OFFSETS[id];
  const offset = interpolate(s, [0.25, 0.5, 0.9], o, CLAMP);
  const th = 2 * Math.PI * (w.phase.value + offset);

  const swing = interpolate(s, [0, 0.2, 0.6, 1], [0, 0.32, 0.45, 0.68], CLAMP);
  const bend = interpolate(s, [0, 0.2, 1], [0, 0.75, 1.45], CLAMP);

  let upper = -swing * Math.sin(th);
  // Joints flex while the leg swings forward: knees fold back, hocks forward.
  const flex = bend * Math.max(0, Math.cos(th));
  let lower = front ? flex : -flex;

  // Idle weight shifting
  const idle = 1 - Math.min(1, s * 6);
  upper += idle * 0.035 * Math.sin(t * 1.1 + offset * 9);

  // Rearing: front legs paddle the air, hind legs ride the body rotation.
  const r = w.rear.value;
  if (front) {
    upper = mix(upper, -1.05 + 0.3 * Math.sin(t * 13 + (id === 'frontFar' ? 1.4 : 0)), r);
    lower = mix(lower, 1.75, r);
  } else {
    upper = mix(upper, 0.12, r);
    lower = mix(lower, -0.2, r);
  }

  // Jump: tuck all four legs at the top of the arc.
  const tuck = Math.sin(Math.PI * w.jump.value);
  if (front) {
    upper = mix(upper, -0.95, tuck);
    lower = mix(lower, 1.6, tuck);
  } else {
    upper = mix(upper, 0.75, tuck);
    lower = mix(lower, -1.25, tuck);
  }
  return { upper, lower };
}

function Leg({
  w,
  id,
  x,
  y,
  far,
}: {
  w: World;
  id: LegId;
  x: number;
  y: number;
  far?: boolean;
}) {
  const front = id === 'frontFar' || id === 'frontNear';
  const upperW = front ? 22 : 28;
  const upperH = 58;
  const lowerW = 15;
  const lowerH = 52;
  const color = far ? C.coatFar : C.coat;

  const upperStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rad(legAngles(w, id).upper) }],
  }));
  const lowerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: rad(legAngles(w, id).lower) }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - upperW / 2,
          top: y,
          width: upperW,
          height: upperH,
          transformOrigin: '50% 8%',
        },
        upperStyle,
      ]}
    >
      <View
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: color,
          borderTopLeftRadius: upperW / 2,
          borderTopRightRadius: upperW / 2,
          borderBottomLeftRadius: lowerW,
          borderBottomRightRadius: lowerW,
        }}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: upperH - 8,
            left: (upperW - lowerW) / 2,
            width: lowerW,
            height: lowerH,
            transformOrigin: '50% 10%',
          },
          lowerStyle,
        ]}
      >
        <View
          style={{
            ...StyleSheet.absoluteFill,
            backgroundColor: color,
            borderRadius: lowerW / 2,
          }}
        />
        {/* fetlock + hoof */}
        <View
          style={{
            position: 'absolute',
            bottom: -6,
            left: -3,
            width: lowerW + 6,
            height: 16,
            backgroundColor: far ? '#1E120A' : C.hoof,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
            borderBottomLeftRadius: 3,
            borderBottomRightRadius: 3,
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

function ManeStrand({ w, i, far }: { w: World; i: number; far?: boolean }) {
  const style = useAnimatedStyle(() => {
    const s = w.speed.value;
    const t = w.time.value;
    const flow = 0.85 + s * 0.7 + w.jump.value * 0.4;
    const wave = (0.08 + 0.2 * s) * Math.sin(t * (3 + 9 * s) - i * 0.8);
    return { transform: [{ rotate: rad(flow + wave + (far ? -0.25 : 0)) }] };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: far ? 2 : -6,
          top: 2 + i * 11,
          width: 16,
          height: 30 - i,
          borderRadius: 8,
          backgroundColor: far ? C.maneFar : C.mane,
          transformOrigin: '70% 12%',
        },
        style,
      ]}
    />
  );
}

function Tail({ w }: { w: World }) {
  const seg = (i: number) => {
    'worklet';
    const s = w.speed.value;
    const t = w.time.value;
    const lift = [0.45 + s * 0.95, 0.15 + s * 0.25, 0.12 + s * 0.15][i];
    const swish = (1 - s) * 0.22 * Math.sin(t * 1.9) * Math.max(0, Math.sin(t * 0.37));
    const wave = (0.1 + 0.16 * s) * Math.sin(t * (3 + 8 * s) - i * 0.9);
    return lift + wave + (i === 0 ? swish : swish * 0.6) + w.jump.value * 0.3 * (i === 0 ? 1 : 0);
  };
  const s0 = useAnimatedStyle(() => ({ transform: [{ rotate: rad(seg(0)) }] }));
  const s1 = useAnimatedStyle(() => ({ transform: [{ rotate: rad(seg(1)) }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ rotate: rad(seg(2)) }] }));

  const piece = (width: number, height: number) => ({
    position: 'absolute' as const,
    width,
    height,
    borderRadius: width / 2,
    backgroundColor: C.mane,
    transformOrigin: '50% 10%',
  });

  return (
    <Animated.View style={[piece(20, 40), { left: 58, top: 96 }, s0]}>
      <Animated.View style={[piece(19, 38), { left: 0.5, top: 32 }, s1]}>
        <Animated.View style={[piece(17, 40), { left: 1, top: 30 }, s2]} />
      </Animated.View>
    </Animated.View>
  );
}

function Ear({ w, far }: { w: World; far?: boolean }) {
  const style = useAnimatedStyle(() => {
    const t = w.time.value;
    const twitch = !far && t % 5.3 < 0.35 ? 0.35 * Math.sin((t % 5.3) * 40) : 0;
    const back = w.speed.value * 0.35 + w.rear.value * 0.5;
    return { transform: [{ rotate: rad(-0.55 - back + (far ? -0.2 : twitch)) }] };
  });
  return (
    <Animated.View
      style={[styles.ear, far ? { left: 6, backgroundColor: C.coatFar } : { left: 12 }, style]}
    />
  );
}

function Head({ w }: { w: World }) {
  const headStyle = useAnimatedStyle(() => {
    const s = w.speed.value;
    const t = w.time.value;
    const p = w.phase.value;
    const look = (1 - s) * 0.06 * Math.sin(t * 0.6);
    const nod = s * 0.1 * Math.sin(2 * Math.PI * p * 2);
    return {
      transform: [{ rotate: rad(0.38 + look + nod - w.rear.value * 0.25) }],
    };
  });
  const eyeStyle = useAnimatedStyle(() => {
    const t = w.time.value;
    const blink = t % 3.7 < 0.13 ? 0.1 : 1;
    const happy = w.pet.value > 0 && w.pet.value < 1 ? 0.18 : 1;
    return { transform: [{ scaleY: Math.min(blink, happy) }] };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 4,
          top: -12,
          width: 86,
          height: 36,
          transformOrigin: '20% 50%',
        },
        headStyle,
      ]}
    >
      {/* ears */}
      <Ear w={w} far />
      <Ear w={w} />
      {/* cheek + face */}
      <View style={[styles.round, { left: -6, top: -4, width: 44, height: 44, backgroundColor: C.coat }]} />
      <View
        style={{
          position: 'absolute',
          left: 10,
          top: 0,
          width: 76,
          height: 34,
          borderRadius: 17,
          borderTopLeftRadius: 10,
          backgroundColor: C.coat,
        }}
      />
      <View style={[styles.round, { left: 58, top: 3, width: 30, height: 31, backgroundColor: C.muzzle }]} />
      {/* blaze */}
      <View
        style={{
          position: 'absolute',
          left: 30,
          top: 1,
          width: 40,
          height: 9,
          borderRadius: 5,
          backgroundColor: C.blaze,
        }}
      />
      {/* forelock */}
      <View
        style={{
          position: 'absolute',
          left: 14,
          top: -8,
          width: 18,
          height: 12,
          borderRadius: 6,
          backgroundColor: C.mane,
          transform: [{ rotate: '-0.3rad' }],
        }}
      />
      {/* eye */}
      <Animated.View style={[styles.eye, eyeStyle]}>
        <View style={styles.glint} />
      </Animated.View>
      {/* nostril + mouth */}
      <View style={[styles.round, { left: 76, top: 8, width: 7, height: 5, backgroundColor: '#5C2D10' }]} />
      <View
        style={{
          position: 'absolute',
          left: 66,
          top: 26,
          width: 16,
          height: 2.5,
          borderRadius: 2,
          backgroundColor: '#5C2D10',
        }}
      />
    </Animated.View>
  );
}

function NeckAndHead({ w }: { w: World }) {
  const neckStyle = useAnimatedStyle(() => {
    const s = w.speed.value;
    const p = w.phase.value;
    const g = interpolate(s, [0.5, 0.9], [0, 1], CLAMP);
    const pump = s * 0.08 * Math.sin(2 * Math.PI * (p + 0.15) * (g > 0.5 ? 1 : 2));
    const pet = Math.sin(Math.PI * w.pet.value) * 0.18;
    return {
      transform: [{ rotate: rad(0.5 + s * 0.28 + pump - w.rear.value * 0.45 + pet) }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 206,
          top: 22,
          width: 40,
          height: 94,
          transformOrigin: '50% 100%',
        },
        neckStyle,
      ]}
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <ManeStrand key={`f${i}`} w={w} i={i} far />
      ))}
      <View
        style={{
          ...StyleSheet.absoluteFill,
          backgroundColor: C.coat,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 24,
          borderBottomLeftRadius: 10,
          borderBottomRightRadius: 20,
        }}
      />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <ManeStrand key={`n${i}`} w={w} i={i} />
      ))}
      <Head w={w} />
    </Animated.View>
  );
}

function Body({ w }: { w: World }) {
  const breathe = useAnimatedStyle(() => {
    const idle = 1 - Math.min(1, w.speed.value * 4);
    return {
      transform: [{ scaleY: 1 + idle * 0.025 * Math.sin(w.time.value * 2.2) }],
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '50% 52%' }, breathe]}>
      <View style={[styles.round, { left: 56, top: 82, width: 90, height: 88, backgroundColor: C.coat }]} />
      <View
        style={{
          position: 'absolute',
          left: 92,
          top: 92,
          width: 130,
          height: 72,
          borderRadius: 36,
          backgroundColor: C.coat,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 180,
          top: 84,
          width: 66,
          height: 78,
          borderRadius: 33,
          backgroundColor: C.coat,
        }}
      />
      {/* back highlight */}
      <View
        style={{
          position: 'absolute',
          left: 96,
          top: 92,
          width: 104,
          height: 14,
          borderRadius: 7,
          backgroundColor: C.shine,
        }}
      />
    </Animated.View>
  );
}

function Dust({ w, i, hoofX }: { w: World; i: number; hoofX: number }) {
  const style = useAnimatedStyle(() => {
    const s = w.speed.value;
    const k = interpolate(s, [0.35, 0.85], [0, 1], CLAMP) * (1 - w.jump.value);
    const tt = (w.time.value * (0.9 + s) + i / 7) % 1;
    const sway = Math.sin(i * 12.9898) * 10;
    return {
      opacity: k * 0.55 * (1 - tt),
      transform: [
        { translateX: -tt * 150 + sway },
        { translateY: -Math.sin(tt * Math.PI) * (18 + (i % 3) * 8) },
        { scale: 0.4 + tt * 1.4 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.round,
        {
          left: hoofX,
          top: HORSE_H - 16,
          width: 18,
          height: 18,
          backgroundColor: '#E8D6B5',
        },
        style,
      ]}
    />
  );
}

function Heart({ w, i }: { w: World; i: number }) {
  const style = useAnimatedStyle(() => {
    const tt = Math.min(1, Math.max(0, (w.pet.value - i * 0.08) / 0.5));
    return {
      opacity: Math.sin(Math.PI * tt),
      transform: [
        { translateX: Math.sin(tt * 6 + i * 2) * 14 + (i - 3) * 20 * tt },
        { translateY: -tt * 150 },
        { scale: 0.5 + tt * 0.8 },
        { rotate: rad(Math.sin(tt * 5 + i) * 0.4) },
      ],
    };
  });
  return (
    <Animated.Text style={[styles.heart, style]}>{i % 3 === 1 ? '💖' : '❤️'}</Animated.Text>
  );
}

function Bubble({ w }: { w: World }) {
  const style = useAnimatedStyle(() => {
    const k = interpolate(w.rear.value, [0.35, 0.85], [0, 1], CLAMP);
    return {
      opacity: k,
      transform: [{ scale: 0.4 + 0.6 * k }, { rotate: rad((1 - k) * -0.4) }],
    };
  });
  return (
    <Animated.View style={[styles.bubble, style]}>
      <Animated.Text style={styles.bubbleText}>NEIGH!</Animated.Text>
      <View style={styles.bubbleTail} />
    </Animated.View>
  );
}

export function Horse({ w }: { w: World }) {
  const rigStyle = useAnimatedStyle(() => {
    const s = w.speed.value;
    const p = w.phase.value;
    const g = interpolate(s, [0.5, 0.9], [0, 1], CLAMP);
    const walkBob = 0.5 - 0.5 * Math.cos(4 * Math.PI * p);
    const galBob = 0.5 - 0.5 * Math.cos(2 * Math.PI * (p - 0.2));
    const bobAmp = interpolate(s, [0, 0.25, 0.6, 1], [0, 3, 6, 15], CLAMP);
    const bob = -bobAmp * mix(walkBob, galBob, g);
    const pitch = g * 0.075 * Math.sin(2 * Math.PI * p);
    const j = w.jump.value;
    const lift = 4 * 115 * j * (1 - j);
    const sq = w.squash.value;
    return {
      transform: [
        { translateY: bob - lift + sq * 6 },
        { rotate: rad(pitch - w.rear.value * 0.55 - Math.sin(Math.PI * j) * 0.12) },
        { scaleY: 1 - sq * 0.08 },
        { scaleX: 1 + sq * 0.05 },
      ],
    };
  });

  const shadowStyle = useAnimatedStyle(() => {
    const j = w.jump.value;
    const lift = 4 * j * (1 - j);
    return {
      opacity: 0.14 - lift * 0.08,
      transform: [{ scaleX: 1 - lift * 0.35 + w.rear.value * -0.3 }],
    };
  });

  return (
    <View style={{ width: HORSE_W, height: HORSE_H }} pointerEvents="none">
      <Animated.View style={[styles.shadow, shadowStyle]} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Dust key={`d${i}`} w={w} i={i} hoofX={i % 2 ? 84 : 200} />
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '31% 100%' }, rigStyle]}>
        <Leg w={w} id="rearFar" x={88} y={124} far />
        <Leg w={w} id="frontFar" x={204} y={124} far />
        <Tail w={w} />
        <Body w={w} />
        <Leg w={w} id="rearNear" x={102} y={130} />
        <Leg w={w} id="frontNear" x={216} y={130} />
        <NeckAndHead w={w} />
      </Animated.View>
      <View style={{ position: 'absolute', left: 290, top: 40 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <Heart key={`h${i}`} w={w} i={i} />
        ))}
      </View>
      <Bubble w={w} />
    </View>
  );
}

const styles = StyleSheet.create({
  round: { position: 'absolute', borderRadius: 999 },
  ear: {
    position: 'absolute',
    top: -16,
    width: 13,
    height: 24,
    backgroundColor: C.coat,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    transformOrigin: '50% 100%',
  },
  eye: {
    position: 'absolute',
    left: 22,
    top: 8,
    width: 10,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.eye,
  },
  glint: {
    position: 'absolute',
    left: 5,
    top: 2,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: 'white',
  },
  shadow: {
    position: 'absolute',
    left: 50,
    top: HORSE_H - 10,
    width: 210,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#000',
  },
  heart: { position: 'absolute', fontSize: 22 },
  bubble: {
    position: 'absolute',
    left: 228,
    top: -64,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'white',
    transformOrigin: '20% 100%',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bubbleText: { fontSize: 18, fontWeight: '900', color: '#3A2216', letterSpacing: 1 },
  bubbleTail: {
    position: 'absolute',
    left: 16,
    bottom: -6,
    width: 14,
    height: 14,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
});
