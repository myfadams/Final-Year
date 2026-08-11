/**
 * AnimatedEmergencyLogo.tsx
 * -------------------------------------------------------------------------
 * React Native (Expo) port of logo_animated_option_c.svg (Clinical Bold palette).
 *
 * The original file used SMIL (<animate>, <animateMotion>), which
 * react-native-svg does NOT execute on either platform. Every animated value
 * below is re-implemented with React Native's Animated API, driven by a
 * single looping 0->1 driver ("progress") that mirrors the original's 2.2s
 * beat cycle. Each SMIL <animate keyTimes="..." values="..."> becomes one
 * progress.interpolate({ inputRange: keyTimes, outputRange: values }) call,
 * so the timing is a faithful 1:1 conversion.
 *
 * The one non-trivial piece is the traveling spark, which rode the ECG path
 * via <animateMotion>. React Native has no path-motion primitive, so the
 * path was pre-sampled (121 points, equal steps of arc length) offline and
 * baked into SPARK_T / SPARK_X / SPARK_Y below. Animated.interpolate()
 * treats those as a piecewise-linear lookup table, so the spark still rides
 * the exact curve -- no runtime path-measuring library required.
 *
 * Dependencies (Expo):
 *   npx expo install react-native-svg
 *
 * Usage:
 *   <AnimatedEmergencyLogo size={220} />
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const VIEW_W = 676;
const VIEW_H = 469;
const BEAT_MS = 2200; // matches dur="2.2s" in the source SVG

// ---------------------------------------------------------------------------
// Static geometry (unchanged from the SVG, just camelCase props)
// ---------------------------------------------------------------------------
const OUTER_WING_R: string =
  'M527.816 83.5912L340.268 2.16976C338.95 1.59749 337.476 2.56074 337.471 3.99778L335.961 464.698C335.956 466.191 337.516 467.164 338.844 466.48C346.433 462.57 367.362 451.602 382.401 441.959C402.338 429.176 433.956 404.232 433.956 404.232C433.956 404.232 465.375 378.116 481.939 351.72C491.502 336.48 501.185 320.457 507.971 303.796C520.088 274.049 524.15 256.025 528.9 224.264C532.566 199.749 532.716 185.644 532.979 160.988L532.984 160.535C533.272 133.434 529.684 92.6481 529.009 85.2377C528.942 84.5121 528.485 83.8814 527.816 83.5912Z';
const OUTER_WING_L: string =
  'M148.184 83.5912L335.732 2.16976C337.05 1.59749 338.524 2.56074 338.529 3.99778L340.039 464.698C340.044 466.191 338.484 467.164 337.156 466.48C329.567 462.57 308.638 451.602 293.599 441.959C273.662 429.176 242.044 404.232 242.044 404.232C242.044 404.232 210.625 378.116 194.061 351.72C184.498 336.48 174.815 320.457 168.029 303.796C155.912 274.049 151.85 256.025 147.1 224.264C143.434 199.749 143.284 185.644 143.021 160.988L143.016 160.535C142.728 133.434 146.316 92.6481 146.991 85.2377C147.058 84.5121 147.515 83.8814 148.184 83.5912Z';

const MID_WING_R: string =
  'M523.917 85.9893L340.287 6.1716C338.969 5.59859 337.495 6.56184 337.49 7.99927L336.011 459.696C336.006 461.189 337.566 462.163 338.893 461.478C346.375 457.617 366.807 446.892 381.5 437.46C401.029 424.923 432 400.46 432 400.46C432 400.46 462.775 374.847 479 348.96C488.368 334.013 497.853 318.299 504.5 301.96C516.369 272.787 520.347 255.11 525 223.96C528.591 199.918 528.738 186.085 528.995 161.904L529 161.46C529.282 134.904 525.774 94.9518 525.108 87.6329C525.042 86.9075 524.585 86.2797 523.917 85.9893Z';
const MID_WING_L: string =
  'M152.099 85.9893L335.729 6.1716C337.047 5.59859 338.521 6.56184 338.526 7.99927L340.005 459.696C340.01 461.189 338.451 462.163 337.123 461.478C329.641 457.617 309.209 446.892 294.516 437.46C274.987 424.923 244.016 400.46 244.016 400.46C244.016 400.46 213.241 374.847 197.016 348.96C187.648 334.013 178.163 318.299 171.516 301.96C159.648 272.787 155.669 255.11 151.016 223.96C147.425 199.918 147.278 186.085 147.021 161.904L147.016 161.46C146.734 134.904 150.242 94.9518 150.908 87.6329C150.974 86.9075 151.431 86.2797 152.099 85.9893Z';

const RING_WING_R: string =
  'M489.618 113.753L339.372 48.1778C338.054 47.6023 336.577 48.5656 336.572 50.0043L335.36 421.69C335.355 423.185 336.93 424.152 338.256 423.463C344.794 420.067 361.002 411.486 372.748 403.914C388.8 393.567 414.257 373.377 414.257 373.377C414.257 373.377 439.553 352.238 452.889 330.873C460.589 318.537 468.385 305.568 473.849 292.082C483.604 268.005 486.874 253.416 490.699 227.707C493.651 207.864 493.772 196.447 493.983 176.49L493.987 176.124C494.216 154.422 491.392 121.881 490.805 115.378C490.739 114.654 490.285 114.044 489.618 113.753Z';
const RING_WING_L: string =
  'M184.382 113.753L334.628 48.1778C335.946 47.6023 337.423 48.5656 337.428 50.0043L338.64 421.69C338.645 423.185 337.07 424.152 335.744 423.463C329.206 420.067 312.998 411.486 301.252 403.914C285.2 393.567 259.743 373.377 259.743 373.377C259.743 373.377 234.447 352.238 221.111 330.873C213.411 318.537 205.615 305.568 200.151 292.082C190.396 268.005 187.126 253.416 183.301 227.707C180.349 207.864 180.228 196.447 180.017 176.49L180.013 176.124C179.784 154.422 182.608 121.881 183.195 115.378C183.261 114.654 183.715 114.044 184.382 113.753Z';

const INNER_WING_R: string =
  'M477.877 124.882L339.9 65.1652C338.582 64.5948 337.11 65.558 337.106 66.9941L335.992 405.702C335.987 407.194 337.547 408.166 338.873 407.482C345.025 404.309 359.719 396.58 370.402 389.752C385.176 380.308 408.606 361.88 408.606 361.88C408.606 361.88 431.888 342.587 444.162 323.087C451.249 311.828 458.424 299.991 463.453 287.683C472.432 265.707 475.442 252.392 478.962 228.927C481.679 210.817 481.79 200.397 481.984 182.182L481.988 181.848C482.198 162.152 479.629 132.674 479.068 126.508C479.002 125.782 478.546 125.172 477.877 124.882Z';
const INNER_WING_L: string =
  'M197.123 124.882L335.1 65.1652C336.418 64.5948 337.89 65.558 337.894 66.9941L339.008 405.702C339.013 407.194 337.453 408.166 336.127 407.482C329.975 404.309 315.281 396.58 304.598 389.752C289.824 380.308 266.394 361.88 266.394 361.88C266.394 361.88 243.112 342.587 230.838 323.087C223.751 311.828 216.576 299.991 211.547 287.683C202.568 265.707 199.558 252.392 196.038 228.927C193.321 210.817 193.21 200.397 193.016 182.182L193.012 181.848C192.802 162.152 195.371 132.674 195.932 126.508C195.998 125.782 196.454 125.172 197.123 124.882Z';

const OVERLAY_R: string =
  'M454.935 150.591L338.099 95.6285C337.437 95.317 336.676 95.7987 336.673 96.5303L335.733 407.267C335.731 408.028 336.535 408.516 337.2 408.145C341.609 405.689 354.996 398.116 364.551 391.478C376.923 382.882 396.542 366.111 396.542 366.111C396.542 366.111 416.038 348.551 426.316 330.803C432.25 320.556 438.259 309.782 442.469 298.58C449.988 278.579 452.508 266.46 455.456 245.104C457.731 228.621 457.824 219.137 457.987 202.559L457.99 202.255C458.172 183.717 455.865 155.658 455.503 151.388C455.473 151.033 455.258 150.742 454.935 150.591Z';
const OVERLAY_L: string =
  'M219.065 150.591L335.901 95.6285C336.563 95.317 337.324 95.7987 337.327 96.5303L338.267 407.267C338.269 408.028 337.465 408.516 336.8 408.145C332.391 405.689 319.004 398.116 309.449 391.478C297.077 382.882 277.458 366.111 277.458 366.111C277.458 366.111 257.962 348.551 247.684 330.803C241.75 320.556 235.741 309.782 231.531 298.58C224.012 278.579 221.492 266.46 218.544 245.104C216.269 228.621 216.176 219.137 216.013 202.559L216.01 202.255C215.828 183.717 218.135 155.658 218.497 151.388C218.527 151.033 218.742 150.742 219.065 150.591Z';

const CROSS_D: string =
  'M489 201.71H441.713C441.16 201.71 440.713 201.262 440.713 200.71V155.96C440.713 155.408 440.265 154.96 439.713 154.96H392.34C391.788 154.96 391.34 155.408 391.34 155.96V200.71C391.34 201.262 390.893 201.71 390.34 201.71H337C336.448 201.71 336 202.158 336 202.71V260.11C336 260.662 336.448 261.11 337 261.11H390.34C390.893 261.11 391.34 261.558 391.34 262.11V307.96C391.34 308.512 391.788 308.96 392.34 308.96H439.713C440.265 308.96 440.713 308.512 440.713 307.96V262.11C440.713 261.558 441.16 261.11 441.713 261.11H478.149';

const ECG_D: string =
  'M21 242.96H158.651C158.877 242.96 159.096 242.884 159.273 242.743L175.727 229.677C175.904 229.536 176.123 229.46 176.349 229.46H259.965C260.299 229.46 260.611 229.293 260.797 229.015L275.269 207.307C275.747 206.59 276.847 206.773 277.068 207.606L291.226 261.144C291.506 262.2 293.034 262.107 293.184 261.025L311.886 126.001C312.048 124.833 313.744 124.859 313.871 126.031L334.719 319.227C334.844 320.383 336.508 320.432 336.7 319.285L358.823 187.01C358.995 185.977 360.439 185.871 360.761 186.868L374.276 228.767C374.41 229.18 374.794 229.46 375.228 229.46H504.2C504.396 229.46 504.587 229.517 504.75 229.625L524.75 242.795C524.913 242.903 525.104 242.96 525.3 242.96H655';

// Real geometric length of ECG_D (via svgpathtools), used to convert the
// source SVG's normalized pathLength="1" dash values into absolute units,
// so this doesn't depend on RN SVG's (inconsistent) pathLength support.
const ECG_LENGTH = 1133.41;
const DASH_ON = 0.12 * ECG_LENGTH; // ~136.01
const DASH_OFF = 0.88 * ECG_LENGTH; // ~997.4

// ---------------------------------------------------------------------------
// Pre-sampled ECG path points (121 steps, equal arc length), for the spark.
// ---------------------------------------------------------------------------
const SPARK_T: number[] = [
  0.0, 0.0083, 0.0167, 0.025, 0.0333, 0.0417, 0.05, 0.0583, 0.0667, 0.075, 0.0833, 0.0917,
  0.1, 0.1083, 0.1167, 0.125, 0.1333, 0.1417, 0.15, 0.1583, 0.1667, 0.175, 0.1833, 0.1917,
  0.2, 0.2083, 0.2167, 0.225, 0.2333, 0.2417, 0.25, 0.2583, 0.2667, 0.275, 0.2833, 0.2917,
  0.3, 0.3083, 0.3167, 0.325, 0.3333, 0.3417, 0.35, 0.3583, 0.3667, 0.375, 0.3833, 0.3917,
  0.4, 0.4083, 0.4167, 0.425, 0.4333, 0.4417, 0.45, 0.4583, 0.4667, 0.475, 0.4833, 0.4917,
  0.5, 0.5083, 0.5167, 0.525, 0.5333, 0.5417, 0.55, 0.5583, 0.5667, 0.575, 0.5833, 0.5917,
  0.6, 0.6083, 0.6167, 0.625, 0.6333, 0.6417, 0.65, 0.6583, 0.6667, 0.675, 0.6833, 0.6917,
  0.7, 0.7083, 0.7167, 0.725, 0.7333, 0.7417, 0.75, 0.7583, 0.7667, 0.775, 0.7833, 0.7917,
  0.8, 0.8083, 0.8167, 0.825, 0.8333, 0.8417, 0.85, 0.8583, 0.8667, 0.875, 0.8833, 0.8917,
  0.9, 0.9083, 0.9167, 0.925, 0.9333, 0.9417, 0.95, 0.9583, 0.9667, 0.975, 0.9833, 0.9917,
  1.0,
];
const SPARK_X: number[] = [
  21.0, 30.45, 39.89, 49.34, 58.78, 68.23, 77.67, 87.12, 96.56, 106.01, 115.45, 124.9,
  134.34, 143.79, 153.23, 161.9, 169.3, 176.91, 186.36, 195.8, 205.25, 214.69, 224.14, 233.58,
  243.03, 252.47, 261.33, 266.57, 271.81, 277.3, 279.72, 282.13, 284.55, 286.96, 289.38, 292.95,
  294.4, 295.7, 297.0, 298.29, 299.59, 300.88, 302.18, 303.48, 304.77, 306.07, 307.36, 308.66,
  309.95, 311.25, 314.07, 315.09, 316.1, 317.11, 318.13, 319.14, 320.15, 321.17, 322.18, 323.19,
  324.21, 325.22, 326.24, 327.25, 328.26, 329.28, 330.29, 331.3, 332.32, 333.33, 334.34, 337.2,
  338.76, 340.32, 341.88, 343.43, 344.99, 346.55, 348.11, 349.67, 351.22, 352.78, 354.34, 355.9,
  357.46, 359.57, 363.2, 366.1, 369.0, 371.9, 375.66, 385.1, 394.55, 404.0, 413.44, 422.89,
  432.33, 441.78, 451.22, 460.67, 470.11, 479.56, 489.0, 498.45, 507.35, 515.23, 523.12, 532.21,
  541.66, 551.1, 560.55, 569.99, 579.44, 588.88, 598.33, 607.77, 617.22, 626.66, 636.11, 645.55,
  655.0,
];
const SPARK_Y: number[] = [
  242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96,
  242.96, 242.96, 242.96, 240.66, 234.78, 229.46, 229.46, 229.46, 229.46, 229.46, 229.46, 229.46,
  229.46, 229.46, 228.21, 220.35, 212.49, 208.49, 217.62, 226.75, 235.88, 245.02, 254.15, 261.55,
  252.21, 242.86, 233.5, 224.15, 214.79, 205.43, 196.08, 186.72, 177.37, 168.01, 158.66, 149.3,
  139.94, 130.59, 127.92, 137.31, 146.7, 156.09, 165.48, 174.87, 184.26, 193.65, 203.04, 212.44,
  221.83, 231.22, 240.61, 250.0, 259.39, 268.78, 278.17, 287.56, 296.95, 306.34, 315.73, 316.28,
  306.97, 297.65, 288.34, 279.02, 269.7, 260.39, 251.07, 241.76, 232.44, 223.13, 213.81, 204.49,
  195.18, 186.2, 194.42, 203.41, 212.4, 221.39, 229.46, 229.46, 229.46, 229.46, 229.46, 229.46,
  229.46, 229.46, 229.46, 229.46, 229.46, 229.46, 229.46, 229.46, 231.33, 236.53, 241.72, 242.96,
  242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96, 242.96,
  242.96,
];

export interface AnimatedEmergencyLogoProps {
  /** Rendered width in dp. Height is derived to preserve the 676:469 aspect ratio. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedEmergencyLogo({
  size = 260,
  style,
}: AnimatedEmergencyLogoProps): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;
  const width = size;
  const height = size * (VIEW_H / VIEW_W);

  useEffect(() => {
    let mounted = true;

    const runBeat = (): void => {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: BEAT_MS,
        easing: Easing.linear,
        useNativeDriver: false, // strokeWidth/strokeDashoffset/cx/cy aren't native-driver props
      }).start(({ finished }) => {
        if (finished && mounted) runBeat();
      });
    };

    runBeat();
    return () => {
      mounted = false;
      progress.stopAnimation();
    };
  }, [progress]);

  // Moving pulse: dash travels the path (SMIL stroke-dashoffset 1;0;-1)
  const dashOffset = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [ECG_LENGTH, 0, -ECG_LENGTH],
  });
  const pulseOpacity = progress.interpolate({
    inputRange: [0, 0.22, 0.32, 0.52, 1],
    outputRange: [0.35, 0.75, 1, 0.65, 0.35],
  });

  // Deep ambient halo
  const ambientOpacity = progress.interpolate({
    inputRange: [0, 0.25, 0.31, 0.38, 1],
    outputRange: [0.22, 0.3, 0.55, 0.3, 0.22],
  });

  // Visible ECG halo
  const haloOpacity = progress.interpolate({
    inputRange: [0, 0.25, 0.31, 0.38, 1],
    outputRange: [0.18, 0.28, 0.62, 0.28, 0.18],
  });

  // Beat glow (whole-line white flash)
  const beatGlowOpacity = progress.interpolate({
    inputRange: [0, 0.25, 0.31, 0.38, 0.45, 1],
    outputRange: [0.28, 0.38, 0.85, 0.38, 0.28, 0.28],
  });

  // Cross "breathes" thicker at the beat peak
  const crossStrokeWidth = progress.interpolate({
    inputRange: [0, 0.2, 0.3, 0.42, 1],
    outputRange: [4, 4, 6, 4, 4],
  });

  // Traveling spark: progress -> position-along-path -> (x, y)
  const sparkT = progress.interpolate({
    inputRange: [0, 0.2, 0.3, 0.5, 1],
    outputRange: [0, 0, 0.5, 1, 1],
  });
  const sparkX = sparkT.interpolate({ inputRange: SPARK_T, outputRange: SPARK_X });
  const sparkY = sparkT.interpolate({ inputRange: SPARK_T, outputRange: SPARK_Y });
  const sparkOpacity = progress.interpolate({
    inputRange: [0, 0.18, 0.24, 0.4, 0.46, 1],
    outputRange: [0, 0, 1, 1, 0, 0],
  });
  const sparkHaloOpacity = Animated.multiply(sparkOpacity, 0.55);

  return (
    <View style={[{ width, height }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        {/* Outer ghost wings */}
        <Path d={OUTER_WING_R} fill="#FFFFFF" stroke="#AF101A" strokeOpacity={0.45} strokeWidth={4} />
        <Path d={OUTER_WING_L} fill="#FFFFFF" stroke="#AF101A" strokeOpacity={0.45} strokeWidth={4} />

        {/* Solid mid wings */}
        <Path d={MID_WING_R} fill="#0D0D0F" stroke="#0D0D0F" strokeWidth={4} />
        <Path d={MID_WING_L} fill="#0D0D0F" stroke="#0D0D0F" strokeWidth={4} />

        {/* Ring wings */}
        <Path d={RING_WING_R} fill="none" stroke="#3D0507" strokeWidth={20} />
        <Path d={RING_WING_L} fill="none" stroke="#3D0507" strokeWidth={20} />

        {/* Inner bright wings (kept brand red) */}
        <Path d={INNER_WING_R} fill="#AF101A" stroke="#AF101A" strokeWidth={20} />
        <Path d={INNER_WING_L} fill="#AF101A" stroke="#AF101A" strokeWidth={20} />

        {/* Innermost depth overlays */}
        <Path d={OVERLAY_R} fill="#0D0D0F" fillOpacity={0.75} />
        <Path d={OVERLAY_L} fill="#0D0D0F" fillOpacity={0.45} />

        {/* --- ECG stack, back to front --- */}
        <AnimatedPath
          d={ECG_D}
          fill="none"
          stroke="#3D0507"
          strokeWidth={34}
          strokeLinecap="round"
          opacity={ambientOpacity}
        />
        <AnimatedPath
          d={ECG_D}
          fill="none"
          stroke="#AF101A"
          strokeWidth={22}
          strokeLinecap="round"
          opacity={haloOpacity}
        />
        <Path d={ECG_D} fill="none" stroke="#AF101A" strokeWidth={8} strokeLinecap="round" opacity={0.45} />
        <AnimatedPath
          d={ECG_D}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={9}
          strokeLinecap="round"
          opacity={beatGlowOpacity}
        />
        <AnimatedPath
          d={ECG_D}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${DASH_ON} ${DASH_OFF}`}
          strokeDashoffset={dashOffset}
          opacity={pulseOpacity}
        />

        {/* Cross / plus symbol */}
        <AnimatedPath
          d={CROSS_D}
          fill="none"
          stroke="#AF101A"
          strokeWidth={crossStrokeWidth}
          strokeLinecap="round"
        />

        {/* Traveling spark: red glow + white-hot core, rides the beat */}
        <AnimatedCircle cx={sparkX} cy={sparkY} r={11} fill="#AF101A" opacity={sparkHaloOpacity} />
        <AnimatedCircle cx={sparkX} cy={sparkY} r={4.5} fill="#FFFFFF" opacity={sparkOpacity} />
      </Svg>
    </View>
  );
}
