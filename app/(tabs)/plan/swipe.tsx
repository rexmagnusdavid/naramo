import React, { useState, useRef } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { SwipeDeck, SwipeDeckHandle } from "@/components/swipe/SwipeDeck";
import { useApp } from "@/context/AppContext";
import { Place } from "@/lib/types";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export default function SwipeScreen() {
  const { state } = useApp();
  const likedCount = state.selectedPlaces.length;
  const deckRef = useRef<SwipeDeckHandle>(null);
  const [outOfCards, setOutOfCards] = useState(false);
  const [currentPlace, setCurrentPlace] = useState<Place | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["bottom"]}>
      <ScreenHeader
        title="Feed"
        titleLarge
        subtitle={likedCount > 0 ? `${likedCount} liked` : undefined}
      />

      {/* Swipe deck */}
      <SwipeDeck
        ref={deckRef}
        onCurrentChange={setCurrentPlace}
        onOutOfCardsChange={setOutOfCards}
      />

      {/* Bottom action bar */}
      <View className="flex-row items-center gap-3 px-4 pb-6 pt-4">
        {/* No */}
        <Pressable
          onPress={() => deckRef.current?.swipe("nope")}
          disabled={outOfCards}
          style={{ opacity: outOfCards ? 0.3 : 1 }}
          className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-red-500 items-center justify-center"
        >
          <Ionicons name="close" size={26} color="#ef4444" />
        </Pressable>

        {/* Yes */}
        <Pressable
          onPress={() => deckRef.current?.swipe("like")}
          disabled={outOfCards}
          style={{ opacity: outOfCards ? 0.3 : 1 }}
          className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-green-500 items-center justify-center"
        >
          <Ionicons name="heart" size={22} color="#22c55e" />
        </Pressable>

        {/* Instagram */}
        <Pressable
          onPress={() => currentPlace && Linking.openURL(currentPlace.instagramUrl)}
          disabled={!currentPlace}
          style={{ opacity: currentPlace ? 1 : 0.3 }}
          className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-zinc-600 items-center justify-center"
        >
          <FontAwesome5 name="instagram" size={20} color="#a1a1aa" />
        </Pressable>

        {/* Done */}
        <Pressable
          onPress={() => router.push("/(tabs)/plan/places")}
          disabled={likedCount === 0}
          style={{ opacity: likedCount === 0 ? 0.4 : 1 }}
          className="flex-1 h-14 bg-amber-400 rounded-2xl items-center justify-center"
        >
          <Text className="text-zinc-900 font-bold text-base">
            Done {likedCount > 0 ? `(${likedCount})` : ""}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
