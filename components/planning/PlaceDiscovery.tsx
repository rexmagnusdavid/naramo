import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { toast } from "sonner-native";
import { PlaceCard } from "./PlaceCard";
import { useApp } from "@/context/AppContext";
import { searchPlaces, aiTranslate } from "@/lib/api";
import { FALLBACK_PLACES } from "@/lib/fallback";
import { Place } from "@/lib/types";

interface PlaceDiscoveryProps {
  onConfirm: () => void;
}

export function PlaceDiscovery({ onConfirm }: PlaceDiscoveryProps) {
  const { state, dispatch } = useApp();
  const [loadingMore, setLoadingMore] = useState(false);
  const { width } = useWindowDimensions();
  const CARD_GAP = 12;
  const PADDING = 16;
  const cardWidth = (width - PADDING * 2 - CARD_GAP) / 2;

  const hasMore = state.searchPageTokens.some((t) => t !== "");

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || state.aiQueries.length === 0) return;
    setLoadingMore(true);
    try {
      const { places, nextPageTokens } = await searchPlaces(
        state.aiQueries,
        state.searchPageTokens,
        state.city
      );
      const newPlaces = places.filter(
        (p) => !state.seenPlaceIds.includes(p.id)
      );
      dispatch({ type: "ADD_DISCOVERED", payload: newPlaces });
      dispatch({ type: "SET_PAGE_TOKENS", payload: nextPageTokens });
    } catch {
      toast.error("Could not load more places.");
    } finally {
      setLoadingMore(false);
    }
  }, [
    loadingMore,
    hasMore,
    state.aiQueries,
    state.searchPageTokens,
    state.seenPlaceIds,
    state.city,
    dispatch,
  ]);

  async function loadNewQueries() {
    try {
      const weatherStr = state.weather
        ? `${state.weather.description}, ${state.weather.temp}°C`
        : "unknown weather";
      const queries = await aiTranslate(
        state.selectedTags,
        state.vibeText,
        weatherStr,
        state.city
      );
      const { places, nextPageTokens } = await searchPlaces(
        queries,
        [],
        state.city
      );
      const newPlaces = (places.length ? places : FALLBACK_PLACES).filter(
        (p) => !state.seenPlaceIds.includes(p.id)
      );
      dispatch({ type: "ADD_DISCOVERED", payload: newPlaces });
      dispatch({ type: "SET_PAGE_TOKENS", payload: nextPageTokens });
    } catch {
      toast.error("Could not fetch more places.");
    }
  }

  const places = state.discoveredPlaces;

  return (
    <View className="flex-1">
      {/* Header row */}
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm text-zinc-400">
          {places.length} places found
          {state.selectedPlaces.length > 0 && (
            <Text className="text-amber-400 font-medium">
              {" "}· {state.selectedPlaces.length} selected
            </Text>
          )}
        </Text>
        <Pressable
          onPress={loadNewQueries}
          className="min-h-[44px] px-3 items-center justify-center"
        >
          <Text className="text-zinc-400 text-sm">↺ Find more</Text>
        </Pressable>
      </View>

      <FlatList
        data={places}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: CARD_GAP, marginBottom: CARD_GAP }}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <PlaceCard
              place={item}
              selected={state.selectedPlaces.some((p) => p.id === item.id)}
              onToggle={() => dispatch({ type: "TOGGLE_SELECT", payload: item })}
            />
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#71717a" className="my-4" />
          ) : !hasMore && places.length > 0 ? (
            <Text className="text-zinc-600 text-xs text-center py-4">
              All places loaded
            </Text>
          ) : null
        }
        scrollEnabled={false}
      />

      {/* Sticky confirm button */}
      {state.selectedPlaces.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 items-center pb-4 pt-2 bg-zinc-950/90">
          <Pressable
            onPress={onConfirm}
            className="bg-amber-400 px-8 min-h-[52px] rounded-2xl items-center justify-center shadow-lg"
          >
            <Text className="text-zinc-900 font-bold text-base">
              Continue with {state.selectedPlaces.length} place
              {state.selectedPlaces.length !== 1 ? "s" : ""} →
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
