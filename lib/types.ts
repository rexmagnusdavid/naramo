export interface Coords {
  lat: number;
  lng: number;
}

export interface Place {
  id: string; // Google place_id
  name: string;
  address: string;
  lat: number;
  lng: number;
  photoUrls: string[]; // direct Google Places media URLs, up to 5 photos
  rating: number;
  isOpen: boolean;
  website?: string;
  instagramUrl: string; // https://instagram.com/explore/tags/{slugified name}
  hardStopTime?: string; // "HH:MM" 24h — optional hard deadline for this place
}

export interface WeatherData {
  description: string; // e.g. "light rain"
  temp: number;
  icon: string;
}

export interface Itinerary {
  id: string;
  name: string;
  city: string;
  createdAt: string; // ISO date string
  places: Place[];         // middle stops only (start/end anchors are separate)
  startPlace: Place | null;
  endPlace: Place | null;
  isDone: boolean;
}

export interface CityPrediction {
  placeId: string;
  description: string;  // "New York, NY, USA"
  mainText: string;     // "New York"
  secondaryText: string; // "NY, USA"
}

export interface AppState {
  phase: "planning" | "travel";
  selectedTags: string[];
  vibeText: string;
  city: string;
  cityImageUrl: string | null;
  cityFlag: string | null;
  cityCountry: string | null;
  cityCoords: Coords | null;
  aiQueries: string[];
  searchPageTokens: string[]; // nextPageToken per query for pagination
  seenPlaceIds: string[]; // serializable Set (deduplicated)
  discoveredPlaces: Place[];
  selectedPlaces: Place[];
  queue: Place[]; // travel-phase queue (index 0 = current)
  weather: WeatherData | null;
  userLocation: Coords | null;
  savedItineraries: Itinerary[];
  activeItineraryId: string | null;
  editingItineraryId: string | null;
  startPlace: Place | null;
  endPlace: Place | null;
  navigationStarted: boolean; // true once the user has pressed Next for the first time
  lastPlace: Place | null;    // the place just departed from — kept for pin + route continuity
  cityTags: string[];         // AI-generated tags for the selected city
  cityTagsLoading: boolean;   // true while generateCityTags is in flight
}

export type AppAction =
  | { type: "SET_PHASE"; payload: AppState["phase"] }
  | { type: "SET_TAGS"; payload: string[] }
  | { type: "SET_VIBE_TEXT"; payload: string }
  | { type: "SET_CITY"; payload: string }
  | { type: "SET_AI_QUERIES"; payload: string[] }
  | { type: "ADD_DISCOVERED"; payload: Place[] }
  | { type: "RESET_DISCOVERY"; payload: { places: Place[]; tokens: string[]; queries: string[]; keepSelected?: boolean } }
  | { type: "SET_PAGE_TOKENS"; payload: string[] }
  | { type: "TOGGLE_SELECT"; payload: Place }
  | { type: "REMOVE_SELECTED"; payload: string }
  | { type: "REORDER_SELECTED"; payload: Place[] }
  | { type: "SET_PLACE_HARD_STOP"; payload: { placeId: string; time: string | undefined } }
  | { type: "START_TRAVEL"; payload: { weather: WeatherData | null; userLocation: Coords | null } }
  | { type: "ADVANCE_QUEUE" }
  | { type: "SKIP_AND_RESORT"; payload: Place[] }
  | { type: "SET_USER_LOCATION"; payload: Coords }
  | { type: "CLEAR_SESSION" }
  | { type: "SAVE_ITINERARY"; payload: { name: string } }
  | { type: "DELETE_ITINERARY"; payload: string }
  | { type: "MARK_ITINERARY_DONE"; payload: string }
  | { type: "START_TRAVEL_FROM_ITINERARY"; payload: { itinerary: Itinerary; weather: WeatherData | null; userLocation: Coords | null } }
  | { type: "RESTORE_ITINERARIES"; payload: { savedItineraries: Itinerary[]; activeItineraryId: string | null } }
  | { type: "BEGIN_EDIT_ITINERARY"; payload: string }
  | { type: "SET_START_PLACE"; payload: Place | null }
  | { type: "SET_END_PLACE"; payload: Place | null }
  | { type: "UPDATE_ITINERARY"; payload: { id: string; name: string; places: Place[]; startPlace: Place | null; endPlace: Place | null } }
  | { type: "SET_CITY_DETAILS"; payload: { city: string; imageUrl: string | null; flag: string | null; country: string | null; coords: Coords | null } }
  | { type: "SET_CITY_TAGS"; payload: string[] };
