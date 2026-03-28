import React from "react";
import { View, Text, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Place } from "@/lib/types";

interface QueuePreviewProps {
  queue: Place[];
}

export function QueuePreview({ queue }: QueuePreviewProps) {
  const upcoming = queue.slice(1);

  if (upcoming.length === 0) {
    return (
      <Text className="text-xs text-zinc-600 text-center py-3">
        No more places in queue.
      </Text>
    );
  }

  return (
    <View>
      <Text className="text-xs text-zinc-500 mb-2">Up next</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3 pb-2">
          {upcoming.map((place, idx) => (
            <View key={place.id} className="w-28 gap-1.5">
              <View className="rounded-xl overflow-hidden h-20 bg-zinc-800 relative">
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
                {place.hardStopTime && (
                  <View className="absolute bottom-1.5 right-1.5 bg-amber-400/90 rounded px-1.5 py-0.5">
                    <View className="flex-row items-center gap-0.5">
                      <Ionicons name="time-outline" size={9} color="#09090b" />
                      <Text className="text-[10px] text-zinc-900 font-bold">
                        {place.hardStopTime}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              <Text className="text-xs text-zinc-400 leading-tight" numberOfLines={2}>
                {place.name}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
