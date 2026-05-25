import Colors from "@/constants/Colors";
import { CloudUpload } from "lucide-react-native"; // or your icon lib
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

// ─── Theming ────────────────────────────────────────────────────────────────
const PRIMARY = Colors.light.accent; // indigo — swap for Colors.light.primary
const TRACK = "#1c1c2e";
const GLOW = "#818cf8";
const WHITE = "#f0f0ff";

// ─── Types ──────────────────────────────────────────────────────────────────
interface UploadProgressLoaderProps {
  /** 0–100 */
  progress: number;
  /** Circle diameter in dp */
  size?: number;
  /** Ring thickness in dp */
  strokeWidth?: number;
  /** Swap icon or hide it */
  renderIcon?: (color: string, iconSize: number) => React.ReactNode;
}

// ─── Animated SVG Circle wrapper ────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Component ──────────────────────────────────────────────────────────────
const UploadProgressLoader: React.FC<UploadProgressLoaderProps> = ({
  progress,
  size = 110,
  strokeWidth = 5,
  renderIcon,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animated progress value (0 → 1)
  const animProgress = useRef(new Animated.Value(0)).current;
  // Pulse scale for the icon container
  const pulseScale = useRef(new Animated.Value(1)).current;
  // Subtle rotation for the track glow
  const rotation = useRef(new Animated.Value(0)).current;

  // Drive progress animation
  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: progress / 100,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // SVG props can't use native driver
    }).start();
  }, [progress]);

  // Pulse when uploading (not complete)
  useEffect(() => {
    if (progress >= 100) {
      pulseScale.stopAnimation();
      Animated.spring(pulseScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress >= 100]);

  // Slow spin of the glow dot (decorative)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // strokeDashoffset interpolation: full gap → 0 gap as progress goes 0→1
  const strokeDashoffset = animProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const iconSize = size * 0.5;
  const isDone = progress >= 100;
  const iconColor = isDone ? Colors.light.accent : PRIMARY;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { width: size, height: size, transform: [{ scale: pulseScale }] },
      ]}
    >
      {/* ── SVG Ring ── */}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={GLOW} stopOpacity="1" />
            <Stop offset="100%" stopColor={PRIMARY} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Track (background ring) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={TRACK}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc — starts at the top (−90°) */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#arcGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          // Rotate so arc starts at 12 o'clock
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* ── Icon + % label ── */}
      <View style={styles.innerContent}>
        {renderIcon ? (
          renderIcon(iconColor, iconSize)
        ) : (
          <CloudUpload size={iconSize} color={iconColor} strokeWidth={1.6} />
        )}
      </View>
    </Animated.View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    zIndex: 100,
  },
  innerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default UploadProgressLoader;

// ─── Usage Example ──────────────────────────────────────────────────────────
//
// import UploadProgressLoader from './UploadProgressLoader';
//
// const [progress, setProgress] = useState(0);

// // Simulate upload
// useEffect(() => {
//   const t = setInterval(() => {
//     setProgress(p => {
//       if (p >= 100) { clearInterval(t); return 100; }
//       return p + 2;
//     });
//   }, 80);
//   return () => clearInterval(t);
// }, []);
//
// <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
//   <UploadProgressLoader progress={progress} size={120} strokeWidth={5} />
// </View>
