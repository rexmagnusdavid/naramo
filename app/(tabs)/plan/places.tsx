import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { toast } from "sonner-native";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { autocompletePlaceInCity, getPlaceById } from "@/lib/api";
import { optimizeRoute } from "@/lib/routing";
import { CityPrediction } from "@/lib/types";
import { AnchorCard } from "@/components/planning/AnchorCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlaceSuggestionCard } from "@/components/ui/PlaceSuggestionCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export default function PlacesScreen() {
  const { state, dispatch } = useApp();
  const [loadingPlace, setLoadingPlace] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState<"start" | "end" | "middle" | null>(null);
  const [itineraryName, setItineraryName] = useState("");

  const editingItinerary = state.editingItineraryId
    ? state.savedItineraries.find((i) => i.id === state.editingItineraryId) ?? null
    : null;
  const isEditing = editingItinerary !== null;

  useEffect(() => {
    if (editingItinerary) setItineraryName(editingItinerary.name);
  }, [state.editingItineraryId]);

  useEffect(() => {
    if (state.selectedPlaces.length < 2) return;
    const origin = state.startPlace
      ? { lat: state.startPlace.lat, lng: state.startPlace.lng }
      : state.userLocation;
    const optimized = optimizeRoute(state.selectedPlaces, origin);
    const same =
      optimized.length === state.selectedPlaces.length &&
      optimized.every((p, i) => p.id === state.selectedPlaces[i].id);
    if (!same) dispatch({ type: "REORDER_SELECTED", payload: optimized });
  }, [
    state.selectedPlaces.map((p) => p.id).join(","),
    state.startPlace?.id,
    state.userLocation?.lat,
  ]);

  const queryFn = useCallback(
    (text: string) => autocompletePlaceInCity(text, state.city, state.cityCoords),
    [state.city, state.cityCoords]
  );

  async function handleSelect(prediction: CityPrediction, target: "start" | "end" | "middle") {
    setLoadingPlace(true);
    setLoadingTarget(target);
    const place = await getPlaceById(prediction.placeId);
    setLoadingPlace(false);
    setLoadingTarget(null);
    if (!place) {
      toast.error("Could not load place details.");
      return;
    }
    if (target === "start") {
      dispatch({ type: "SET_START_PLACE", payload: place });
    } else if (target === "end") {
      dispatch({ type: "SET_END_PLACE", payload: place });
    } else {
      if (state.selectedPlaces.some((p) => p.id === place.id)) {
        toast.info(`"${place.name}" is already in your list.`);
        return;
      }
      dispatch({ type: "TOGGLE_SELECT", payload: place });
      toast.success(`"${place.name}" added!`);
    }
  }

  function handleSave() {
    if (!itineraryName.trim()) {
      toast.error("Give your itinerary a name first!");
      return;
    }
    const hasContent = state.selectedPlaces.length > 0 || state.startPlace || state.endPlace;
    if (!hasContent) {
      toast.error("Add at least one place!");
      return;
    }
    if (isEditing && state.editingItineraryId) {
      dispatch({
        type: "UPDATE_ITINERARY",
        payload: {
          id: state.editingItineraryId,
          name: itineraryName.trim(),
          places: state.selectedPlaces,
          startPlace: state.startPlace,
          endPlace: state.endPlace,
        },
      });
      toast.success("Itinerary updated!");
    } else {
      dispatch({ type: "SAVE_ITINERARY", payload: { name: itineraryName.trim() } });
      toast.success("Saved! Start it from the Travel tab.");
    }
    router.replace("/(tabs)/travel");
  }

  function handleSetTime(placeId: string, time: string | undefined) {
    dispatch({ type: "SET_PLACE_HARD_STOP", payload: { placeId, time } });
  }

  const endSameAsStart =
    !!state.startPlace && !!state.endPlace && state.startPlace.id === state.endPlace.id;

  const cityLabel = state.city + (state.cityFlag ? ` ${state.cityFlag}` : "");

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScreenHeader
          title={isEditing ? "Edit Itinerary" : "Your Places"}
          subtitle={cityLabel}
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 240, gap: 24 }}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {/* ── Departure ── */}
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
                Departure
              </Text>
              <Text className="text-zinc-700 text-[11px]">hotel · airport · station</Text>
            </View>
            {state.startPlace ? (
              <AnchorCard
                place={state.startPlace}
                onRemove={() => dispatch({ type: "SET_START_PLACE", payload: null })}
                onSetTime={handleSetTime}
              />
            ) : (
              <SearchInput<CityPrediction>
                placeholder={`Starting point in ${state.city}…`}
                queryFn={queryFn}
                extraLoading={loadingTarget === "start" && loadingPlace}
                onSelect={(pred) => handleSelect(pred, "start")}
                bare
                renderSuggestion={(pred, _i, onPress) => (
                  <PlaceSuggestionCard key={pred.placeId} pred={pred} onPress={onPress} />
                )}
              />
            )}
          </View>

          {/* ── Return ── */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
                  Return
                </Text>
                <Text className="text-zinc-700 text-[11px]">where you end your day</Text>
              </View>
              {state.startPlace && !endSameAsStart && (
                <Pressable
                  onPress={() => dispatch({ type: "SET_END_PLACE", payload: state.startPlace })}
                  className="min-h-[28px] px-2.5 items-center justify-center rounded-full bg-zinc-800"
                >
                  <Text className="text-zinc-400 text-[11px] font-semibold">Same as departure</Text>
                </Pressable>
              )}
            </View>
            {state.endPlace ? (
              endSameAsStart ? (
                <View className="flex-row items-center justify-between bg-zinc-900 border border-zinc-700 rounded-2xl px-3.5 min-h-[44px]">
                  <Text className="text-zinc-500 text-sm">
                    Returning to {state.endPlace.name}
                  </Text>
                  <Pressable
                    onPress={() => dispatch({ type: "SET_END_PLACE", payload: null })}
                    className="min-h-[36px] min-w-[36px] items-center justify-center"
                  >
                    <Ionicons name="close" size={18} color="#52525b" />
                  </Pressable>
                </View>
              ) : (
                <AnchorCard
                  place={state.endPlace}
                  onRemove={() => dispatch({ type: "SET_END_PLACE", payload: null })}
                  onSetTime={handleSetTime}
                />
              )
            ) : (
              <SearchInput<CityPrediction>
                placeholder={`Return point in ${state.city}…`}
                queryFn={queryFn}
                extraLoading={loadingTarget === "end" && loadingPlace}
                onSelect={(pred) => handleSelect(pred, "end")}
                bare
                renderSuggestion={(pred, _i, onPress) => (
                  <PlaceSuggestionCard key={pred.placeId} pred={pred} onPress={onPress} />
                )}
              />
            )}
          </View>

          {/* ── Middle Stops ── */}
          <View className="gap-3">
            <Text className="text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
              Stops{state.selectedPlaces.length > 0 ? ` · ${state.selectedPlaces.length} · optimized` : ""}
            </Text>

            <SearchInput<CityPrediction>
              placeholder={`Add a stop in ${state.city || "your city"}…`}
              queryFn={queryFn}
              extraLoading={loadingTarget === "middle" && loadingPlace}
              onSelect={(pred) => handleSelect(pred, "middle")}
              bare
              renderSuggestion={(pred, _i, onPress) => (
                <PlaceSuggestionCard key={pred.placeId} pred={pred} onPress={onPress} />
              )}
            />

            {state.selectedPlaces.length === 0 ? (
              <View className="items-center py-5">
                <Text className="text-zinc-700 text-sm text-center">
                  No stops yet. Search above or tap Discover.
                </Text>
              </View>
            ) : (
              state.selectedPlaces.map((place, index) => (
                <View key={place.id} className="flex-row items-center gap-2.5">
                  <View className="w-7 h-7 rounded-full bg-zinc-700 items-center justify-center">
                    <Text className="text-zinc-300 text-[11px] font-bold">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <AnchorCard
                      place={place}
                      onRemove={() => dispatch({ type: "REMOVE_SELECTED", payload: place.id })}
                      onSetTime={handleSetTime}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Bottom action bar */}
        <View
          style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}
          className="px-4 pb-8 pt-4 bg-zinc-950/95 gap-2.5"
        >
          <TextInput
            value={itineraryName}
            onChangeText={setItineraryName}
            placeholder={isEditing ? "Itinerary name" : "Name your itinerary…"}
            placeholderTextColor="#52525b"
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 text-zinc-100 text-sm"
            style={{ minHeight: 44 }}
            returnKeyType="done"
          />
          <View className="flex-row gap-2.5">
            <Pressable
              onPress={() => router.push("/(tabs)/plan/vibe")}
              className="flex-1 border border-zinc-700 rounded-2xl min-h-[52px] items-center justify-center"
            >
              <Text className="text-zinc-300 font-semibold text-sm">Feed ✨</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              className="flex-1 bg-amber-400 rounded-2xl min-h-[52px] items-center justify-center"
            >
              <Text className="text-zinc-950 font-bold text-sm">
                {isEditing ? "Save Changes" : "Save Itinerary"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
