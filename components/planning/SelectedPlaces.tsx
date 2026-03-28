import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "@/context/AppContext";

export function SelectedPlaces() {
  const { state, dispatch } = useApp();
  const { selectedPlaces } = state;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPlaceId, setPickerPlaceId] = useState<string | null>(null);

  if (selectedPlaces.length === 0) return null;

  function openPicker(placeId: string) {
    setPickerPlaceId(placeId);
    setShowPicker(true);
  }

  function onPickerChange(_: unknown, date?: Date) {
    if (Platform.OS === "android") setShowPicker(false);
    if (!date || !pickerPlaceId) return;
    const hh = date.getHours().toString().padStart(2, "0");
    const mm = date.getMinutes().toString().padStart(2, "0");
    dispatch({
      type: "SET_PLACE_HARD_STOP",
      payload: { placeId: pickerPlaceId, time: `${hh}:${mm}` },
    });
  }

  const pickerPlace = selectedPlaces.find((p) => p.id === pickerPlaceId);
  const pickerDate = pickerPlace?.hardStopTime
    ? (() => {
        const [h, m] = pickerPlace.hardStopTime.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
      })()
    : new Date();

  return (
    <View className="gap-2">
      <Text className="text-sm text-zinc-400">
        Your playlist ({selectedPlaces.length})
      </Text>

      {selectedPlaces.map((place, idx) => (
        <View
          key={place.id}
          className="rounded-xl border border-zinc-700 bg-zinc-800/60 overflow-hidden"
        >
          {/* Main row */}
          <View className="flex-row items-center gap-3 px-3 py-2">
            <Text className="text-xs text-zinc-500 w-5">{idx + 1}</Text>
            {place.photoUrls[0] ? (
              <Image
                source={{ uri: place.photoUrls[0] }}
                className="w-10 h-10 rounded-lg"
                contentFit="cover"
              />
            ) : (
              <View className="w-10 h-10 rounded-lg bg-zinc-700" />
            )}
            <View className="flex-1 gap-0.5">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text
                  className="text-sm text-zinc-100"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {place.name}
                </Text>
                {place.hardStopTime && (
                  <View className="bg-amber-400/20 rounded px-1.5 py-0.5 flex-row items-center gap-1">
                    <Ionicons name="time-outline" size={10} color="#f59e0b" />
                    <Text className="text-[10px] text-amber-400 font-medium">
                      {place.hardStopTime}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs text-zinc-500" numberOfLines={1}>
                {place.address}
              </Text>
            </View>

            {/* Clock toggle */}
            <Pressable
              onPress={() => {
                if (Platform.OS === "ios") {
                  setExpandedId(expandedId === place.id ? null : place.id);
                } else {
                  openPicker(place.id);
                }
              }}
              className="min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <Ionicons
                name="time-outline"
                size={20}
                color={place.hardStopTime ? "#f59e0b" : "#52525b"}
              />
            </Pressable>

            {/* Remove */}
            <Pressable
              onPress={() =>
                dispatch({ type: "REMOVE_SELECTED", payload: place.id })
              }
              className="min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#52525b" />
            </Pressable>
          </View>

          {/* iOS inline time picker */}
          {Platform.OS === "ios" && expandedId === place.id && (
            <View className="border-t border-zinc-700/50 px-3 pb-3 pt-2">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-xs text-zinc-500">Be here by</Text>
                {place.hardStopTime && (
                  <Pressable
                    onPress={() => {
                      dispatch({
                        type: "SET_PLACE_HARD_STOP",
                        payload: { placeId: place.id, time: undefined },
                      });
                      setExpandedId(null);
                    }}
                  >
                    <Text className="text-xs text-red-400">Clear</Text>
                  </Pressable>
                )}
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="time"
                display="spinner"
                onChange={(_, date) => {
                  if (!date) return;
                  const hh = date.getHours().toString().padStart(2, "0");
                  const mm = date.getMinutes().toString().padStart(2, "0");
                  dispatch({
                    type: "SET_PLACE_HARD_STOP",
                    payload: { placeId: place.id, time: `${hh}:${mm}` },
                  });
                }}
                textColor="#f4f4f5"
                themeVariant="dark"
              />
            </View>
          )}
        </View>
      ))}

      {/* Android DateTimePicker (modal) */}
      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          display="default"
          onChange={onPickerChange}
        />
      )}
    </View>
  );
}
