# Naramo
Low cortisol traveling. Built at Indy Hacks 2026.

## Inspiration
While travelling to Chicago with a friend for a few days, we ran into some rough patches where not everythign went to plan. We had used ChatGPT to plan an itinerary, and while it looked good on paper, it quickly fell apart as we experienced the true conditions on the ground. And that's when I realized:

Most travel apps force you into rigid, time-blocked itineraries that crumble the moment you deviate a little bit off. Whether that be spending some extra time at that cafe, or deciding that museum was not worth two hours in, a linear and rigid plan only needs to suffer from one problem to begin failing.

Instead, plans should feel more like a Spotify playlist than a flight schedule. They need to be adaptive and dynamic to any sort of conditions you encounter, instead of being blind and immobile.

## What it does
Naramo is a "low cortisol" travel app for anyone trying to enjoy their vacation. Instead of scheduling hours, you describe your mood by picking tags like Hidden Gems, Rooftop Bars, or Live Music or adding your own text, and the app builds a fluid queue of real, open-right-now places nearby.

## Key features
- Vibe to Places: AI translates your mood + live weather into specific Google Places search queries
- Tinder-style swipe deck: swipe right to add a place to your itinerary, left to skip                                                                                                      - Smart queue: places are sorted by walking distance and re-optimized every time you skip
- Take Me There: one tap opens Google Maps navigation to your current stop                                                                                                                 
- Hard Stop: optional deadline that warns you when it's time to head to your final destination                                                                                             
- Save & resume itineraries: save named trips and pick up where you left off                                                                                                               
                                                                                                                                                                                                                                                                                                                                                                               
## How I built it
- Expo and React Native for file-based navigation                                                                                                        
- NativeWind v4 for styling                                                                                                                                
- Featherless.ai for powering an LLM that strictly translates vibes into Google Maps search strings                                                                    
- Google Maps Platform: Places API for discovery, Distance Matrix API for re-sorting on skip, Maps SDK for the in-travel map view                                                         
- OpenWeatherMap for live weather conditions                                                                                                                 

## Challenges I ran into                                                                                                                                                                                         
- react-native-maps peer deps: the package has no Expo config plugin, requiring manual app.config.js injection of the Google Maps API key for Android native builds
- Infinite swipe without repeats: when all Google pagination tokens were exhausted, we needed the AI to generate fresh, non-overlapping queries. We built a permanent cross-session seenPlaceIds dedup set in AsyncStorage.                                                                                                                                                    
- Pivoting mid-hackathon: we originally built the app in Next.js as a PWA, then scrapped the entire thing and rewrote it in Expo React Native after realizing we needed native maps and gesture support that a PWA couldn't deliver well.                                                                                                                                          
- Dependency hell: npm install --legacy-peer-deps became our best friend due to canary peer dep conflicts in the Expo ecosystem.
- Constrained routing: implementing a nearest-neighbor route optimizer that also respects hard-stop deadlines (not just distance) required careful ordering logic.                         
                                                                                                                                                                                                                                                                                                                                                                                    
## Accomplishments that I'm proud of
- Shipping a full native app with a map, swipe deck, live APIs, and offline fallbacks in under 36 hours after a full mid-hackathon rewrite
- The AI prompt is intentionally minimal: it only translates vibes to search strings, never inventing fake places or hallucinating recommendations                                         
- The skip + re-sort flow is genuinely useful, since re-fetching your GPS and re-running Distance Matrix on the remaining queue means the app always routes you optimally from wherever you actually are                                                                                                                                                                               
                                                                                                                                                                                     
## What I learned               
- PWA vs. native is a real decision with sharp tradeoffs — gesture-heavy, map-heavy apps belong on native
- Constraining an LLM to a narrow task (translation only, no generation) makes it far more reliable in a demo context                                                                      
- Good fallback data is not optional — API rate limits hit at the worst moments during judging                                                                                             
                                                                                                                                                                                       
## What's next for Naramo                                                                                                                                                                                        
- Social layer: share your vibe playlist with friends or explore what others built for a city
- Smarter AI: incorporate real-time events (concerts, pop-ups, markets) into the discovery layer                                                                                           
- Offline mode: cache discovered places so the app works in low-connectivity areas                                                                                                         
- Apple Watch companion: glanceable next-stop info on your wrist while navigating                                                                                                          
- Trip history & analytics: look back at everywhere you've been with a visual timeline
