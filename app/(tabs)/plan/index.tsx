import React from "react";
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CityInput } from "@/components/planning/CityInput";
import { useApp } from "@/context/AppContext";

export default function CitySelectScreen() {
  const { state } = useApp();

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2 gap-1">
          <Text className="text-xl font-bold text-zinc-100">📍 Where to?</Text>
          <Text className="text-sm text-zinc-500">
            Start by picking your destination city.
          </Text>
        </View>

        {/* City input — flex-1 when confirmed so card fills available space */}
        <View style={{ flex: state.city ? 1 : 0, paddingHorizontal: 16, paddingBottom: 8, gap: 6 }}>
          <Text className="text-sm text-zinc-400">Select a city</Text>
          <CityInput />
        </View>

        {/* Suggestion scroll area — only shown when searching */}
        {!state.city && (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Next button */}
        <View className="px-4 pb-8 pt-3">
          <Pressable
            onPress={() => router.push("/(tabs)/plan/places")}
            disabled={!state.city}
            className={`bg-amber-400 rounded-2xl min-h-[52px] items-center justify-center ${
              !state.city ? "opacity-40" : ""
            }`}
          >
            <Text className="text-zinc-900 font-bold text-base">Next →</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
