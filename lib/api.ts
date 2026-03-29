import OpenAI from "openai";
import { Place, Coords, WeatherData, CityPrediction } from "./types";
import { buildInstagramUrl, decodePolyline, haversineDistance } from "./geo";

const GMAPS = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY!;
const OWM = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY!;
const FEATHERLESS = process.env.EXPO_PUBLIC_FEATHERLESS_API_KEY!;

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACE_FIELDS = "id,displayName,formattedAddress,location,photos,rating,currentOpeningHours,websiteUri";
const FIELDS = PLACE_FIELDS.split(",").map((f) => `places.${f}`).join(",");

const openai = new OpenAI({
  apiKey: FEATHERLESS,
  baseURL: "https://api.featherless.ai/v1",
  dangerouslyAllowBrowser: true,
});

/**
 * Removes near-duplicate places that are within `thresholdMeters` of each other.
 * Sorts by rating descending first so the higher-quality entry always survives.
 */
function deduplicateByProximity(places: Place[], thresholdMeters = 150): Place[] {
  const sorted = [...places].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const kept: Place[] = [];
  for (const candidate of sorted) {
    const tooClose = kept.some(
      (p) =>
        haversineDistance(
          { lat: candidate.lat, lng: candidate.lng },
          { lat: p.lat, lng: p.lng }
        ) < thresholdMeters
    );
    if (!tooClose) kept.push(candidate);
  }
  return kept;
}

function photoUrl(ref: string): string {
  return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=800&key=${GMAPS}&skipHttpRedirect=false`;
}

async function searchQuery(
  query: string,
  pageToken?: string,
  coords?: { lat: number; lng: number }
): Promise<{ places: Place[]; nextPageToken?: string }> {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 15,
    languageCode: "en",
  };
  if (pageToken) body.pageToken = pageToken;
  if (coords) {
    body.locationBias = {
      circle: {
        center: { latitude: coords.lat, longitude: coords.lng },
        radius: 20000,
      },
    };
  }

  console.log("[searchQuery] sending to Google Maps:", query);
  try {
    const res = await fetch(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GMAPS,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("[searchQuery] Google Maps error:", res.status, await res.text().catch(() => ""));
      return { places: [] };
    }

    const data = await res.json();
    const rawPlaces = data.places ?? [];
    console.log(`[searchQuery] "${query}" → ${rawPlaces.length} results`);
    const nextPageToken = data.nextPageToken;

    const places: Place[] = rawPlaces
      .filter((p: Record<string, unknown>) => {
        const hours = p.currentOpeningHours as { openNow?: boolean } | undefined;
        return hours ? hours.openNow !== false : true;
      })
      .map((p: Record<string, unknown>) => {
        const photos = (p.photos as Array<{ name: string }> | undefined) ?? [];
        const photoUrls = photos.slice(0, 5).map((ph) => photoUrl(ph.name));
        const location = p.location as { latitude: number; longitude: number };
        const displayName = p.displayName as { text: string };

        return {
          id: p.id as string,
          name: displayName?.text ?? "Unknown",
          address: (p.formattedAddress as string) ?? "",
          lat: location?.latitude ?? 0,
          lng: location?.longitude ?? 0,
          photoUrls,
          rating: (p.rating as number) ?? 0,
          isOpen: true,
          website: p.websiteUri as string | undefined,
          instagramUrl: buildInstagramUrl(displayName?.text ?? ""),
        };
      });

    return { places, nextPageToken };
  } catch {
    return { places: [] };
  }
}

export async function searchPlaces(
  queries: string[],
  pageTokens: string[],
  city?: string,
  manual?: boolean,
  coords?: { lat: number; lng: number }
): Promise<{ places: Place[]; nextPageTokens: string[] }> {
  if (manual) {
    const result = await searchQuery(queries[0], undefined, coords);
    return { places: result.places, nextPageTokens: [] };
  }

  // Use coordinates for geographic pinning when available; fall back to city name in query text
  const cityContext = (!coords && city) ? ` in ${city}` : "";

  const results = await Promise.all(
    queries.map((q, i) =>
      searchQuery(q + cityContext, pageTokens[i] || undefined, coords)
    )
  );

  return {
    places: results.flatMap((r) => r.places),
    nextPageTokens: results.map((r) => r.nextPageToken ?? ""),
  };
}

export async function generateCityTags(city: string, country: string | null): Promise<string[]> {
  try {
    const location = [city, country].filter(Boolean).join(", ");
    const prompt = `Think about the most famous attractions, foods, and experiences that ${location} is known for. Categorize each into a generic place or activity type. IMPORTANT: output only the category name, never the name of a specific place, building, or attraction. Categories must be generic enough to apply to many places (e.g. "Museums", "Landmarks", "Breweries", "Street Food", "Live Music", "Rooftop Bars", "Parks", "Theatre"). Return exactly 8 unique category tags as a JSON array of strings. No explanation, no specific place names. Respond in English only.`;
    const completion = await openai.chat.completions.create({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 120,
    });
    const content = completion.choices[0]?.message?.content ?? "[]";
    const stripped = content.replace(/```[a-z]*\n?/g, "").trim();
    const matches = stripped.match(/\[[^\[\]]*\]/g) ?? [];
    const tags: string[] = matches.flatMap((m) => {
      try { return JSON.parse(m) as string[]; } catch { return []; }
    });
    return tags.slice(0, 8);
  } catch {
    return [];
  }
}

