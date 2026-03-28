import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useApp } from "@/context/AppContext";
import { GradientOverlay } from "@/components/ui/GradientOverlay";
import { autocompleteCity, getCityDetails, generateCityTags } from "@/lib/api";
import { CityPrediction } from "@/lib/types";
import { SearchInput } from "@/components/ui/SearchInput";
import { PlaceSuggestionCard } from "@/components/ui/PlaceSuggestionCard";

export function CityInput() {
  const { state, dispatch } = useApp();
  const [loadingDetails, setLoadingDetails] = useState(false);

  const isConfirmed = Boolean(state.city);

  async function handleSelect(prediction: CityPrediction) {
    setLoadingDetails(true);
    const details = await getCityDetails(prediction.placeId, true);
    dispatch({
      type: "SET_CITY_DETAILS",
      payload: {
        city: prediction.mainText,
        imageUrl: details.imageUrl ?? null,
        flag: details.flag,
        country: details.country,
        coords: details.coords,
      },
    });
    setLoadingDetails(false);
    // Generate city-specific tags; always dispatch so loading state clears
    generateCityTags(prediction.mainText, details.country)
      .then((tags) => dispatch({ type: "SET_CITY_TAGS", payload: tags }))
      .catch(() => dispatch({ type: "SET_CITY_TAGS", payload: [] }));
  }

  function handleChange() {
    dispatch({
      type: "SET_CITY_DETAILS",
      payload: { city: "", imageUrl: null, flag: null, country: null, coords: null },
    });
  }

  // --- Confirmed city display card ---
  if (isConfirmed) {
    return (
      <View style={{ flex: 1, borderRadius: 20, overflow: "hidden", backgroundColor: "#18181b" }}>
        {loadingDetails ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#f59e0b" size="large" />
          </View>
        ) : state.cityImageUrl ? (
          <Image
            source={{ uri: state.cityImageUrl }}
            style={{ flex: 1 }}
            contentFit="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#27272a" }}>
            <Text style={{ color: "#52525b", fontSize: 14 }}>No city photo available</Text>
          </View>
        )}

        <GradientOverlay />

        <Pressable
          onPress={handleChange}
          style={{ position: "absolute", top: 16, right: 16, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}
        >
          <Text style={{ color: "#e4e4e7", fontSize: 13, fontWeight: "600" }}>Change</Text>
        </Pressable>

        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, gap: 4 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 32 }} numberOfLines={1}>
            {state.cityFlag ? `${state.cityFlag} ` : ""}{state.city}
          </Text>
          {state.cityCountry && (
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 16 }}>{state.cityCountry}</Text>
          )}
        </View>
      </View>
    );
  }

  // --- Input + suggestions ---
  return (
    <SearchInput<CityPrediction>
      placeholder="Search for a city..."
      queryFn={autocompleteCity}
      extraLoading={loadingDetails}
      onSelect={handleSelect}
      bare
      renderSuggestion={(pred, _index, onPress) => (
        <PlaceSuggestionCard key={pred.placeId} pred={pred} onPress={onPress} />
      )}
    />
  );
}
