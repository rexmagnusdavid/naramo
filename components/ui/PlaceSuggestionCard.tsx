import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { getPlaceById } from "@/lib/api";
import { CityPrediction, Place } from "@/lib/types";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { SHADOW } from "@/lib/theme";

interface PlaceSuggestionCardProps {
  pred: CityPrediction;
  onPress: () => void;
}

export function PlaceSuggestionCard({ pred, onPress }: PlaceSuggestionCardProps) {
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPlaceById(pred.placeId).then((result) => {
      if (!cancelled) {
        setPlace(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [pred.placeId]);

  const photoUrl = place?.photoUrls[0];

  return (
    <Pressable onPress={onPress} className="mb-2">
      {({ pressed }) => (
        <View
          className="h-[120px] rounded-2xl overflow-hidden bg-zinc-900"
          style={[{ opacity: pressed ? 0.85 : 1 }, SHADOW.card]}
        >
          {photoUrl && (
            <Image
              source={{ uri: photoUrl }}
              style={{ position: "absolute", width: "100%", height: "100%" }}
              contentFit="cover"
            />
          )}

          {loading && (
            <View className="absolute inset-0 items-center justify-center">
              <ActivityIndicator size="small" color="#52525b" />
            </View>
          )}

          <GradientOverlay />

          <View className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 gap-0.5">
            <Text className="text-zinc-100 font-bold text-[15px]" numberOfLines={1}>
              {pred.mainText}
            </Text>
            {pred.secondaryText ? (
              <Text className="text-white/55 text-xs" numberOfLines={1}>
                {pred.secondaryText}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}
