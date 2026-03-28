import { Place } from "./types";

export const FALLBACK_PLACES: Place[] = [
  {
    id: "fallback-1",
    name: "The Local Gallery",
    address: "123 Art Street, Your City",
    lat: 40.7128,
    lng: -74.006,
    photoUrls: [
      "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800",
      "https://images.unsplash.com/photo-1541367777708-7905fe3296c0?w=800",
    ],
    rating: 4.5,
    isOpen: true,
    website: "https://example.com",
    instagramUrl: "https://instagram.com/explore/tags/localgallery",
  },
  {
    id: "fallback-2",
    name: "Cozy Corner Café",
    address: "456 Brew Lane, Your City",
    lat: 40.7138,
    lng: -74.0071,
    photoUrls: [
      "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800",
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800",
    ],
    rating: 4.7,
    isOpen: true,
    instagramUrl: "https://instagram.com/explore/tags/cozycornercafe",
  },
  {
    id: "fallback-3",
    name: "Rooftop Garden Bar",
    address: "789 Sky High Ave, Your City",
    lat: 40.7148,
    lng: -74.0081,
    photoUrls: [
      "https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800",
      "https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800",
    ],
    rating: 4.3,
    isOpen: true,
    instagramUrl: "https://instagram.com/explore/tags/rooftopgardenbar",
  },
];
