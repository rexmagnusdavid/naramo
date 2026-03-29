import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { CurrentPlace } from "@/components/travel/CurrentPlace";
import { QueuePreview } from "@/components/travel/QueuePreview";
import { TripMap } from "@/components/travel/TripMap";
import { ActionModal } from "@/components/ui/ActionModal";
import { useApp } from "@/context/AppContext";
import { checkWeatherSensitivity, checkPlacesOpenNow, sortByDistance } from "@/lib/api";
import { Place } from "@/lib/types";
import { toast } from "sonner-native";

const BAD_WEATHER_PREFIXES = ["09", "10", "11", "13", "50"];

function weatherEmoji(icon: string): string {
  const code = icon.slice(0, 2);
  const isDay = icon.endsWith("d");
  const map: Record<string, string> = {
    "01": isDay ? "☀️" : "🌙",
    "02": isDay ? "🌤️" : "🌤️",
    "03": "☁️",
    "04": "☁️",
    "09": "🌧️",
    "10": isDay ? "🌦️" : "🌧️",
    "11": "⛈️",
    "13": "🌨️",
    "50": "🌫️",
  };
  return map[code] ?? "🌡️";
}

function isBadWeather(icon: string): boolean {
  return BAD_WEATHER_PREFIXES.some((prefix) => icon.startsWith(prefix));
}

