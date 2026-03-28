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

    // Weather anchored to the city, not the user's current location
    const weatherCoords = cityCoords ?? coords;
    let weather: WeatherData | null = state.weather ?? null;
    if (weatherCoords && !weather) {
      try {
        weather = await getWeather(weatherCoords.lat, weatherCoords.lng);
      } catch { /* non-critical */ }
    }

    return { coords, weather };
  }

  return { setup };
}
