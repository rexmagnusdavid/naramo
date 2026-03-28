import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Place } from "@/lib/types";
import { SuggestionAvatar } from "@/components/planning/SuggestionAvatar";

interface AnchorCardProps {
  place: Place;
  onRemove: () => void;
  onSetTime?: (placeId: string, time: string | undefined) => void;
}

export function AnchorCard({ place, onRemove, onSetTime }: AnchorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const pickerDate = place.hardStopTime
    ? (() => {
        const [h, m] = place.hardStopTime.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
      })()
    : new Date();

  function handleTimeChange(_: unknown, date?: Date) {
    if (Platform.OS === "android") setShowAndroidPicker(false);
    if (!date || !onSetTime) return;
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    onSetTime(place.id, `${hh}:${mm}`);
  }

  function handleClockPress() {
    if (!onSetTime) return;
    if (Platform.OS === "ios") {
      setExpanded((e) => !e);
    } else {
      setShowAndroidPicker(true);
    }
  }

  return (
    <View className="bg-zinc-900 rounded-2xl overflow-hidden">
      {/* Main row */}
      <View className="flex-row items-center gap-3 p-2.5">
        {place.photoUrls[0] ? (
          <Image
            source={{ uri: place.photoUrls[0] }}
            style={{ width: 44, height: 44, borderRadius: 8 }}
            contentFit="cover"
          />
        ) : (
          <SuggestionAvatar name={place.name} />
        )}

        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <Text className="text-zinc-100 font-semibold text-sm flex-shrink" numberOfLines={1}>
              {place.name}
            </Text>
            {place.hardStopTime && (
              <View className="flex-row items-center gap-0.5 bg-amber-400/15 rounded px-1.5 py-0.5">
                <Ionicons name="time-outline" size={10} color="#f59e0b" />
                <Text className="text-amber-400 text-[10px] font-semibold">{place.hardStopTime}</Text>
              </View>
            )}
          </View>
          <Text className="text-zinc-500 text-xs mt-0.5" numberOfLines={1}>
            {place.address}
          </Text>
        </View>

        {onSetTime && (
          <Pressable
            onPress={handleClockPress}
            className="min-h-[36px] min-w-[36px] items-center justify-center"
          >
            <Ionicons
              name="time-outline"
              size={20}
              color={place.hardStopTime ? "#f59e0b" : "#52525b"}
            />
          </Pressable>
        )}

        <Pressable
          onPress={onRemove}
          className="min-h-[36px] min-w-[36px] items-center justify-center"
        >
          <Ionicons name="close" size={18} color="#52525b" />
        </Pressable>
      </View>

      {/* iOS inline time picker */}
      {Platform.OS === "ios" && onSetTime && expanded && (
        <View className="border-t border-zinc-700/50 px-3 pb-3 pt-2">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-zinc-500 text-xs">Be here by</Text>
            {place.hardStopTime && (
              <Pressable
                onPress={() => {
                  onSetTime(place.id, undefined);
                  setExpanded(false);
                }}
              >
                <Text className="text-red-400 text-xs">Clear</Text>
              </Pressable>
            )}
          </View>
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
            textColor="#f4f4f5"
            themeVariant="dark"
          />
        </View>
      )}

      {/* Android modal picker */}
      {Platform.OS === "android" && showAndroidPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}