export default function ActiveTravelScreen() {
  const { state, dispatch } = useApp();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mapExpanded, setMapExpanded] = useState(false);

  // Weather modal state
  const weatherChecked = useRef(false);
  const [weatherModal, setWeatherModal] = useState<{
    visible: boolean;
    sensitivePlaces: Place[];
  }>({ visible: false, sensitivePlaces: [] });

  // Closed-place modal state
  const closedModalShownFor = useRef<string | null>(null);
  const [closedModal, setClosedModal] = useState(false);

  useEffect(() => {
    if (state.phase !== "travel" || state.queue.length === 0) {
      router.replace("/(tabs)/travel");
    }
  }, [state.phase, state.queue.length]);

  // Run once on mount: open/closed status check + weather check
  useEffect(() => {
    if (state.phase !== "travel" || state.queue.length === 0) return;

    const endpointIds = new Set([
      state.startPlace?.id,
      state.endPlace?.id,
    ].filter(Boolean));

    const checkable = state.queue.filter((p) => !endpointIds.has(p.id));

    // Open/closed check
    checkPlacesOpenNow(checkable).then((statusMap) => {
      dispatch({ type: "UPDATE_QUEUE_OPEN_STATUS", payload: statusMap });
    });

    // Weather sensitivity check
    if (!weatherChecked.current && state.weather && isBadWeather(state.weather.icon)) {
      weatherChecked.current = true;
      checkWeatherSensitivity(checkable, state.weather.description).then((sensitiveIds) => {
        if (sensitiveIds.length === 0) return;
        const sensitivePlaces = checkable.filter((p) => sensitiveIds.includes(p.id));
        setWeatherModal({ visible: true, sensitivePlaces });
      });
    } else {
      weatherChecked.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount

  // Watch current place for closed status
  useEffect(() => {
    const current = state.queue[0];
    if (!current) return;
    if (current.isOpen === false && closedModalShownFor.current !== current.id) {
      closedModalShownFor.current = current.id;
      setClosedModal(true);
    }
  }, [state.queue[0]?.id, state.queue[0]?.isOpen]);

  if (state.phase !== "travel" || state.queue.length === 0) {
    return null;
  }

  const currentPlace = state.queue[0];
  const { weather } = state;

  async function handleNext() {
    if (state.queue.length <= 1) {
      toast.info("That was your last place!");
    }
    dispatch({ type: "ADVANCE_QUEUE" });
    const coords = state.userLocation;
    if (!coords) return;
    const now = new Date();
    const nextQueue = state.queue.slice(1);
    const placesWithDeadline = nextQueue.filter((p) => p.hardStopTime);
    if (placesWithDeadline.length === 0) return;
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    const BUFFER_MS = 15 * 60 * 1000;
    try {
      const { sorted, durations } = await sortByDistance(coords, placesWithDeadline);
      sorted.forEach((place: Place, i: number) => {
        if (!place.hardStopTime) return;
        const [h, m] = place.hardStopTime.split(":").map(Number);
        const deadline = new Date();
        deadline.setHours(h, m, 0, 0);
        if (deadline.getTime() <= now.getTime()) return;
        if (deadline.getTime() - now.getTime() > TWO_HOURS_MS) return;
        const transitMs = durations[i] ?? 0;
        if (now.getTime() + transitMs + BUFFER_MS >= deadline.getTime()) {
          toast.warning(`Time to head to "${place.name}"!`, { duration: 8000 });
        }
      });
    } catch {
      /* non-critical */
    }
  }

  function handleEndTrip() {
    if (state.activeItineraryId) {
      dispatch({ type: "MARK_ITINERARY_DONE", payload: state.activeItineraryId });
    } else {
      dispatch({ type: "SET_PHASE", payload: "planning" });
    }
    router.replace("/(tabs)/travel");
  }

  function handleRemoveWeatherPlaces() {
    weatherModal.sensitivePlaces.forEach((p) =>
      dispatch({ type: "REMOVE_FROM_QUEUE", payload: p.id })
    );
    setWeatherModal({ visible: false, sensitivePlaces: [] });
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["bottom"]}>
      <View className="flex-1">
        {/* Top bar: weather + queue count */}
        <View className="flex-row items-center justify-between px-4 py-2">
          {weather ? (
            <View className="flex-row items-center gap-1.5">
              <Text style={{ fontSize: 18 }}>{weatherEmoji(weather.icon)}</Text>
              <Text className="text-sm text-zinc-400 capitalize">
                {weather.description}
              </Text>
              <Text className="text-sm text-zinc-400">{weather.temp}°C</Text>
            </View>
          ) : (
            <Text className="text-sm text-zinc-600">☁ Weather unavailable</Text>
          )}

          <Text className="text-xs text-zinc-500">
            {state.queue.length} stop{state.queue.length !== 1 ? "s" : ""} left
          </Text>
        </View>

        {/* Floating map widget */}
        <Pressable
          onPress={() => setMapExpanded(true)}
          style={{
            position: "absolute",
            top: 56,
            right: 16,
            width: 110,
            height: 110,
            borderRadius: 20,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#3f3f46",
            zIndex: 10,
          }}
        >
          <View pointerEvents="none" style={{ flex: 1 }}>
            <TripMap
              places={state.queue}
              height={110}
              navigationStarted={state.navigationStarted}
              lastPlace={state.lastPlace}
              userLocation={state.userLocation}
              compact
            />
          </View>
          <View style={{
            position: "absolute", bottom: 4, right: 4,
            backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, padding: 3,
          }}>
            <Ionicons name="expand-outline" size={11} color="#a1a1aa" />
          </View>
        </Pressable>

        {/* Content — fixed layout, no scroll */}
        <View style={{ flex: 1, padding: 12, gap: 10 }}>
          <CurrentPlace place={currentPlace} />
          <Pressable
            onPress={handleNext}
            disabled={state.queue.length === 0}
            className={`bg-zinc-800 border border-zinc-700 rounded-2xl min-h-[52px] items-center justify-center ${
              state.queue.length === 0 ? "opacity-40" : ""
            }`}
          >
            <Text className="text-zinc-100 font-bold">Next ›</Text>
          </Pressable>
          <QueuePreview queue={state.queue} />
          <Pressable
            onPress={handleEndTrip}
            className="border border-zinc-700 rounded-2xl min-h-[52px] items-center justify-center"
          >
            <Text className="text-zinc-400 font-semibold">End Trip</Text>
          </Pressable>
        </View>
      </View>

      {/* Weather sensitivity modal */}
      <ActionModal
        visible={weatherModal.visible}
        title={`Bad weather: ${weather?.description ?? ""}`}
        body={
          <View className="gap-3">
            <Text className="text-zinc-400 text-sm">
              These places on your list may not be ideal in this weather:
            </Text>
            {weatherModal.sensitivePlaces.map((p) => (
              <View key={p.id} className="flex-row items-center gap-2">
                <Text className="text-amber-400 text-sm">·</Text>
                <Text className="text-zinc-300 text-sm">{p.name}</Text>
              </View>
            ))}
          </View>
        }
        actions={[
          {
            label: `Remove ${weatherModal.sensitivePlaces.length} affected place${weatherModal.sensitivePlaces.length !== 1 ? "s" : ""}`,
            onPress: handleRemoveWeatherPlaces,
            destructive: true,
          },
          {
            label: "Keep all",
            onPress: () => setWeatherModal({ visible: false, sensitivePlaces: [] }),
          },
        ]}
        onDismiss={() => setWeatherModal({ visible: false, sensitivePlaces: [] })}
      />

      {/* Closed place modal */}
      <ActionModal
        visible={closedModal}
        title="This place may be closed"
        body={
          <Text className="text-zinc-400 text-sm">
            <Text className="text-zinc-200 font-semibold">{currentPlace.name}</Text>
            {" "}doesn't appear to be open right now. You can skip to the next place or head there anyway.
          </Text>
        }
        actions={[
          {
            label: "Skip to next",
            onPress: () => {
              setClosedModal(false);
              dispatch({ type: "ADVANCE_QUEUE" });
            },
            destructive: true,
          },
          {
            label: "Go anyway",
            onPress: () => setClosedModal(false),
          },
        ]}
        onDismiss={() => setClosedModal(false)}
      />

      {/* Full-screen map overlay — plain View avoids system transparency effects */}
      {mapExpanded && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            backgroundColor: "#000000",
          }}
        >
          <TripMap
            places={state.queue}
            height={screenHeight}
            navigationStarted={state.navigationStarted}
            lastPlace={state.lastPlace}
            userLocation={state.userLocation}
          />
          <Pressable
            onPress={() => setMapExpanded(false)}
            style={{
              position: "absolute",
              top: insets.top + 8,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(9,9,11,0.75)",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "#3f3f46",
            }}
          >
            <Ionicons name="close" size={22} color="#f4f4f5" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
