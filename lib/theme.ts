export const COLORS = {
  bg: "#09090b",           // zinc-950
  surface: "#18181b",      // zinc-900
  elevated: "#27272a",     // zinc-800
  border: "#3f3f46",       // zinc-700
  muted: "#52525b",        // zinc-600
  subtle: "#71717a",       // zinc-500
  secondary: "#a1a1aa",    // zinc-400
  primary: "#f4f4f5",      // zinc-100
  accent: "#f59e0b",       // amber-400
  accentBorder: "#fbbf24", // amber-300
  like: "#22c55e",
  nope: "#ef4444",
};

export const GRADIENTS = {
  cardOverlay: {
    colors: ["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.92)"] as const,
    locations: [0.4, 0.7, 1] as const,
  },
};

export const RADIUS = {
  sm: 8,    // avatars, small photos
  md: 12,   // inputs, badges
  lg: 16,   // cards, secondary CTAs
  xl: 20,   // modals, main cards
  full: 999, // pills
};

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  elevated: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};
