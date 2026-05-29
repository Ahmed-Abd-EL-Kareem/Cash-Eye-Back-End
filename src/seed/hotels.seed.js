// hotels.seed.js

import HotelModel from "../modules/hotels/hotel.model.js";

export const HOTELS_DATA = [

  // ─── Cairo ─────────────────────────────────────────
  {
    name: {
      en: "Four Seasons Hotel Cairo at Nile Plaza",
      ar: "فور سيزونز القاهرة نايل بلازا",
    },

    slug: "four-seasons-cairo-nile-plaza",

    city: "Cairo",

    address: {
      en: "1089 Corniche El Nil, Garden City, Cairo",
      ar: "1089 كورنيش النيل، جاردن سيتي، القاهرة",
    },

    description: {
      en: "Luxury 5-star Nile view hotel featuring elegant rooms, spa, fine dining and premium service.",
      ar: "فندق فاخر 5 نجوم بإطلالة على النيل يضم غرف راقية وسبا ومطاعم وخدمات مميزة.",
    },

    stars: 5,

    amenities: [
      "Free WiFi",
      "Swimming Pool",
      "Spa",
      "Gym",
      "Restaurant",
      "Airport Shuttle",
    ],

    rooms: [
      {
        type: "single",
        pricePerNight: 8500,
        capacity: 1,
      },
      {
        type: "double",
        pricePerNight: 12000,
        capacity: 2,
      },
      {
        type: "suite",
        pricePerNight: 22000,
        capacity: 4,
      },
    ],

    averagePricePerNight: 14166,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [31.2296, 30.0444],
    },

    images: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
  },

  // ─── Luxor ─────────────────────────────────────────
  {
    name: {
      en: "Sofitel Winter Palace Luxor",
      ar: "سوفيتيل وينتر بالاس الأقصر",
    },

    slug: "sofitel-winter-palace-luxor",

    city: "Luxor",

    address: {
      en: "Corniche El Nile, Luxor",
      ar: "كورنيش النيل، الأقصر",
    },

    description: {
      en: "Historic luxury hotel overlooking the Nile with royal gardens and classic Victorian architecture.",
      ar: "فندق تاريخي فاخر مطل على النيل بحدائق ملكية وتصميم فيكتوري كلاسيكي.",
    },

    stars: 5,

    amenities: [
      "Pool",
      "Free WiFi",
      "Restaurant",
      "Garden",
      "Bar",
    ],

    rooms: [
      {
        type: "single",
        pricePerNight: 5000,
        capacity: 1,
      },
      {
        type: "double",
        pricePerNight: 8000,
        capacity: 2,
      },
      {
        type: "suite",
        pricePerNight: 15000,
        capacity: 4,
      },
    ],

    averagePricePerNight: 9333,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [32.6396, 25.6872],
    },

    images: [
      "https://images.unsplash.com/photo-1582719508461-905c673771fd",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd",
  },

  // ─── Sharm El-Sheikh ─────────────────────────────────────
  {
    name: {
      en: "Rixos Premium Seagate",
      ar: "ريكسوس بريميوم سيجيت",
    },

    slug: "rixos-premium-seagate",

    city: "Sharm El-Sheikh",

    address: {
      en: "Nabq Bay, Sharm El-Sheikh",
      ar: "خليج نبق، شرم الشيخ",
    },

    description: {
      en: "All-inclusive luxury beach resort with private beach, aqua park and premium restaurants.",
      ar: "منتجع شاطئي فاخر شامل الإقامة مع شاطئ خاص وأكوا بارك ومطاعم مميزة.",
    },

    stars: 5,

    amenities: [
      "Private Beach",
      "Spa",
      "Pool",
      "Gym",
      "Kids Club",
      "Free WiFi",
    ],

    rooms: [
      {
        type: "double",
        pricePerNight: 9500,
        capacity: 2,
      },
      {
        type: "family",
        pricePerNight: 15000,
        capacity: 5,
      },
      {
        type: "suite",
        pricePerNight: 24000,
        capacity: 4,
      },
    ],

    averagePricePerNight: 16166,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [34.4297, 28.0405],
    },

    images: [
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
  },
];