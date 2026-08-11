/**
 * HeartBeatWave.tsx
 * -------------------------------------------------------------------------
 * A standalone, real-monitor-style ECG wave -- a single heartbeat, sweeping
 * in from left to right like a live cardiac monitor, then resetting and
 * sweeping again. No shield, no cross, no glow.
 *
 * How the sweep works:
 *   The line is drawn with the classic SVG "line reveal" trick: strokeDasharray
 *   is set to the path's full length (one long dash, one equally long gap),
 *   and strokeDashoffset animates from that full length down to 0, which
 *   progressively paints the line from its start (left) to its end (right).
 *   On completion it holds briefly, then resets instantly and sweeps again --
 *   the same jump-back-and-redraw behavior a real monitor sweep has.
 *
 *   A left-to-right opacity gradient (using your `color` at increasing
 *   stopOpacity) makes the leading edge read as slightly brighter than the
 *   trailing edge, which gives it a "live" feel without any blur/glow filter.
 *
 * Sizing:
 *   `width` defaults to 240 if omitted. `height` is optional -- if you don't
 *   pass one, it's derived from the wave's natural aspect ratio (~2.78:1) so
 *   nothing looks stretched. Pass both if you want to force it into a
 *   specific box; the wave will stretch to fill it exactly
 *   (preserveAspectRatio="none"), which is useful for a full-width banner.
 *
 * Dependencies (Expo):
 *   npx expo install react-native-svg
 *
 * Usage:
 *   <HeartBeatWave width={240} color="#AF101A" />
 *   <HeartBeatWave width={240} color="#AF101A" thickness={10} /> // bolder line
 *   <HeartBeatWave width={340} height={100} color="#00FF66" /> // stretched to fit
 */
import React, { useEffect, useId, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// ---------------------------------------------------------------------------
// Geometry: one heartbeat unit (baseline - P bump - QRS spike - T - baseline)
// ---------------------------------------------------------------------------
const VIEW_X = 10;
const VIEW_Y = 104;
const VIEW_W = 656;
const VIEW_H = 236;
const NATURAL_ASPECT = VIEW_W / VIEW_H; // ~2.78

const WAVE_D: string =
  'M 21,242.96 L 158.65,242.96 C 158.88,242.96 159.1,242.88 159.27,242.74 L 175.73,229.68 C 175.9,229.54 176.12,229.46 176.35,229.46 L 259.96,229.46 C 260.3,229.46 260.61,229.29 260.8,229.01 L 275.27,207.31 C 275.75,206.59 276.85,206.77 277.07,207.61 L 291.23,261.14 C 291.51,262.2 293.03,262.11 293.18,261.02 L 311.89,126 C 312.05,124.83 313.74,124.86 313.87,126.03 L 334.72,319.23 C 334.84,320.38 336.51,320.43 336.7,319.29 L 358.82,187.01 C 359,185.98 360.44,185.87 360.76,186.87 L 374.28,228.77 C 374.41,229.18 374.79,229.46 375.23,229.46 L 504.2,229.46 C 504.4,229.46 504.59,229.52 504.75,229.62 L 524.75,242.79 C 524.91,242.9 525.1,242.96 525.3,242.96 L 655,242.96';

const TOTAL_LENGTH = 1133.41; // exact length of WAVE_D, precomputed
const DASH = `${TOTAL_LENGTH} ${TOTAL_LENGTH}`; // one dash, one gap, both = full length

const DRAW_MS = 850; // time to sweep fully across -- one lively beat
const HOLD_MS = 150; // pause once fully drawn, before the sweep resets

export interface HeartBeatWaveProps {
  /** Rendered width in dp. */
  width?: number;
  /** Rendered height in dp. If omitted, derived from the wave's natural aspect ratio (~2.78:1). */
  height?: number;
  /** Stroke color of the wave. Any valid color string (hex, rgb, named). */
  color?: string;
  /** Stroke thickness, in viewBox units (scales with width/height like everything else). */
  thickness?: number;
  style?: StyleProp<ViewStyle>;
}

export default function HeartBeatWave({
  width = 240,
  height,
  color = '#AF101A',
  thickness = 6,
  style,
}: HeartBeatWaveProps): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;
  const gradientId = `heartBeatWaveGradient-${useId()}`;

  const resolvedHeight = height ?? width / NATURAL_ASPECT;

  useEffect(() => {
    let mounted = true;

    const runSweep = (): void => {
      progress.setValue(0);
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: DRAW_MS,
          easing: Easing.linear,
          useNativeDriver: false, // strokeDashoffset isn't a native-driver prop
        }),
        Animated.delay(HOLD_MS),
      ]).start(({ finished }) => {
        if (finished && mounted) runSweep();
      });
    };

    runSweep();
    return () => {
      mounted = false;
      progress.stopAnimation();
    };
  }, [progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [TOTAL_LENGTH, 0],
  });

  return (
    <View style={[{ width, height: resolvedHeight }, style]}>
      <Svg
        width={width}
        height={resolvedHeight}
        viewBox={`${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient
            id={gradientId}
            x1={VIEW_X}
            x2={VIEW_X + VIEW_W}
            y1="0"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="0.7" stopColor={color} stopOpacity={0.8} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <AnimatedPath
          d={WAVE_D}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={DASH}
          strokeDashoffset={dashOffset}
        />
      </Svg>
    </View>
  );
}