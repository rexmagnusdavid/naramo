import React, { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { toast } from "sonner-native";
import { SwipeCard } from "./SwipeCard";
import { useApp } from "@/context/AppContext";
import { searchPlaces, aiTranslate } from "@/lib/api";
import { Place } from "@/lib/types";

// Start fetching when this many unswiped cards remain
const PRELOAD_THRESHOLD = 5;

export interface SwipeDeckHandle {
  swipe: (direction: "like" | "nope") => void;
}

interface SwipeDeckProps {
  onCurrentChange?: (place: Place | null) => void;
  onOutOfCardsChange?: (outOfCards: boolean) => void;
}

export const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(function SwipeDeck(
  { onCurrentChange, onOutOfCardsChange },
  ref
) {
  const { state, dispatch } = useApp();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const [containerHeight, setContainerHeight] = useState(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refs so loadMore always reads current state without stale closures.
  // Updated in sync via useEffect after every relevant state change.
  const aiQueriesRef = useRef(state.aiQueries);
  const pageTokensRef = useRef(state.searchPageTokens);
  const seenIdsRef = useRef(new Set(state.seenPlaceIds));
  const cityRef = useRef(state.city);
  const cityCoordsRef = useRef(state.cityCoords);
  const weatherRef = useRef(state.weather);
  const tagsRef = useRef(state.selectedTags);
  const vibeRef = useRef(state.vibeText);

  useEffect(() => {
    aiQueriesRef.current = state.aiQueries;
    // Merge into usedQueries so regeneration rounds always avoid everything tried so far
    usedQueriesRef.current = [...new Set([...usedQueriesRef.current, ...state.aiQueries])];
  }, [state.aiQueries]);
  useEffect(() => { pageTokensRef.current = state.searchPageTokens; }, [state.searchPageTokens]);
  useEffect(() => { seenIdsRef.current = new Set(state.seenPlaceIds); }, [state.seenPlaceIds]);
  useEffect(() => { cityRef.current = state.city; }, [state.city]);
  useEffect(() => { cityCoordsRef.current = state.cityCoords; }, [state.cityCoords]);
  useEffect(() => { weatherRef.current = state.weather; }, [state.weather]);
  useEffect(() => { tagsRef.current = state.selectedTags; }, [state.selectedTags]);
  useEffect(() => { vibeRef.current = state.vibeText; }, [state.vibeText]);

  const fetchInFlight = useRef(false);
  const emptyRounds = useRef(0);
  // Accumulates every query string ever used so AI regeneration avoids them
  const usedQueriesRef = useRef<string[]>(state.aiQueries);

  // Deduplicated view of discovered places for the deck
  const places = useMemo(() => {
    const seen = new Set<string>();
    return state.discoveredPlaces.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [state.discoveredPlaces]);

  const outOfCards = currentIndex >= places.length;

  // Notify parent of current top card
  useEffect(() => {
    onCurrentChange?.(places[currentIndex] ?? null);
  }, [currentIndex, places, onCurrentChange]);

  const loadMore = useCallback(async () => {
    if (fetchInFlight.current) return;

    fetchInFlight.current = true;
    setLoadingMore(true);

    try {
      const city = cityRef.current;
      const seenIds = seenIdsRef.current;

      // Fetch next page using current tokens
      const { places: batch, nextPageTokens } = await searchPlaces(
        aiQueriesRef.current,
        pageTokensRef.current,
        city,
        false,
        cityCoordsRef.current ?? undefined
      );

      const fresh = batch.filter((p) => !seenIds.has(p.id));

      if (fresh.length > 0) {
        emptyRounds.current = 0;
        dispatch({ type: "ADD_DISCOVERED", payload: fresh });
        dispatch({ type: "SET_PAGE_TOKENS", payload: nextPageTokens });
      } else {
        // Current queries exhausted — ask AI for a fresh angle, avoiding all prior queries
        const weatherStr = weatherRef.current
          ? `${weatherRef.current.description}, ${weatherRef.current.temp}°C`
          : "clear skies";
        const newQueries = await aiTranslate(
          tagsRef.current,
          vibeRef.current,
          weatherStr,
          city,
          usedQueriesRef.current
        );
        // Track these so future rounds don't repeat them either
        usedQueriesRef.current = [...usedQueriesRef.current, ...newQueries];
        dispatch({ type: "SET_AI_QUERIES", payload: newQueries });

        const { places: freshBatch, nextPageTokens: freshTokens } = await searchPlaces(
          newQueries,
          [],
          city,
          false,
          cityCoordsRef.current ?? undefined
        );
        const freshFiltered = freshBatch.filter((p) => !seenIds.has(p.id));

        if (freshFiltered.length > 0) {
          emptyRounds.current = 0;
          dispatch({ type: "ADD_DISCOVERED", payload: freshFiltered });
          dispatch({ type: "SET_PAGE_TOKENS", payload: freshTokens });
        } else {
          emptyRounds.current += 1;
        }
      }
    } catch {
      toast.error("Could not load more places.");
    } finally {
      fetchInFlight.current = false;
      setLoadingMore(false);
    }
  }, [dispatch]);

  // Bootstrap: only fetch if there are truly no places (e.g. network error upstream)
  useEffect(() => {
    if (places.length === 0) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useImperativeHandle(ref, () => ({ swipe: handleSwipe }));

  useEffect(() => {
    onOutOfCardsChange?.(outOfCards);
  }, [outOfCards]);

  function handleSwipe(direction: "like" | "nope") {
    const place = places[currentIndex];
    if (direction === "like" && place) {
      dispatch({ type: "TOGGLE_SELECT", payload: place });
    }
    const next = currentIndex + 1;
    setCurrentIndex(next);

    const remaining = places.length - next;
    if (remaining <= PRELOAD_THRESHOLD) {
      loadMore();
    }
  }

  // Render up to 3 stacked cards
  const visibleCards: React.ReactNode[] = [];
  for (let i = Math.min(currentIndex + 2, places.length - 1); i >= currentIndex; i--) {
    visibleCards.push(
      <SwipeCard
        key={places[i].id}
        place={places[i]}
        onSwipe={handleSwipe}
        isTop={i === currentIndex}
        index={i - currentIndex}
        containerHeight={containerHeight}
      />
    );
  }

  return (
    <View className="flex-1 items-center">
      <View
        style={{ flex: 1, width: SCREEN_WIDTH - 32 }}
        className="items-center justify-center"
        onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
      >
        {outOfCards ? (
          <View className="items-center gap-3">
            <Text className="text-zinc-500 text-4xl">✦</Text>
            <Text className="text-zinc-400 text-base font-semibold">You've reached the end</Text>
            <Text className="text-zinc-600 text-sm text-center">Hit Done to save your picks</Text>
          </View>
        ) : (
          visibleCards
        )}

      </View>

    </View>
  );
});
