import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  useWindowDimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { Place } from "@/lib/types";

interface Props {
  places: Place[];
  currentPlace: Place | null;
  visible: boolean;
  onClose: () => void;
}

export function DiscoveryMapDrawer({ places, currentPlace, visible, onClose }: Props) {
  const { height } = useWindowDimensions();
  const drawerHeight = height * 0.7;
  const translateY = useRef(new Animated.Value(drawerHeight)).current;
  const mapRef = useRef<MapView>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: drawerHeight,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [visible, drawerHeight]);

  useEffect(() => {
    if (!visible || places.length === 0) return;
    // Fit map to show all markers after drawer settles
    const timer = setTimeout(() => {
      const coords = places.map((p) => ({ latitude: p.lat, longitude: p.lng }));
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
        animated: true,
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [visible, places]);

  if (!mounted) return null;

  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
        onPress={onClose}
      />

      {/* Drawer */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: drawerHeight,
          backgroundColor: "#18181b",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: "hidden",
          transform: [{ translateY }],
        }}
      >
        {/* Handle + header */}
        <View
          style={{
            paddingTop: 12,
            paddingBottom: 8,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#f4f4f5", fontWeight: "700", fontSize: 15 }}>
              Discovered Places
            </Text>
            {currentPlace && (
              <Text style={{ color: "#f59e0b", fontSize: 12, marginTop: 2 }}>
                {currentPlace.name}
              </Text>
            )}
          </View>
          <Pressable
            onPress={onClose}
            style={{
              width: 36,
              height: 36,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#71717a" />
          </Pressable>
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType="standard"
          initialRegion={
            currentPlace
              ? {
                  latitude: currentPlace.lat,
                  longitude: currentPlace.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : undefined
          }
        >
          {places.map((place, index) => {
            const isCurrent = currentPlace?.id === place.id;
            return (
              <Marker
                key={`${place.id}-${index}`}
                coordinate={{ latitude: place.lat, longitude: place.lng }}
                title={isCurrent ? place.name : undefined}
              >
                <View
                  style={{
                    width: isCurrent ? 14 : 10,
                    height: isCurrent ? 14 : 10,
                    borderRadius: isCurrent ? 7 : 5,
                    backgroundColor: isCurrent ? "#f59e0b" : "#71717a",
                    borderWidth: isCurrent ? 2 : 1,
                    borderColor: isCurrent ? "#fcd34d" : "#3f3f46",
                  }}
                />
              </Marker>
            );
          })}
        </MapView>
      </Animated.View>
    </View>
  );
}
