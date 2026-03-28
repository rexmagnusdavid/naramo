import React from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { VIBE_TAGS } from "@/lib/tags";
import { useApp } from "@/context/AppContext";

export function VibeInput() {
  const { state, dispatch } = useApp();

  function toggleTag(tag: string) {
    const current = state.selectedTags;
    dispatch({
      type: "SET_TAGS",
      payload: current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    });
  }

  const tags = state.cityTags.length > 0 ? state.cityTags : (!state.cityTagsLoading ? VIBE_TAGS : []);

  return (
    <View className="gap-5">
      {/* Vibe tags */}
      <View className="gap-2">
        <Text className="text-sm text-zinc-400">Pick your vibes</Text>
        {state.cityTagsLoading ? (
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={{
                  height: 40,
                  width: 60 + (i % 3) * 20,
                  borderRadius: 999,
                  backgroundColor: "#27272a",
                  opacity: 0.6,
                }}
              />
            ))}
            <View className="w-full flex-row items-center gap-2 pt-1">
              <ActivityIndicator size="small" color="#52525b" />
              <Text className="text-xs text-zinc-600">Tailoring tags for {state.city}…</Text>
            </View>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {tags.map((tag) => {
              const active = state.selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  className={`min-h-[40px] px-4 rounded-full border items-center justify-center ${
                    active
                      ? "bg-amber-400 border-amber-400"
                      : "bg-transparent border-zinc-600"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      active ? "text-zinc-900" : "text-zinc-300"
                    }`}
                  >
                    {tag}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Vibe textarea */}
      <View className="gap-1.5">
        <Text className="text-sm text-zinc-400">Describe your vibe (optional)</Text>
        <TextInput
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 text-sm"
          placeholder="e.g. cozy rainy afternoon with jazz and good coffee..."
          placeholderTextColor="#71717a"
          value={state.vibeText}
          onChangeText={(t) => dispatch({ type: "SET_VIBE_TEXT", payload: t })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 80 }}
        />
      </View>
    </View>
  );
}