export async function aiTranslate(
  tags: string[],
  vibeText: string,
  weather: string,
  city?: string,
  previousQueries?: string[]
): Promise<string[]> {
  try {
    const tagContext = tags.length > 0 ? `\nUser interests: ${tags.join(", ")}.` : "";
    const avoidContext = previousQueries?.length
      ? `\nDo NOT repeat or rephrase any of these already-used queries: ${previousQueries.join(", ")}. Find completely different place types.`
      : "";
    const userPrompt = `Current weather: ${weather}.
The user is looking for: "${vibeText}"${tagContext}${avoidContext}
Return a JSON array of exactly 3 search queries.`;

    const systemPrompt = `You translate travel vibes into generic Google Maps search queries.
RULES — violating any rule is wrong:
1. Each query must be a CATEGORY or TYPE of place (e.g. "historic monuments", "observation decks", "scenic viewpoints"). NEVER name a specific place (e.g. NOT "central park", NOT "eiffel tower", NOT "statue of liberty").
2. Do NOT include any city or country name in any query.
3. Each query must be 2–5 words.
4. Return ONLY a JSON array of 3 strings. No explanation, no markdown.`;

    console.log("[aiTranslate] prompt:", userPrompt);
    const completion = await openai.chat.completions.create({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    const content = completion.choices[0]?.message?.content ?? "[]";
    console.log("[aiTranslate] raw response:", content);
    const stripped = content.replace(/```[a-z]*\n?/g, "").trim();
    // Model sometimes outputs separate arrays per query — match each bracket group individually
    const matches = stripped.match(/\[[^\[\]]*\]/g) ?? [];
    const queries: string[] = matches.flatMap((m) => {
      try { return JSON.parse(m) as string[]; } catch { return []; }
    });
    console.log("[aiTranslate] parsed queries:", queries);
    return queries.slice(0, 3);
  } catch (err) {
    console.error("[aiTranslate] failed:", err);
    return [];
  }
}


export async function sortByDistance(
  origin: Coords,
  places: Place[]
): Promise<{ sorted: Place[]; durations: number[] }> {
  if (!places.length) return { sorted: [], durations: [] };

  try {
    const destinations = places.map((p) => `${p.lat},${p.lng}`).join("|");
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destinations}&mode=walking&key=${GMAPS}`;

    const res = await fetch(url);
    const data = await res.json();
    const rows = data.rows?.[0]?.elements ?? [];

    const withDist = places.map((place, i) => {
      const el = rows[i];
      const duration = el?.status === "OK" ? el.duration.value : Infinity;
      return { place, duration };
    });

    withDist.sort((a, b) => a.duration - b.duration);
    return {
      sorted: withDist.map((x) => x.place),
      durations: withDist.map((x) => x.duration * 1000),
    };
  } catch {
    return { sorted: places, durations: places.map(() => 0) };
  }
}

export async function getWeather(lat: number, lng: number): Promise<WeatherData> {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather API failed");
    const data = await res.json();
    return {
      description: data.weather?.[0]?.description ?? "clear",
      temp: Math.round(data.main?.temp ?? 20),
      icon: data.weather?.[0]?.icon ?? "01d",
    };
  } catch {
    return { description: "clear", temp: 20, icon: "01d" };
  }
}

/**
 * Fetches a walking route between two points using the Directions API.
 * Returns decoded lat/lng coordinates for the polyline, or a straight line on failure.
 */
export async function getWalkingRoute(from: Coords, to: Coords): Promise<Coords[]> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${from.lat},${from.lng}` +
      `&destination=${to.lat},${to.lng}` +
      `&mode=walking` +
      `&key=${GMAPS}`;
    const res = await fetch(url);
    const data = await res.json();
    const encoded: string | undefined =
      data.routes?.[0]?.overview_polyline?.points;
    if (!encoded) return [from, to];
    return decodePolyline(encoded);
  } catch {
    return [from, to]; // straight-line fallback
  }
}

export async function autocompleteCity(input: string): Promise<CityPrediction[]> {
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GMAPS,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ["locality", "administrative_area_level_2"],
        languageCode: "en",
      }),
    });
    const data = await res.json();
    return (data.suggestions ?? []).map((s: any) => ({
      placeId: s.placePrediction?.placeId ?? "",
      description: s.placePrediction?.text?.text ?? "",
      mainText: s.placePrediction?.structuredFormat?.mainText?.text ?? "",
      secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
    })).filter((p: CityPrediction) => p.placeId);
  } catch {
    return [];
  }
}

export async function getCityDetails(
  placeId: string,
  portrait = false
): Promise<{ imageUrl: string | null; flag: string | null; country: string | null; coords: Coords | null }> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": GMAPS,
        "X-Goog-FieldMask": "photos,addressComponents,location",
      },
    });
    const data = await res.json();

    // Country flag from address components
    const countryComp = (data.addressComponents ?? []).find((c: any) =>
      c.types?.includes("country")
    );
    const countryCode: string | null = countryComp?.shortText ?? null;
    const countryName: string | null = countryComp?.longText ?? null;
    const flag = countryCode
      ? countryCode.toUpperCase().split("").map((c: string) =>
          String.fromCodePoint(c.charCodeAt(0) + 127397)
        ).join("")
      : null;

    // City photo
    const photoName: string | undefined = data.photos?.[0]?.name;
    const imageUrl = photoName
      ? portrait
        ? `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=1600&key=${GMAPS}`
        : `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${GMAPS}`
      : null;

    // City coords
    const coords: Coords | null = data.location
      ? { lat: data.location.latitude, lng: data.location.longitude }
      : null;

    return { imageUrl, flag, country: countryName, coords };
  } catch {
    return { imageUrl: null, flag: null, country: null, coords: null };
  }
}

export async function autocompletePlaceInCity(
  input: string,
  cityName: string,
  cityCoords?: Coords | null
): Promise<CityPrediction[]> {
  try {
    // Always append the city name to the query so results are contextually anchored
    // even when locationRestriction is not available.
    const contextualInput = `${input} ${cityName}`;
    const body: Record<string, unknown> = { input: contextualInput, languageCode: "en" };
    if (cityCoords) {
      // locationRestriction is a hard limit — results outside are excluded entirely.
      // Max allowed radius by the API is 50,000 m; 30 km covers most city metro areas
      // while excluding neighbouring cities (e.g. Tokyo vs Osaka ~400 km apart).
      body.locationRestriction = {
        circle: {
          center: { latitude: cityCoords.lat, longitude: cityCoords.lng },
          radius: 30000,
        },
      };
    }
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": GMAPS },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    const ADMINISTRATIVE_TYPES = new Set([
      "locality",
      "sublocality",
      "administrative_area_level_1",
      "administrative_area_level_2",
      "administrative_area_level_3",
      "administrative_area_level_4",
      "country",
      "political",
      "colloquial_area",
      "postal_code",
      "postal_town",
    ]);
    return (data.suggestions ?? [])
      .filter((s: any) => {
        const types: string[] = s.placePrediction?.types ?? [];
        // Drop if ALL types are administrative — real places also carry non-admin types
        return !types.every((t) => ADMINISTRATIVE_TYPES.has(t));
      })
      .map((s: any) => ({
        placeId: s.placePrediction?.placeId ?? "",
        description: s.placePrediction?.text?.text ?? "",
        mainText: s.placePrediction?.structuredFormat?.mainText?.text ?? "",
        secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
      }))
      .filter((p: CityPrediction) => p.placeId);
  } catch {
    return [];
  }
}

export async function getPlaceById(placeId: string): Promise<Place | null> {
  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": GMAPS,
        "X-Goog-FieldMask": PLACE_FIELDS,
      },
    });
    if (!res.ok) return null;
    const p = await res.json();
    const photos = (p.photos as Array<{ name: string }> | undefined) ?? [];
    const photoUrls = photos.slice(0, 5).map((ph) => photoUrl(ph.name));
    const location = p.location as { latitude: number; longitude: number };
    const displayName = p.displayName as { text: string };
    return {
      id: p.id as string,
      name: displayName?.text ?? "Unknown",
      address: (p.formattedAddress as string) ?? "",
      lat: location?.latitude ?? 0,
      lng: location?.longitude ?? 0,
      photoUrls,
      rating: (p.rating as number) ?? 0,
      isOpen: true,
      website: p.websiteUri as string | undefined,
      instagramUrl: buildInstagramUrl(displayName?.text ?? ""),
    };
  } catch {
    return null;
  }
}


/**
 * Uses Qwen to identify which places would be significantly worse in the given weather.
 * Returns an array of place IDs deemed weather-sensitive.
 */
export async function checkWeatherSensitivity(
  places: Place[],
  weatherDescription: string
): Promise<string[]> {
  if (!places.length) return [];
  try {
    const list = places.map((p) => `${p.id}: ${p.name}`).join("\n");
    const prompt = `Weather is currently: ${weatherDescription}. Review these places and return ONLY the IDs of places that would be significantly worse in this weather (outdoor spaces, parks, beaches, open-air markets, rooftop venues, etc). Return a single JSON array of ID strings. No explanation.\nPlaces:\n${list}`;
    const completion = await openai.chat.completions.create({
      model: "Qwen/Qwen2.5-7B-Instruct",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 200,
    });
    const content = completion.choices[0]?.message?.content ?? "[]";
    const stripped = content.replace(/```[a-z]*\n?/g, "").trim();
    const matches = stripped.match(/\[[^\[\]]*\]/g) ?? [];
    const ids: string[] = matches.flatMap((m) => {
      try { return JSON.parse(m) as string[]; } catch { return []; }
    });
    // Only return IDs that actually exist in the places list
    const validIds = new Set(places.map((p) => p.id));
    return ids.filter((id) => validIds.has(id));
  } catch {
    return [];
  }
}

/**
 * Checks current open/closed status for each place via the Places API.
 * Returns a map of placeId → isOpen. Falls back to true on error.
 */
export async function checkPlacesOpenNow(
  places: Place[]
): Promise<Record<string, boolean>> {
  if (!places.length) return {};
  const results = await Promise.all(
    places.map(async (p) => {
      try {
        const res = await fetch(`https://places.googleapis.com/v1/places/${p.id}`, {
          headers: {
            "X-Goog-Api-Key": GMAPS,
            "X-Goog-FieldMask": "currentOpeningHours",
          },
        });
        if (!res.ok) return { id: p.id, isOpen: true };
        const data = await res.json();
        const openNow: boolean = data.currentOpeningHours?.openNow ?? true;
        return { id: p.id, isOpen: openNow };
      } catch {
        return { id: p.id, isOpen: true };
      }
    })
  );
  return Object.fromEntries(results.map(({ id, isOpen }) => [id, isOpen]));
}

export async function geocodeAddress(address: string): Promise<Coords> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GMAPS}`;
  const res = await fetch(url);
  const data = await res.json();
  const location = data.results?.[0]?.geometry?.location;
  if (!location) throw new Error("No geocode results");
  return { lat: location.lat, lng: location.lng };
}
