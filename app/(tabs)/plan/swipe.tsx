import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SwipeDeck } from "@/components/swipe/SwipeDeck";
import { DiscoveryMapDrawer } from "@/components/swipe/DiscoveryMapDrawer";
import { useApp } from "@/context/AppContext";
import { Place } from "@/lib/types";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export default function SwipeScreen() {
  const { state } = useApp();
  const likedCount = state.selectedPlaces.length;
  const [mapVisible, setMapVisible] = useState(false);
  const [currentPlace, setCurrentPlace] = useState<Place | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <ScreenHeader
        title="Discover Places"
        subtitle={likedCount > 0 ? `${likedCount} liked` : undefined}
        right={
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => setMapVisible(true)}
              className="min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <Ionicons name="map-outline" size={22} color="#a1a1aa" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/plan/places")}
              disabled={likedCount === 0}
              className={`min-h-[44px] px-2 items-center justify-center ${likedCount === 0 ? "opacity-30" : ""}`}
            >
              <Text className="text-amber-400 font-semibold">Done →</Text>
            </Pressable>
          </View>
        }
      />

      {/* Swipe deck */}
      <SwipeDeck onCurrentChange={setCurrentPlace} />

      {/* Discovery map drawer */}
      <DiscoveryMapDrawer
        places={state.selectedPlaces}
        currentPlace={currentPlace}
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
      />
    </SafeAreaView>
  );
}
