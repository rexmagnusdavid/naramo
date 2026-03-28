import React, { useRef, useCallback, useEffect, useState } from "react";
import { View, Text, Platform } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { Place, Coords } from "@/lib/types";
import { getWalkingRoute } from "@/lib/api";
import { SHADOW } from "@/lib/theme";

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

interface TripMapProps {
  places: Place[];
  height: number;
  navigationStarted: boolean;
  lastPlace?: Place | null;
  userLocation?: Coords | null;
}

function getBoundsRegion(places: Place[]) {
  const lats = places.map((p) => p.lat);
  const lngs = places.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const paddingFactor = 1.4;
  const latDelta = Math.max((maxLat - minLat) * paddingFactor, 0.01);
  const lngDelta = Math.max((maxLng - minLng) * paddingFactor, 0.01);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function TripMap({ places, height, navigationStarted, lastPlace, userLocation }: TripMapProps) {
  const mapRef = useRef<MapView>(null);

  // Active route: GPS position → places[0] (fetched when navigation starts or destination changes)
  const [activeRoute, setActiveRoute] = useState<Coords[]>([]);
  // Other routes: places[0]→[1], [1]→[2], … shown as gray dashed overview
  const [otherRoutes, setOtherRoutes] = useState<Coords[][]>([]);

  // Snapshot userLocation in a ref so the route effect can read it without
  // re-running every time the GPS ticks.
  const userLocationRef = useRef(userLocation);
  useEffect(() => { userLocationRef.current = userLocation; }, [userLocation]);

  // Recalculate when the destination changes (places[0] id) or navigation toggles.
  // userLocation is intentionally excluded from deps — we snapshot it at the moment
  // navigation starts so the route doesn't redraw continuously while walking.
  useEffect(() => {
    // Stop-to-stop overview routes (always computed)
    const pairs = places.slice(0, -1).map((p, i) => ({
      from: { lat: p.lat, lng: p.lng },
      to: { lat: places[i + 1].lat, lng: places[i + 1].lng },
    }));
    const fetchOthers = pairs.length > 0
      ? Promise.all(pairs.map(({ from, to }) => getWalkingRoute(from, to)))
      : Promise.resolve<Coords[][]>([]);

    // Active route: GPS → next stop
    const origin = userLocationRef.current;
    const fetchActive =
      navigationStarted && origin && places.length > 0
        ? getWalkingRoute(origin, { lat: places[0].lat, lng: places[0].lng })
        : Promise.resolve<Coords[]>([]);

    Promise.all([fetchOthers, fetchActive]).then(([others, active]) => {
      setOtherRoutes(others);
      setActiveRoute(active);
    });
  }, [places.map((p) => p.id).join(","), navigationStarted]);

  const handleMapReady = useCallback(() => {
    if (places.length < 2) return;
    mapRef.current?.fitToCoordinates(
      places.map((p) => ({ latitude: p.lat, longitude: p.lng })),
      { edgePadding: { top: 48, right: 32, bottom: 48, left: 32 }, animated: false }
    );
  }, [places]);

  if (places.length === 0) return null;

  return (
    <MapView
      ref={mapRef}
      style={{ width: "100%", height }}
      provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
      customMapStyle={DARK_MAP_STYLE}
      initialRegion={getBoundsRegion(places)}
      onMapReady={handleMapReady}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {/* Active route: GPS → next stop (amber solid) */}
      {navigationStarted && activeRoute.length > 0 && (
        <Polyline
          key="route-active"
          coordinates={activeRoute.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
          strokeColor="#f59e0b"
          strokeWidth={3}
        />
      )}

      {/* Overview routes: stop-to-stop (white dashed) */}
      {otherRoutes.map((coords, i) => (
        <Polyline
          key={`route-${i}`}
          coordinates={coords.map((c) => ({ latitude: c.lat, longitude: c.lng }))}
          strokeColor="rgba(255,255,255,0.6)"
          strokeWidth={2.5}
          lineDashPattern={[10, 6]}
        />
      ))}

      {/* Visited place pin (lastPlace) — faded dot, no number */}
      {lastPlace && (
        <Marker
          key={`last-${lastPlace.id}`}
          coordinate={{ latitude: lastPlace.lat, longitude: lastPlace.lng }}
          title={lastPlace.name}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#3f3f46",
              borderWidth: 1.5,
              borderColor: "#52525b",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.6,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#71717a" }} />
          </View>
        </Marker>
      )}

      {/* Place markers */}
      {places.map((place, index) => {
        const isCurrent = index === 0;
        const size = isCurrent ? 32 : 22;
        const bg = isCurrent ? "#f59e0b" : "#ffffff";
        const border = isCurrent ? "#fbbf24" : "#e4e4e7";
        const textColor = isCurrent ? "#09090b" : "#18181b";
        return (
          <Marker
            key={`${place.id}-${index}`}
            coordinate={{ latitude: place.lat, longitude: place.lng }}
            title={place.name}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: bg,
                borderWidth: isCurrent ? 2 : 1.5,
                borderColor: border,
                alignItems: "center",
                justifyContent: "center",
                ...SHADOW.card,
              }}
            >
              <Text
                style={{
                  color: textColor,
                  fontSize: isCurrent ? 13 : 11,
                  fontWeight: "700",
                  lineHeight: isCurrent ? 16 : 13,
                }}
              >
                {index + 1}
              </Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}
