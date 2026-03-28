import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toast } from "sonner-native";
import { useApp } from "@/context/AppContext";
import { getCurrentPosition } from "@/lib/geo";
import { sortByDistance } from "@/lib/api";
import { Place } from "@/lib/types";

export function NavigationButtons() {
  const { state, dispatch } = useApp();
  const [skipping, setSkipping] = useState(false);

  async function handleNext() {
    if (state.queue.length <= 1) {
      toast.info("That was your last place!");
    }
    dispatch({ type: "ADVANCE_QUEUE" });
    await checkHardStops();
  }

  async function handleSkip() {
    if (state.queue.length <= 1) {
      toast.info("Nothing left to skip to!");
      return;
    }
    setSkipping(true);
    try {
      const remaining = state.queue.slice(1);
      let coords = state.userLocation;
      try {
        coords = await getCurrentPosition();
      } catch {
        /* use last known */
      }

      if (!coords) {
        dispatch({ type: "ADVANCE_QUEUE" });
        return;
      }

      dispatch({ type: "SET_USER_LOCATION", payload: coords });

      const { sorted } = await sortByDistance(coords, remaining);
      dispatch({ type: "SKIP_AND_RESORT", payload: sorted });
      await checkHardStops();
    } catch {
      toast.error("Could not resort queue.");
      dispatch({ type: "ADVANCE_QUEUE" });
    } finally {
      setSkipping(false);
    }
  }

  async function checkHardStops() {
    const coords = state.userLocation;
    if (!coords) return;
    const now = new Date();

    const placesWithDeadline = state.queue.filter((p) => p.hardStopTime);
    if (placesWithDeadline.length === 0) return;

    try {
      const { sorted, durations } = await sortByDistance(coords, placesWithDeadline);
      sorted.forEach((place: Place, i: number) => {
        if (!place.hardStopTime) return;
        const [h, m] = place.hardStopTime.split(":").map(Number);
        const deadline = new Date();
        deadline.setHours(h, m, 0, 0);
        const transitMs = durations[i] ?? 0;
        const bufferMs = 15 * 60 * 1000;
        if (now.getTime() + transitMs + bufferMs >= deadline.getTime()) {
          toast.warning(`Time to head to "${place.name}"!`, { duration: 8000 });
        }
      });
    } catch {
      /* non-critical */
    }
  }

  const hasNext = state.queue.length > 1;

  return (
    <View className="flex-row gap-3">
      <Pressable
        onPress={handleSkip}
        disabled={skipping || !hasNext}
        className={`flex-1 border border-zinc-700 rounded-2xl min-h-[52px] items-center justify-center flex-row gap-2 ${
          !hasNext ? "opacity-40" : ""
        }`}
      >
        {skipping ? (
          <ActivityIndicator size="small" color="#a1a1aa" />
        ) : (
          <>
            <Ionicons name="play-skip-forward-outline" size={18} color="#d4d4d8" />
            <Text className="text-zinc-300 font-semibold">Skip</Text>
          </>
        )}
      </Pressable>
      <Pressable
        onPress={handleNext}
        disabled={state.queue.length === 0}
        className={`flex-1 bg-zinc-800 border border-zinc-700 rounded-2xl min-h-[52px] items-center justify-center flex-row gap-2 ${
          state.queue.length === 0 ? "opacity-40" : ""
        }`}
      >
        <Text className="text-zinc-100 font-bold">Next ›</Text>
      </Pressable>
    </View>
  );
}
