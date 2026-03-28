import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#09090b", borderTopColor: "#27272a" },
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#71717a",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="plan"
        options={{
          title: "Plan",
          tabBarIcon: ({ color }) => (
            <Ionicons name="list-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="travel"
        options={{
          title: "Travel",
          tabBarIcon: ({ color }) => (
            <Ionicons name="navigate-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
