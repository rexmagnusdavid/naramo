import "../global.css";
import { Slot } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Toaster } from "sonner-native";
import { AppProvider } from "@/context/AppContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Slot />
          <Toaster />
          <StatusBar style="light" />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
