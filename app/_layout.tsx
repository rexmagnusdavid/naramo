import "../global.css";
import { Slot } from "expo-router";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Toaster } from "sonner-native";
import { AppProvider } from "@/context/AppContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Image, Text } from "react-native";

function TopBar() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: "#09090b",
        borderBottomWidth: 1,
        borderBottomColor: "#27272a",
        paddingHorizontal: 16,
        paddingBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <Image
        source={require("../assets/icon.png")}
        style={{ width: 36, height: 36, borderRadius: 8 }}
        resizeMode="contain"
      />
      <Text style={{ color: "#f4f4f5", fontSize: 22, fontWeight: "700" }}>
        Naramo
      </Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <View style={{ flex: 1 }}>
            <TopBar />
            <Slot />
          </View>
          <Toaster />
          <StatusBar style="light" />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
