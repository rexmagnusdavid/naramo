import { useApp } from "@/context/AppContext";
import { getCurrentPosition } from "@/lib/geo";
import { getWeather } from "@/lib/api";
import { Coords, WeatherData } from "@/lib/types";

export function useTravelSetup() {
  const { state, dispatch } = useApp();

  async function setup(cityCoords?: Coords | null): Promise<{
    coords: Coords | null;
    weather: WeatherData | null;
  }> {
    // GPS for travel-origin routing
    let coords = state.userLocation;
    if (!coords) {
      try {
        coords = await getCurrentPosition();
        dispatch({ type: "SET_USER_LOCATION", payload: coords });
      } catch { /* ok — optional */ }
    }

    // Weather must come from the city, never the user's current location.
    // Always fetch fresh weather at trip start — do not reuse cached state.weather
    // which may be from a different city.
    const weatherCoords = cityCoords ?? null;
    let weather: WeatherData | null = null;
    if (weatherCoords) {
      try {
        weather = await getWeather(weatherCoords.lat, weatherCoords.lng);
      } catch { /* non-critical */ }
    }

    return { coords, weather };
  }

  return { setup };
}
