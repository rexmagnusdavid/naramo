import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/theme";

interface GradientOverlayProps {
  pointerEvents?: "none" | "box-none" | "box-only" | "auto";
}

export function GradientOverlay({ pointerEvents = "none" }: GradientOverlayProps) {
  return (
    <LinearGradient
      colors={GRADIENTS.cardOverlay.colors}
      locations={GRADIENTS.cardOverlay.locations}
      style={StyleSheet.absoluteFillObject}
      pointerEvents={pointerEvents}
    />
  );
}
