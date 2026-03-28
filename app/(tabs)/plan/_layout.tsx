import { Stack, router, useSegments } from "expo-router";
import { useEffect } from "react";
import { useApp } from "@/context/AppContext";

export default function PlanLayout() {
  const { state } = useApp();
  const segments = useSegments();

  useEffect(() => {
    // Only act when we're inside the plan stack
    if (!(segments as string[]).includes("plan")) return;
    const currentScreen = segments[segments.length - 1];
    if (!state.city && !state.editingItineraryId && currentScreen !== "plan") {
      router.replace("/(tabs)/plan");
    }
  }, [state.city, state.editingItineraryId, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
