import React from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CityInput } from "@/components/planning/CityInput";
import { useApp } from "@/context/AppContext";

export default function CitySelectScreen() {
  const { state, clearAll } = useApp();

  function handleClearAll() {
    Alert.alert("Clear all data?", "This will delete all saved itineraries and reset the app.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearAll },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="px-4 pt-4 pb-2 gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-bold text-zinc-100">📍 Where to?</Text>
            <Pressable onPress={handleClearAll} hitSlop={12} className="p-1">
              <Ionicons name="trash-outline" size={18} color="#71717a" />
            </Pressable>
          </View>
          <Text className="text-sm text-zinc-500">
            Start by picking your destination city.
          </Text>
        </View>

        {/* City input — flex-1 when confirmed so card fills available space */}
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 8, gap: 6 }}>
          <Text className="text-sm text-zinc-400">Select a city</Text>
          <CityInput />
        </View>


        {/* Next button */}
        <View className="px-4 pb-8 pt-3">
          <Pressable
            onPress={() => router.push("/(tabs)/plan/places")}
            disabled={!state.city}
            className={`bg-amber-400 rounded-2xl min-h-[52px] items-center justify-center ${
              !state.city ? "opacity-40" : ""
            }`}
          >
            <Text className="text-zinc-900 font-bold text-base">Next</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
