import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Place } from "@/lib/types";
import { PhotoCarousel } from "@/components/ui/PhotoCarousel";

interface PlaceCardProps {
  place: Place;
  selected: boolean;
  onToggle: () => void;
}

export function PlaceCard({ place, selected, onToggle }: PlaceCardProps) {
  return (
    <Pressable
      onPress={onToggle}
      className={`rounded-2xl overflow-hidden border ${
        selected ? "border-amber-400" : "border-zinc-800"
      } bg-zinc-900`}
    >
      {/* Photo */}
      <View style={{ aspectRatio: 1 }}>
        <PhotoCarousel photoUrls={place.photoUrls} />

        {/* Selected checkmark */}
        {selected && (
          <View className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 items-center justify-center">
            <Ionicons name="checkmark" size={14} color="#09090b" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="p-2.5 gap-0.5">
        <Text className="text-xs font-semibold text-zinc-100 leading-tight" numberOfLines={2}>
          {place.name}
        </Text>
        {place.rating > 0 && (
          <View className="flex-row items-center gap-0.5">
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text className="text-xs text-amber-400">{place.rating.toFixed(1)}</Text>
          </View>
        )}
        <Text className="text-[10px] text-zinc-500" numberOfLines={1}>
          {place.address}
        </Text>
      </View>
    </Pressable>
  );
}
