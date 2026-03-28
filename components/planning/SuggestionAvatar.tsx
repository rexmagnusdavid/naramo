import React from "react";
import { View, Text } from "react-native";

const COLORS = ["#b45309", "#0369a1", "#047857", "#7c3aed", "#be185d", "#0f766e", "#c2410c", "#1d4ed8"];

export function SuggestionAvatar({ name }: { name: string }) {
  const color = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];
  const letter = name.charAt(0).toUpperCase();
  return (
    <View
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: color,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15, lineHeight: 18 }}>
        {letter}
      </Text>
    </View>
  );
}
