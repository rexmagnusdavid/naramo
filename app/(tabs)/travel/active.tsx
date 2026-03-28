import React, { useEffect } from "react";
import { View, Text, Pressable, ScrollView, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { CurrentPlace } from "@/components/travel/CurrentPlace";
import { QueuePreview } from "@/components/travel/QueuePreview";
import { NavigationButtons } from "@/components/travel/NavigationButtons";
import { TripMap } from "@/components/travel/TripMap";
import { useApp } from "@/context/AppContext";

export default function ActiveTravelScreen() {
  const { state, dispatch } = useApp();
  const { height: screenHeight } = useWindowDimensions();
  const mapHeight = Math.floor(screenHeight * 0.45);

  useEffect(() => {
    if (state.phase !== "travel" || state.queue.length === 0) {
      router.replace("/(tabs)/travel");
    }
  }, [state.phase, state.queue.length]);

  if (state.phase !== "travel" || state.queue.length === 0) {
    return null;
  }

  const currentPlace = state.queue[0];
  const { weather } = state;

  function handleEndTrip() {
    if (state.activeItineraryId) {
      dispatch({ type: "MARK_ITINERARY_DONE", payload: state.activeItineraryId });
    } else {
      dispatch({ type: "SET_PHASE", payload: "planning" });
    }
    router.replace("/(tabs)/travel");
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["top"]}>
      <View className="flex-1">
        {/* Top bar: weather + queue count + end trip */}
        <View className="flex-row items-center justify-between px-4 py-2">
          {weather ? (
            <View className="flex-row items-center gap-1.5">
              <Image
                source={{
                  uri: `https://openweathermap.org/img/wn/${weather.icon}.png`,
                }}
                style={{ width: 24, height: 24 }}
              />
              <Text className="text-sm text-zinc-400 capitalize">
                {weather.description}
              </Text>
              <Text className="text-sm text-zinc-400">· {weather.temp}°C</Text>
            </View>
          ) : (
            <Text className="text-sm text-zinc-600">☁ Weather unavailable</Text>
          )}

          <View className="flex-row items-center gap-3">
            <Text className="text-xs text-zinc-500">
              {state.queue.length} stop{state.queue.length !== 1 ? "s" : ""} left
            </Text>
            <Pressable
              onPress={handleEndTrip}
              className="min-h-[36px] px-2 items-center justify-center"
            >
              <Text className="text-xs text-zinc-600">End trip</Text>
            </Pressable>
          </View>
        </View>

        {/* Map — top half */}
        <TripMap places={state.queue} height={mapHeight} navigationStarted={state.navigationStarted} lastPlace={state.lastPlace} userLocation={state.userLocation} />

        {/* Content — bottom half */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
        >
          <CurrentPlace place={currentPlace} />
          <NavigationButtons />
          <QueuePreview queue={state.queue} />
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}
