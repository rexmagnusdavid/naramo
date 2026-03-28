import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, AppAction, Place, Itinerary } from "@/lib/types";
import { haversineDistance } from "@/lib/geo";

const STORAGE_KEY = "naramo-state";

const initialState: AppState = {
  phase: "planning",
  selectedTags: [],
  vibeText: "",
  city: "",
  cityImageUrl: null,
  cityFlag: null,
  cityCountry: null,
  cityCoords: null,
  aiQueries: [],
  searchPageTokens: [],
  seenPlaceIds: [],
  discoveredPlaces: [],
  selectedPlaces: [],
  queue: [],
  weather: null,
  userLocation: null,
  savedItineraries: [],
  activeItineraryId: null,
  editingItineraryId: null,
  startPlace: null,
  endPlace: null,
  navigationStarted: false,
  lastPlace: null,
  cityTags: [],
  cityTagsLoading: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_PHASE":
      return { ...state, phase: action.payload };

    case "SET_TAGS":
      return { ...state, selectedTags: action.payload };

    case "SET_VIBE_TEXT":
      return { ...state, vibeText: action.payload };

    case "SET_CITY":
      return { ...state, city: action.payload };

    case "SET_AI_QUERIES":
      return { ...state, aiQueries: action.payload };

    case "ADD_DISCOVERED": {
      // All places the user intentionally chose — must never appear in the deck.
      const manualPlaces: Place[] = [
        ...state.selectedPlaces,
        ...(state.startPlace ? [state.startPlace] : []),
        ...(state.endPlace ? [state.endPlace] : []),
      ];
      const manualIds = new Set(manualPlaces.map((p) => p.id));

      const existingIds = new Set([
        ...state.seenPlaceIds,
        ...state.discoveredPlaces.map((p) => p.id),
      ]);

      // Proximity check runs against both already-discovered places AND manual places.
      const proximityBaseline = [...state.discoveredPlaces, ...manualPlaces];

      const newPlaces = action.payload
        .filter((p) => !existingIds.has(p.id) && !manualIds.has(p.id))
        .filter(
          (p) =>
            !proximityBaseline.some(
              (existing) =>
                haversineDistance(
                  { lat: p.lat, lng: p.lng },
                  { lat: existing.lat, lng: existing.lng }
                ) < 150
            )
        );
      return {
        ...state,
        discoveredPlaces: [...state.discoveredPlaces, ...newPlaces],
        seenPlaceIds: [...state.seenPlaceIds, ...newPlaces.map((p) => p.id)],
      };
    }

    case "RESET_DISCOVERY": {
      // All places the user intentionally chose — must never appear in the deck.
      const manualPlaces: Place[] = [
        ...(action.payload.keepSelected ? state.selectedPlaces : []),
        ...(state.startPlace ? [state.startPlace] : []),
        ...(state.endPlace ? [state.endPlace] : []),
      ];
      const manualIds = new Set(manualPlaces.map((p) => p.id));

      const filtered = action.payload.places.filter(
        (p: Place) =>
          !state.seenPlaceIds.includes(p.id) &&
          !manualIds.has(p.id) &&
          !manualPlaces.some(
            (manual) =>
              haversineDistance(
                { lat: p.lat, lng: p.lng },
                { lat: manual.lat, lng: manual.lng }
              ) < 150
          )
      );
      return {
        ...state,
        aiQueries: action.payload.queries,
        discoveredPlaces: filtered,
        seenPlaceIds: [...state.seenPlaceIds, ...filtered.map((p: Place) => p.id)],
        searchPageTokens: action.payload.tokens,
        selectedPlaces: action.payload.keepSelected ? state.selectedPlaces : [],
      };
    }

    case "SET_PAGE_TOKENS":
      return { ...state, searchPageTokens: action.payload };

    case "TOGGLE_SELECT": {
      const exists = state.selectedPlaces.some((p) => p.id === action.payload.id);
      return {
        ...state,
        selectedPlaces: exists
          ? state.selectedPlaces.filter((p) => p.id !== action.payload.id)
          : [...state.selectedPlaces, action.payload],
      };
    }

    case "REMOVE_SELECTED":
      return {
        ...state,
        selectedPlaces: state.selectedPlaces.filter((p) => p.id !== action.payload),
      };

    case "REORDER_SELECTED":
      return { ...state, selectedPlaces: action.payload };

    case "SET_PLACE_HARD_STOP": {
      const update = (places: Place[]) =>
        places.map((p) =>
          p.id === action.payload.placeId
            ? { ...p, hardStopTime: action.payload.time }
            : p
        );
      const updateOne = (p: Place | null) =>
        p && p.id === action.payload.placeId
          ? { ...p, hardStopTime: action.payload.time }
          : p;
      return {
        ...state,
        selectedPlaces: update(state.selectedPlaces),
        queue: update(state.queue),
        startPlace: updateOne(state.startPlace),
        endPlace: updateOne(state.endPlace),
      };
    }

    case "START_TRAVEL":
      return {
        ...state,
        phase: "travel",
        queue: [...state.selectedPlaces],
        weather: action.payload.weather,
        userLocation: action.payload.userLocation,
        navigationStarted: false,
        lastPlace: null,
      };

    case "ADVANCE_QUEUE":
      return { ...state, queue: state.queue.slice(1), navigationStarted: true, lastPlace: state.queue[0] ?? null };

    case "SKIP_AND_RESORT":
      return { ...state, queue: action.payload, navigationStarted: true, lastPlace: state.queue[0] ?? null };

    case "SET_USER_LOCATION":
      return { ...state, userLocation: action.payload };

    case "SET_START_PLACE":
      return { ...state, startPlace: action.payload };

    case "SET_END_PLACE":
      return { ...state, endPlace: action.payload };

    case "CLEAR_SESSION":
      return { ...initialState, savedItineraries: state.savedItineraries };

    case "SAVE_ITINERARY": {
      const itinerary: Itinerary = {
        id: Date.now().toString(),
        name: action.payload.name,
        city: state.city,
        createdAt: new Date().toISOString(),
        places: [...state.selectedPlaces],
        startPlace: state.startPlace,
        endPlace: state.endPlace,
        isDone: false,
      };
      return {
        ...initialState,
        savedItineraries: [...state.savedItineraries, itinerary],
        userLocation: state.userLocation,
        weather: state.weather,
      };
    }

    case "DELETE_ITINERARY":
      return {
        ...state,
        savedItineraries: state.savedItineraries.filter((i) => i.id !== action.payload),
        activeItineraryId:
          state.activeItineraryId === action.payload ? null : state.activeItineraryId,
      };

    case "MARK_ITINERARY_DONE":
      return {
        ...state,
        savedItineraries: state.savedItineraries.map((i) =>
          i.id === action.payload ? { ...i, isDone: true } : i
        ),
        phase: "planning",
        queue: [],
        activeItineraryId: null,
      };

    case "START_TRAVEL_FROM_ITINERARY": {
      const { itinerary } = action.payload;
      const fullQueue = [
        ...(itinerary.startPlace ? [itinerary.startPlace] : []),
        ...itinerary.places,
        ...(itinerary.endPlace ? [itinerary.endPlace] : []),
      ];
      return {
        ...state,
        phase: "travel",
        queue: fullQueue,
        weather: action.payload.weather,
        userLocation: action.payload.userLocation,
        activeItineraryId: itinerary.id,
        navigationStarted: false,
        lastPlace: null,
      };
    }

    case "RESTORE_ITINERARIES":
      return {
        ...state,
        savedItineraries: action.payload.savedItineraries,
        activeItineraryId: action.payload.activeItineraryId,
      };

    case "BEGIN_EDIT_ITINERARY": {
      const itinerary = state.savedItineraries.find((i) => i.id === action.payload);
      if (!itinerary) return state;
      return {
        ...state,
        city: itinerary.city,
        selectedPlaces: [...itinerary.places],
        startPlace: itinerary.startPlace ?? null,
        endPlace: itinerary.endPlace ?? null,
        editingItineraryId: action.payload,
        cityTags: [],
        cityTagsLoading: true,
      };
    }

    case "SET_CITY_TAGS":
      return { ...state, cityTags: action.payload, cityTagsLoading: false };

    case "SET_CITY_DETAILS": {
      const cityChanged = action.payload.city !== "" && action.payload.city !== state.city;
      return {
        ...state,
        city: action.payload.city,
        cityImageUrl: action.payload.imageUrl,
        cityFlag: action.payload.flag,
        cityCountry: action.payload.country,
        cityCoords: action.payload.coords,
        ...(cityChanged && {
          selectedPlaces: [],
          startPlace: null,
          endPlace: null,
          cityTags: [],
          cityTagsLoading: true,
        }),
      };
    }

    case "UPDATE_ITINERARY":
      return {
        ...state,
        savedItineraries: state.savedItineraries.map((i) =>
          i.id === action.payload.id
            ? {
                ...i,
                name: action.payload.name,
                places: action.payload.places,
                startPlace: action.payload.startPlace,
                endPlace: action.payload.endPlace,
              }
            : i
        ),
        selectedPlaces: [],
        startPlace: null,
        endPlace: null,
        editingItineraryId: null,
      };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  clearSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as AppState;
          // Replay saved state by merging into initialState
          dispatch({ type: "SET_PHASE", payload: saved.phase });
          if (saved.selectedTags.length)
            dispatch({ type: "SET_TAGS", payload: saved.selectedTags });
          if (saved.vibeText)
            dispatch({ type: "SET_VIBE_TEXT", payload: saved.vibeText });
          if (saved.city)
            dispatch({
              type: "SET_CITY_DETAILS",
              payload: {
                city: saved.city,
                imageUrl: saved.cityImageUrl ?? null,
                flag: saved.cityFlag ?? null,
                country: saved.cityCountry ?? null,
                coords: saved.cityCoords ?? null,
              },
            });
          if (saved.selectedPlaces.length)
            dispatch({ type: "REORDER_SELECTED", payload: saved.selectedPlaces });
          if (saved.startPlace)
            dispatch({ type: "SET_START_PLACE", payload: saved.startPlace });
          if (saved.endPlace)
            dispatch({ type: "SET_END_PLACE", payload: saved.endPlace });
          if (saved.discoveredPlaces.length) {
            dispatch({
              type: "RESET_DISCOVERY",
              payload: {
                places: saved.discoveredPlaces,
                tokens: saved.searchPageTokens,
                queries: saved.aiQueries,
              },
            });
            // Re-add selectedPlaces since RESET_DISCOVERY clears them
            if (saved.selectedPlaces.length)
              dispatch({ type: "REORDER_SELECTED", payload: saved.selectedPlaces });
          }
          if (saved.queue.length && saved.phase === "travel")
            dispatch({ type: "SKIP_AND_RESORT", payload: saved.queue });
          if (saved.weather)
            dispatch({
              type: "START_TRAVEL",
              payload: { weather: saved.weather, userLocation: saved.userLocation },
            });
          if (saved.savedItineraries?.length || saved.activeItineraryId)
            dispatch({
              type: "RESTORE_ITINERARIES",
              payload: {
                savedItineraries: saved.savedItineraries ?? [],
                activeItineraryId: saved.activeItineraryId ?? null,
              },
            });
        } catch {
          // Corrupted storage — start fresh
        }
      }
      setHydrated(true);
    });
  }, []);

  // Persist on every state change
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, hydrated]);

  const clearSession = useCallback(() => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    dispatch({ type: "CLEAR_SESSION" });
  }, []);

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{ state, dispatch, clearSession }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
