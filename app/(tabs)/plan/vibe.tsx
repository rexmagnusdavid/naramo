import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { VibeInput } from "@/components/planning/VibeInput";
import { useApp } from "@/context/AppContext";
import { aiTranslate, searchPlaces } from "@/lib/api";
import { Place } from "@/lib/types";
import { FALLBACK_PLACES } from "@/lib/fallback";
import { useTravelSetup } from "@/hooks/useTravelSetup";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export default function VibeScreen() {
  const { state, dispatch } = useApp();
  const { setup } = useTravelSetup();
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [loadingVibe, setLoadingVibe] = useState(false);

  async function runDiscovery(queries: string[]) {
    const { places, nextPageTokens } = await searchPlaces(queries, [], state.city);
    const finalPlaces: Place[] = places.length > 0 ? places : FALLBACK_PLACES;
    dispatch({
      type: "RESET_DISCOVERY",
      payload: { places: finalPlaces, tokens: nextPageTokens, queries, keepSelected: true },
    });
  }

  async function handlePopular() {
    setLoadingPopular(true);
    try {
      const { coords: userCoords, weather } = await setup(state.cityCoords);
      // Pass empty queries — searchPlaces injects "popular attractions in {city}" automatically
      await runDiscovery([]);
      if (weather && userCoords) {
        dispatch({ type: "START_TRAVEL", payload: { weather, userLocation: userCoords } });
        dispatch({ type: "SET_PHASE", payload: "planning" });
      }
      router.push("/(tabs)/plan/swipe");
    } catch (err) {
      console.error("[VibeScreen] handlePopular failed:", err);
      toast.error("Something went wrong. Loading sample places.");
      dispatch({
        type: "RESET_DISCOVERY",
        payload: { places: FALLBACK_PLACES, tokens: [], queries: [], keepSelected: true },
      });
      router.push("/(tabs)/plan/swipe");
    } finally {
      setLoadingPopular(false);
    }
  }

  async function handleFindPlaces() {
    if (state.selectedTags.length === 0 && !state.vibeText.trim()) {
      toast.error("Add at least one tag or describe your vibe!");
      return;
    }
    setLoadingVibe(true);
    try {
      const { coords: userCoords, weather } = await setup(state.cityCoords);
      const weatherStr = weather
        ? `${weather.description}, ${weather.temp}°C`
        : "clear skies";
      const queries = await aiTranslate(state.selectedTags, state.vibeText, weatherStr, state.city);
      if (queries.length === 0) {
        toast.error("Couldn't translate your vibe. Try different tags or words.");
        return;
      }
      await runDiscovery(queries);
      if (weather && userCoords) {
        dispatch({ type: "START_TRAVEL", payload: { weather, userLocation: userCoords } });
        dispatch({ type: "SET_PHASE", payload: "planning" });
      }
      router.push("/(tabs)/plan/swipe");
    } catch (err) {
      console.error("[VibeScreen] handleFindPlaces failed:", err);
      toast.error("Something went wrong. Loading sample places.");
      dispatch({
        type: "RESET_DISCOVERY",
        payload: { places: FALLBACK_PLACES, tokens: [], queries: [], keepSelected: true },
      });
      router.push("/(tabs)/plan/swipe");
    } finally {
      setLoadingVibe(false);
    }
  }

  const anyLoading = loadingPopular || loadingVibe;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScreenHeader title="Discover Places" subtitle={state.city} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* Popular places shortcut */}
          <Pressable
            onPress={handlePopular}
            disabled={anyLoading}
            className={`border border-zinc-600 rounded-2xl min-h-[52px] items-center justify-center flex-row gap-2 ${
              anyLoading ? "opacity-50" : ""
            }`}
          >
            {loadingPopular ? (
              <ActivityIndicator size="small" color="#a1a1aa" />
            ) : null}
            <Text className="text-zinc-200 font-semibold text-base">
              {loadingPopular ? "Loading..." : "Show me what's popular →"}
            </Text>
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-px bg-zinc-800" />
            <Text className="text-zinc-600 text-xs">or discover by vibe</Text>
            <View className="flex-1 h-px bg-zinc-800" />
          </View>

          {/* Vibe input */}
          <VibeInput />

          {/* Vibe search button */}
          <Pressable
            onPress={handleFindPlaces}
            disabled={anyLoading}
            className={`bg-amber-400 rounded-2xl min-h-[52px] items-center justify-center flex-row gap-2 ${
              anyLoading ? "opacity-70" : ""
            }`}
          >
            {loadingVibe && <ActivityIndicator size="small" color="#09090b" />}
            <Text className="text-zinc-900 font-bold text-base">
              {loadingVibe ? "Finding places..." : "Find Places →"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
