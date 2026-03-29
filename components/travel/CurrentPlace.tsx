import React from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  useWindowDimensions,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Place } from "@/lib/types";
import { PhotoCarousel } from "@/components/ui/PhotoCarousel";
import { GradientOverlay } from "@/components/ui/GradientOverlay";

interface CurrentPlaceProps {
  place: Place;
}

export function CurrentPlace({ place }: CurrentPlaceProps) {
  const { width } = useWindowDimensions();
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;

  return (
    <View style={{ flex: 1, gap: 8 }}>
      {/* Photo carousel — flex:1 fills all space left over from the fixed elements below */}
      <View className="rounded-2xl overflow-hidden bg-zinc-800" style={{ flex: 1 }}>
        <PhotoCarousel photoUrls={place.photoUrls} width={width} />

        <GradientOverlay />

        {/* Place name overlay */}
        <View className="absolute bottom-0 left-0 right-0 p-4">
          <Text className="text-xl font-bold text-white leading-tight">
            {place.name}
          </Text>
          <Text className="text-sm text-zinc-300 mt-0.5" numberOfLines={1}>
            {place.address}
          </Text>
        </View>
      </View>

      {/* Meta row */}
      <View className="flex-row items-center gap-3 flex-wrap">
        {place.rating > 0 && (
          <View className="border border-zinc-700 rounded-full px-3 py-1.5 flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text className="text-zinc-300 text-xs">
              {place.rating.toFixed(1)}
            </Text>
          </View>
        )}
        {place.website && (
          <Pressable
            onPress={() => Linking.openURL(place.website!)}
            className="border border-zinc-700 rounded-full px-3 py-1.5 flex-row items-center gap-1"
          >
            <Ionicons name="globe-outline" size={12} color="#a1a1aa" />
            <Text className="text-xs text-zinc-400">Website</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => Linking.openURL(place.instagramUrl)}
          className="border border-zinc-700 rounded-full px-3 py-1.5 flex-row items-center gap-1"
        >
          <FontAwesome5 name="instagram" size={12} color="#a1a1aa" />
          <Text className="text-xs text-zinc-400">Instagram</Text>
        </Pressable>
      </View>

      {/* Hard stop banner */}
      {place.hardStopTime && (
        <View className="flex-row items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-3">
          <Ionicons name="time-outline" size={16} color="#f59e0b" />
          <Text className="text-amber-400 text-sm font-medium">
            Be here by{" "}
            <Text className="font-bold">{place.hardStopTime}</Text>
          </Text>
        </View>
      )}

      {/* Take Me There */}
      <Pressable
        onPress={() => Linking.openURL(mapsUrl)}
        className="bg-amber-400 rounded-2xl min-h-[52px] items-center justify-center flex-row gap-2"
      >
        <Ionicons name="navigate" size={18} color="#09090b" />
        <Text className="text-zinc-900 font-bold text-base">Take Me There</Text>
      </Pressable>
    </View>
  );
}
