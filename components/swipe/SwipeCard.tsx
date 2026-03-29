import React from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { SHADOW } from "@/lib/theme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Place } from "@/lib/types";

interface SwipeCardProps {
  place: Place;
  onSwipe: (direction: "like" | "nope") => void;
  isTop: boolean;
  index: number; // 0 = top, 1 = second, 2 = third
  disabled?: boolean;
  containerHeight: number;
}

export function SwipeCard({ place, onSwipe, isTop, index, disabled = false, containerHeight }: SwipeCardProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const THRESHOLD = SCREEN_WIDTH * 0.35;
  const CARD_HEIGHT = containerHeight > 0 ? containerHeight * 0.95 : SCREEN_WIDTH * 1.2;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(isTop && !disabled)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) > THRESHOLD) {
        const dir = translateX.value > 0 ? 1 : -1;
        translateX.value = withSpring(
          dir * SCREEN_WIDTH * 1.5,
          { velocity: 800 },
          () => runOnJS(onSwipe)(dir > 0 ? "like" : "nope")
        );
        translateY.value = withSpring(translateY.value + 50);
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-30, 0, 30],
      Extrapolation.CLAMP
    );
    // Stack effect: cards behind are slightly scaled down and offset
    const scale = isTop ? 1 : interpolate(index, [0, 1, 2], [1, 0.95, 0.9]);
    const offsetY = isTop ? 0 : index * 8;

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + offsetY },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, THRESHOLD * 0.5],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-THRESHOLD * 0.5, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const photo = place.photoUrls[0];

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: SCREEN_WIDTH - 32,
            height: CARD_HEIGHT,
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: "#18181b",
            ...SHADOW.elevated,
          },
          cardStyle,
        ]}
      >
        {/* Background photo */}
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            contentFit="cover"
          />
        ) : (
          <View className="absolute inset-0 bg-zinc-800 items-center justify-center">
            <Text className="text-zinc-500 text-base">No photo</Text>
          </View>
        )}

        <GradientOverlay />

        {/* LIKE label */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 48,
              left: 20,
              borderWidth: 3,
              borderColor: "#22c55e",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 4,
              transform: [{ rotate: "-15deg" }],
            },
            likeOpacity,
          ]}
          pointerEvents="none"
        >
          <Text className="text-green-500 text-[28px] font-black">LIKE</Text>
        </Animated.View>

        {/* NOPE label */}
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 48,
              right: 20,
              borderWidth: 3,
              borderColor: "#ef4444",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 4,
              transform: [{ rotate: "15deg" }],
            },
            nopeOpacity,
          ]}
          pointerEvents="none"
        >
          <Text className="text-red-500 text-[28px] font-black">NOPE</Text>
        </Animated.View>

        {/* Place info at bottom */}
        <View className="absolute bottom-0 left-0 right-0 p-5 gap-1.5">
          <Text className="text-white text-2xl font-extrabold leading-tight" numberOfLines={2}>
            {place.name}
          </Text>
          {place.rating > 0 && (
            <View className="flex-row items-center gap-1">
              <Ionicons name="star" size={13} color="#fbbf24" />
              <Text className="text-amber-300 text-sm font-semibold">
                {place.rating.toFixed(1)}
              </Text>
            </View>
          )}
          <Text className="text-white/70 text-sm" numberOfLines={1}>
            {place.address}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

