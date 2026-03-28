import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, ActivityIndicator, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import { SwipeCard } from "./SwipeCard";
import { useApp } from "@/context/AppContext";
import { searchPlaces, aiTranslate } from "@/lib/api";
import { Place } from "@/lib/types";

// Start fetching when this many cards remain — high enough to hide latency
const PRELOAD_THRESHOLD = 7;
// Give up only after this many consecutive rounds that yield 0 new places
const MAX_EMPTY_ROUNDS = 3;

interface SwipeDeckProps {
  onCurrentChange?: (place: Place | null) => void;
}

export function SwipeDeck({ onCurrentChange }: SwipeDeckProps) {
  const { state, dispatch } = useApp();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const consecutiveEmpty = useRef(0);
  const fetchInFlight = useRef(false);

  const places = useMemo(() => {
    const seen = new Set<string>();
    return state.discoveredPlaces.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [state.discoveredPlaces]);
  const remaining = places.length - currentIndex;

  const loadMore = useCallback(async () => {
    if (fetchInFlight.current) return;
    if (consecutiveEmpty.current >= MAX_EMPTY_ROUNDS) return;

    fetchInFlight.current = true;
    setLoadingMore(true);
    try {
      const { places: newPlaces, nextPageTokens } = await searchPlaces(
        state.aiQueries,
        state.searchPageTokens,
        state.city
      );
      const deduped = newPlaces.filter(
        (p) => !state.seenPlaceIds.includes(p.id)
      );

      if (deduped.length > 0) {
        consecutiveEmpty.current = 0;
        dispatch({ type: "ADD_DISCOVERED", payload: deduped });
        dispatch({ type: "SET_PAGE_TOKENS", payload: nextPageTokens });
      } else {
        // Pages exhausted — regenerate AI queries for a fresh angle and retry
        try {
          const weatherStr = state.weather
            ? `${state.weather.description}, ${state.weather.temp}°C`
            : "clear skies";
          const freshQueries = await aiTranslate(
            state.selectedTags,
            state.vibeText,
            weatherStr,
            state.city
          );
          dispatch({ type: "SET_AI_QUERIES", payload: freshQueries });
          const fresh = await searchPlaces(freshQueries, [], state.city);
          const freshDeduped = fresh.places.filter(
            (p) => !state.seenPlaceIds.includes(p.id)
          );
          if (freshDeduped.length > 0) {
            consecutiveEmpty.current = 0;
            dispatch({ type: "ADD_DISCOVERED", payload: freshDeduped });
            dispatch({ type: "SET_PAGE_TOKENS", payload: fresh.nextPageTokens });
          } else {
            consecutiveEmpty.current += 1;
          }
        } catch {
          consecutiveEmpty.current += 1;
        }
      }
    } catch {
      toast.error("Could not load more places.");
    } finally {
      fetchInFlight.current = false;
      setLoadingMore(false);
    }
  }, [
    state.aiQueries,
    state.searchPageTokens,
    state.seenPlaceIds,
    state.city,
    state.weather,
    state.selectedTags,
    state.vibeText,
    dispatch,
  ]);

  // Trigger initial load if deck starts short (e.g. after heavy dedup)
  useEffect(() => {
    if (places.length <= PRELOAD_THRESHOLD) {
      loadMore();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent of current top card
  useEffect(() => {
    onCurrentChange?.(places[currentIndex] ?? null);
  }, [currentIndex, places, onCurrentChange]);

  function handleSwipe(direction: "like" | "nope") {
    const place = places[currentIndex];
    if (direction === "like" && place) {
      dispatch({ type: "TOGGLE_SELECT", payload: place });
    }
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);

    // Proactively fetch while running low, and always when hitting the last card
    if (places.length - nextIndex <= PRELOAD_THRESHOLD || nextIndex >= places.length) {
      loadMore();
    }
  }

  // Render up to 3 cards stacked
  const visibleCards = [];
  for (let i = Math.min(currentIndex + 2, places.length - 1); i >= currentIndex; i--) {
    const stackIndex = i - currentIndex; // 0 = top, 1 = behind, 2 = furthest back
    visibleCards.push(
      <SwipeCard
        key={places[i].id}
        place={places[i]}
        onSwipe={handleSwipe}
        isTop={i === currentIndex}
        index={stackIndex}
      />
    );
  }

  const outOfCards = currentIndex >= places.length;
  const isExhausted = outOfCards && !fetchInFlight.current && consecutiveEmpty.current >= MAX_EMPTY_ROUNDS;
  // Freeze the last card any time we're out of cards but not truly exhausted.
  // Crucially, this uses the ref (not loadingMore state) so it's synchronous —
  // no race window where outOfCards is true but the spinner hasn't rendered yet.
  const isFrozen = outOfCards && !isExhausted;
  const lastPlace = places[places.length - 1] ?? null;

  return (
    <View className="flex-1 items-center">
      {/* Card stack */}
      <View
        style={{ flex: 1, width: SCREEN_WIDTH - 32 }}
        className="items-center justify-center"
      >
        {isExhausted ? (
          <Text className="text-zinc-600 text-sm text-center">
            Nothing more nearby. Tap Done → when ready.
          </Text>
        ) : isFrozen && lastPlace ? (
          <>
            <SwipeCard
              key={`frozen-${lastPlace.id}`}
              place={lastPlace}
              onSwipe={handleSwipe}
              isTop
              index={0}
              disabled
            />
            <View className="absolute bottom-3 bg-black/70 rounded-full px-3.5 py-1.5 flex-row items-center gap-1.5">
              <ActivityIndicator size="small" color="#f59e0b" />
              <Text className="text-amber-400 text-xs font-semibold">Finding more places…</Text>
            </View>
          </>
        ) : (
          visibleCards
        )}

        {/* Loading badge while preloading (cards still visible) */}
        {loadingMore && !outOfCards && (
          <View className="absolute bottom-3 bg-black/60 rounded-full px-3 py-1.5 flex-row items-center gap-1.5">
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text className="text-amber-400 text-xs">Loading more...</Text>
          </View>
        )}
      </View>

      {/* Like / Nope buttons */}
      <View className="flex-row gap-6 pb-6 pt-3">
        <View
          className={`w-16 h-16 rounded-full bg-zinc-900 border-2 items-center justify-center ${outOfCards ? "opacity-30 border-zinc-800" : "border-red-500"}`}
          pointerEvents={outOfCards ? "none" : "auto"}
        >
          <Ionicons
            name="close"
            size={28}
            color={outOfCards ? "#3f3f46" : "#ef4444"}
            onPress={outOfCards ? undefined : () => handleSwipe("nope")}
          />
        </View>
        <View
          className={`w-16 h-16 rounded-full bg-zinc-900 border-2 items-center justify-center ${outOfCards ? "opacity-30 border-zinc-800" : "border-green-500"}`}
          pointerEvents={outOfCards ? "none" : "auto"}
        >
          <Ionicons
            name="heart"
            size={26}
            color={outOfCards ? "#3f3f46" : "#22c55e"}
            onPress={outOfCards ? undefined : () => handleSwipe("like")}
          />
        </View>
      </View>
    </View>
  );
}
