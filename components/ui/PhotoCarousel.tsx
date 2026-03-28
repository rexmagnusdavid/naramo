import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";

interface PhotoCarouselProps {
  photoUrls: string[];
  /** Fixed height in px. Omit to fill parent with flex: 1 (parent must have defined height). */
  height?: number;
  /** Fixed width in px. Omit to fill parent width. */
  width?: number;
}

export function PhotoCarousel({ photoUrls, height, width }: PhotoCarouselProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const containerStyle = {
    ...(height !== undefined ? { height } : { flex: 1 }),
    ...(width !== undefined ? { width } : {}),
  };

  const itemStyle = {
    ...(height !== undefined ? { height } : { flex: 1 }),
    ...(width !== undefined ? { width } : { width: "100%" as const }),
  };

  if (photoUrls.length === 0) {
    return (
      <View style={[containerStyle, { alignItems: "center", justifyContent: "center", backgroundColor: "#27272a" }]}>
        <Text style={{ color: "#52525b", fontSize: 13 }}>No photo</Text>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const w = width ?? e.nativeEvent.layoutMeasurement.width;
          setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / w));
        }}
        style={{ flex: 1 }}
      >
        {photoUrls.map((url, i) => (
          <Image
            key={i}
            source={{ uri: url }}
            style={itemStyle}
            contentFit="cover"
          />
        ))}
      </ScrollView>

      {photoUrls.length > 1 && (
        <View
          style={{
            position: "absolute",
            bottom: 8,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            gap: 4,
          }}
          pointerEvents="none"
        >
          {photoUrls.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === photoIndex ? 8 : 6,
                height: i === photoIndex ? 8 : 6,
                borderRadius: 99,
                backgroundColor: i === photoIndex ? "#fff" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
