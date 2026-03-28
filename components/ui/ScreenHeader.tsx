import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, onBack, right }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <Pressable
        onPress={onBack ?? (() => router.back())}
        className="min-h-[44px] min-w-[44px] items-center justify-center"
      >
        <Ionicons name="chevron-back" size={24} color="#a1a1aa" />
      </Pressable>

      <View className="items-center flex-1">
        <Text className="text-zinc-100 font-bold text-base">{title}</Text>
        {subtitle ? (
          <Text className="text-zinc-600 text-xs mt-0.5">{subtitle}</Text>
        ) : null}
      </View>

      <View className="min-w-[44px] items-end">
        {right ?? null}
      </View>
    </View>
  );
}
