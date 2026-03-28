# Naramo

## Project Overview
Naramo is a dynamic, "vibe-based" travel PWA. It abandons rigid time-based itineraries in favor of a fluid, Spotify-like "playlist" of locations. The app translates user vibes (tags + text) into specific Google Maps search queries, filtering out closed places, and sorting them geographically.

**CRITICAL Directives for Claude:**
- This is a hackathon project.
- We have less than 36 hours. Prioritize speed, working features, and clean UI over scalable architecture.
- Do NOT implement a database (no Prisma, Postgres, or MongoDB). Use local React state or `localStorage`.
- Do NOT implement user authentication.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + shadcn/ui + lucide-react
- **Mobile Strategy:** `next-pwa` (Progressive Web App)
- **State Management:** React `useState` / `useContext` (Keep it simple)
- **AI/LLM:** `openai` SDK pointing to Featherless.ai (baseURL: "https://api.featherless.ai/v1")
- **Maps/Location:** Google Maps Platform (Places API, Distance Matrix API)
- **External APIs:** OpenWeatherMap (Weather), Overpass API (Restrooms)

## Core App Flow & State Architecture
The itinerary is NOT time-based. It is an array of `Place` objects sorted by distance from the user's current location.

### Before travelling
1. User selects tags (shadcn Badges) and adds text (Textarea). Optional: "Hard Stop Time".
2. Hit Google Places API Text Search with these strings to get actual, open places.
3. User selects places they are interested in. Can refine and repeat query to add more places if desired.
4. User confirms a list of places that they want to visit.
   

### Start of travelling
1. Check for the user.
   - Check Weather (OpenWeatherMap).
   - Feed Vibe + Weather to Featherless AI. 
   - **AI Prompt Rule:** AI MUST ONLY act as a translator. Prompt: "Translate this vibe [Vibe] and weather [Weather] into 3 highly specific Google Maps search strings." (Output: `["underground art gallery", "cozy cafe", ...]`)
2. Display the first place. Put the rest in a queue.

## Feature Requirements & Implementation Details

### 1. The "Take Me There" Button
Do NOT build in-app navigation. Use deep links to native map apps.
- Format: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`

### 2. The Fluid Queue ("Next" & "Skip")
- **"Next" Button:** Slices index 0 off the places array. Renders the new index 0.
- **"Skip" Button:** Slices index 0 off. Grabs user's *current* GPS coordinates via browser API. Re-runs the remaining array through Google Distance Matrix API to re-sort by closest distance, ensuring optimal routing. 

### 3. Restroom SOS Button
- Implement a floating action button (lucide `Toilet` icon).
- When clicked, grab current GPS.
- Send GET request to Overpass API: 
  `[out:json];node["amenity"="toilets"](around:500,{lat},{lng});out;`
- Drop a pin or show distance to the nearest result.

### 4. Hard Stop Time (Optional Constraint)
- If user sets a hard deadline (e.g., 5:00 PM), calculate transit time to their final destination using Distance Matrix whenever they hit "Next". 
- If current time + transit time >= Hard Stop Time, trigger a UI warning Toast: "Time to head to your final destination!"

## Styling Rules
- Use `shadcn/ui` for all interactive elements (Cards, Buttons, Badges, Textareas, Toasts).
- Ensure high touch-targets for mobile (min 44px x 44px for buttons).
- Use a clean, modern, slightly playful aesthetic. The app should feel snappy.

## Error Handling & Fallbacks
- If an API rate limits or fails, gracefully fallback to a hardcoded JSON array of 3 sample places so the UI demo does not break during judging.
- Always wrap `navigator.geolocation` calls in `try/catch` blocks.