import React from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Place } from "@/lib/types";
import { useApp } from "@/context/AppContext";

interface QueuePreviewProps {
  queue: Place[];
}

export function QueuePreview({ queue }: QueuePreviewProps) {
  const { dispatch } = useApp();
  const upcoming = queue.slice(1);

  function handleLongPress(place: Place) {
    Alert.alert(
      place.name,
      "Remove this place from your queue?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: () => dispatch({ type: "REMOVE_FROM_QUEUE", payload: place.id }),
        },
      ]
    );
  }

  if (upcoming.length === 0) {
    return (
      <Text className="text-xs text-zinc-600 text-center py-3">
        No more places in queue.
      </Text>
    );
  }

  return (
    <View>
      <Text className="text-xs text-zinc-500 mb-2">Up next · hold to remove</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3 pb-2">
          {upcoming.map((place, idx) => (
            <Pressable
              key={place.id}
              onLongPress={() => handleLongPress(place)}
              delayLongPress={400}
              className="w-24 gap-1 active:opacity-60"
            >
              <View className="rounded-xl overflow-hidden h-14 bg-zinc-800 relative">
                {place.photoUrls[0] ? (
                  <Image
                    source={{ uri: place.photoUrls[0] }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 bg-zinc-800" />
                )}
                <View className="absolute top-1.5 left-1.5 bg-zinc-900/80 rounded px-1.5 py-0.5">
                  <Text className="text-[10px] text-zinc-300 font-medium">
                    #{idx + 1}
                  </Text>
                </View>
                {(place.isOpen === false || place.hardStopTime) && (
                  <View className="absolute bottom-1.5 left-1.5 gap-1">
                    {place.isOpen === false && (
                      <View className="bg-red-500/90 rounded px-1.5 py-0.5 self-start">
                        <Text className="text-[10px] text-white font-bold">Closed</Text>
                      </View>
                    )}
                    {place.hardStopTime && (
                      <View className="bg-amber-400/90 rounded px-1.5 py-0.5 self-start">
                        <View className="flex-row items-center gap-0.5">
                          <Ionicons name="time-outline" size={9} color="#09090b" />
                          <Text className="text-[10px] text-zinc-900 font-bold">
                            {place.hardStopTime}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <Text className="text-xs text-zinc-400 leading-tight" numberOfLines={2}>
                {place.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
