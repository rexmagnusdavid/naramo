import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { Itinerary } from "@/lib/types";
import { optimizeRoute } from "@/lib/routing";
import { useTravelSetup } from "@/hooks/useTravelSetup";
import { generateCityTags } from "@/lib/api";

export default function SelectItineraryScreen() {
  const { state, dispatch } = useApp();
  const { setup } = useTravelSetup();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleStart(itinerary: Itinerary) {
    setLoadingId(itinerary.id);
    try {
      const cityCoords = itinerary.cityCoords ?? state.cityCoords;
      const { coords, weather } = await setup(cityCoords);

      const origin = itinerary.startPlace
        ? { lat: itinerary.startPlace.lat, lng: itinerary.startPlace.lng }
        : coords ?? null;
      const optimizedMiddle = optimizeRoute(itinerary.places, origin, new Date());
      dispatch({
        type: "START_TRAVEL_FROM_ITINERARY",
        payload: {
          itinerary: { ...itinerary, places: optimizedMiddle },
          weather,
          userLocation: coords,
        },
      });
      router.push("/(tabs)/travel/active");
    } catch (err) {
      console.error(err);
      toast.error("Could not start travel.");
    } finally {
      setLoadingId(null);
    }
  }

  function handleDelete(id: string) {
    dispatch({ type: "DELETE_ITINERARY", payload: id });
  }

  function handleEdit(id: string) {
    const itinerary = state.savedItineraries.find((i) => i.id === id);
    dispatch({ type: "BEGIN_EDIT_ITINERARY", payload: id });
    if (itinerary) {
      generateCityTags(itinerary.city, null)
        .then((tags) => dispatch({ type: "SET_CITY_TAGS", payload: tags }))
        .catch(() => dispatch({ type: "SET_CITY_TAGS", payload: [] }));
    }
    router.push("/(tabs)/plan/places");
  }

  const { savedItineraries } = state;

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["bottom"]}>
      <View className="px-4 py-3">
        <Text className="text-zinc-100 font-bold text-xl">Saved Itineraries</Text>
        <Text className="text-zinc-500 text-sm mt-0.5">
          {savedItineraries.length === 0
            ? "Build one in the Plan tab"
            : `${savedItineraries.length} itinerar${savedItineraries.length !== 1 ? "ies" : "y"}`}
        </Text>
      </View>

      {savedItineraries.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-5xl">🗺️</Text>
          <Text className="text-zinc-400 text-base text-center">
            No saved itineraries yet.{"\n"}Head to the Plan tab to build one.
          </Text>
          <Pressable
            onPress={() => router.navigate("/(tabs)/plan")}
            className="bg-amber-400 rounded-2xl min-h-[52px] px-8 items-center justify-center"
          >
            <Text className="text-zinc-900 font-bold">Go to Plan</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        >
          {savedItineraries.map((itinerary) => {
            const isLoading = loadingId === itinerary.id;
            const date = new Date(itinerary.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

            return (
              <View
                key={itinerary.id}
                className="bg-zinc-900 rounded-2xl p-4 gap-3"
              >
                {/* Name + subtitle */}
                <View className="gap-1">
                  <Text className="text-zinc-100 font-bold text-base" numberOfLines={1}>
                    {itinerary.name}
                  </Text>
                  <Text className="text-zinc-500 text-xs">
                    {itinerary.city} · {(itinerary.startPlace ? 1 : 0) + itinerary.places.length + (itinerary.endPlace ? 1 : 0)} stop{((itinerary.startPlace ? 1 : 0) + itinerary.places.length + (itinerary.endPlace ? 1 : 0)) !== 1 ? "s" : ""} · {date}
                  </Text>
                </View>

                {/* Action row: edit + delete circles, start button */}
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => handleEdit(itinerary.id)}
                    className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center"
                  >
                    <Ionicons name="pencil-outline" size={18} color="#a1a1aa" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleDelete(itinerary.id)}
                    className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={18} color="#a1a1aa" />
                  </Pressable>
                  <Pressable
                    onPress={() => handleStart(itinerary)}
                    disabled={isLoading}
                    className={`flex-1 h-11 bg-amber-400 rounded-2xl items-center justify-center flex-row gap-2 ${isLoading ? "opacity-70" : ""}`}
                  >
                    {isLoading && <ActivityIndicator size="small" color="#09090b" />}
                    <Text className="text-zinc-900 font-bold">
                      {isLoading ? "Starting..." : "Start"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
