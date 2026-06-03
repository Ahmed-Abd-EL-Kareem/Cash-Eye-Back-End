// hotels.seed.js

import HotelModel from "../modules/hotels/hotel.model.js";
import { upsertDocuments, buildIndexText } from "../ai/pinecone.rag.js";

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

  {
    name: {
      en: "Kempinski Nile Hotel Cairo",
      ar: "فندق كمبنسكي نايل القاهرة",
    },

    slug: "kempinski-nile-hotel-cairo",

    city: "Cairo",

    address: {
      en: "Corniche El Nil, Garden City, Cairo",
      ar: "كورنيش النيل، جاردن سيتي، القاهرة",
    },

    description: {
      en: "Elegant five-star hotel on the Nile with modern rooms, rooftop pool, and sweeping city views.",
      ar: "فندق خمس نجوم أنيق على النيل يضم غرفًا عصرية ومسبحًا على السطح وإطلالات واسعة على المدينة.",
    },

    stars: 5,

    amenities: [
      "Rooftop Pool",
      "Free WiFi",
      "Spa",
      "Gym",
      "Restaurant",
      "Business Center",
    ],

    rooms: [
      {
        type: "single",
        pricePerNight: 7000,
        capacity: 1,
      },
      {
        type: "double",
        pricePerNight: 10500,
        capacity: 2,
      },
      {
        type: "suite",
        pricePerNight: 18000,
        capacity: 4,
      },
    ],

    averagePricePerNight: 11833,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [31.2238, 30.0443],
    },

    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
      "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
  },

  // ─── Alexandria ───────────────────────────────────────
  {
    name: {
      en: "Four Seasons Hotel Alexandria at San Stefano",
      ar: "فندق فور سيزونز الإسكندرية سان ستيفانو",
    },

    slug: "four-seasons-alexandria-san-stefano",

    city: "Alexandria",

    address: {
      en: "San Stefano Grand Plaza, Alexandria",
      ar: "سان ستيفانو جراند بلازا، الإسكندرية",
    },

    description: {
      en: "Seafront luxury hotel in Alexandria with private marina, elegant rooms, and Mediterranean dining.",
      ar: "فندق فاخر على البحر في الإسكندرية مع مراسي خاصة وغرف أنيقة ومطاعم على طراز البحر الأبيض المتوسط.",
    },

    stars: 5,

    amenities: [
      "Private Marina",
      "Spa",
      "Gym",
      "Pool",
      "Restaurant",
      "Beach Access",
    ],

    rooms: [
      {
        type: "double",
        pricePerNight: 9000,
        capacity: 2,
      },
      {
        type: "suite",
        pricePerNight: 17000,
        capacity: 4,
      },
      {
        type: "family",
        pricePerNight: 21000,
        capacity: 5,
      },
    ],

    averagePricePerNight: 15666,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [31.1980, 29.9335],
    },

    images: [
      "https://images.unsplash.com/photo-1494526585095-c41746248156",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1494526585095-c41746248156",
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

  // ─── Aswan ─────────────────────────────────────────
  {
    name: {
      en: "Sofitel Legend Old Cataract Aswan",
      ar: "سوفيتيل ليجند أولد كتاراكت أسوان",
    },

    slug: "sofitel-legend-old-cataract-aswan",

    city: "Aswan",

    address: {
      en: "Corniche El Nile, Aswan",
      ar: "كورنيش النيل، أسوان",
    },

    description: {
      en: "Iconic historic hotel on a cliff above the Nile with luxurious rooms, elegant dining, and picturesque river views.",
      ar: "فندق تاريخي أيقوني على ضفة النيل مع غرف فاخرة ومطاعم أنيقة وإطلالات خلابة على النهر.",
    },

    stars: 5,

    amenities: [
      "Spa",
      "Pool",
      "Free WiFi",
      "Restaurant",
      "Riverside Terrace",
    ],

    rooms: [
      {
        type: "double",
        pricePerNight: 9500,
        capacity: 2,
      },
      {
        type: "suite",
        pricePerNight: 18000,
        capacity: 4,
      },
      {
        type: "family",
        pricePerNight: 22000,
        capacity: 5,
      },
    ],

    averagePricePerNight: 16500,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [32.8847, 24.0907],
    },

    images: [
      "https://images.unsplash.com/photo-1532634896-26909d0d0d8b",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1532634896-26909d0d0d8b",
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

  // ─── Hurghada ─────────────────────────────────────────
  {
    name: {
      en: "Steigenberger ALDAU Beach Hotel",
      ar: "فندق شتايجنبرجر الضيوء بيتش",
    },

    slug: "steigenberger-aldau-beach-hotel",

    city: "Hurghada",

    address: {
      en: "El Corniche Road, Hurghada",
      ar: "شارع الكورنيش، الغردقة",
    },

    description: {
      en: "Modern beachfront resort with expansive pool areas, private beach access and family-friendly amenities.",
      ar: "منتجع عصري على الشاطئ يضم مساحات واسعة للمسابح وإطلالة خاصة على الشاطئ ومرافق عائلية.",
    },

    stars: 5,

    amenities: [
      "Private Beach",
      "Spa",
      "Pool",
      "Water Sports",
      "Kids Club",
      "Free WiFi",
    ],

    rooms: [
      {
        type: "double",
        pricePerNight: 7500,
        capacity: 2,
      },
      {
        type: "family",
        pricePerNight: 13000,
        capacity: 5,
      },
      {
        type: "suite",
        pricePerNight: 19000,
        capacity: 4,
      },
    ],

    averagePricePerNight: 13166,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [33.8084, 27.2579],
    },

    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
  },

  // ─── Dahab ─────────────────────────────────────────
  {
    name: {
      en: "Dahab Paradise",
      ar: "جنة دهب",
    },

    slug: "dahab-paradise",

    city: "Dahab",

    address: {
      en: "Dahab Bay Road, Dahab",
      ar: "طريق خليج دهب، دهب",
    },

    description: {
      en: "Relaxed Red Sea resort with bungalow-style rooms, a dive center, and direct access to snorkeling spots.",
      ar: "منتجع مريح على البحر الأحمر بغرف على طراز البنجالو ومركز للغوص وإمكانية الوصول المباشر لأماكن الغطس.",
    },

    stars: 4,

    amenities: [
      "Free WiFi",
      "Beach Access",
      "Snorkeling",
      "Restaurant",
      "Bar",
    ],

    rooms: [
      {
        type: "double",
        pricePerNight: 4200,
        capacity: 2,
      },
      {
        type: "suite",
        pricePerNight: 7200,
        capacity: 4,
      },
      {
        type: "family",
        pricePerNight: 9500,
        capacity: 5,
      },
    ],

    averagePricePerNight: 6966,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [34.4971, 28.5053],
    },

    images: [
      "https://images.unsplash.com/photo-1501117716987-6b2c086f2f57",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1501117716987-6b2c086f2f57",
  },

  // ─── Marsa Alam ───────────────────────────────────────
  {
    name: {
      en: "Hilton Marsa Alam Nubian Resort",
      ar: "هيلتون مرسى علم نوبيان ريزورت",
    },

    slug: "hilton-marsa-alam-nubian-resort",

    city: "Marsa Alam",

    address: {
      en: "El Quseir Road, Marsa Alam",
      ar: "طريق القصير، مرسى علم",
    },

    description: {
      en: "A luxury Red Sea resort with elegant rooms, spa services, diving excursions, and scenic desert views.",
      ar: "منتجع فاخر على البحر الأحمر يضم غرفًا أنيقة وخدمات سبا ورحلات غوص وإطلالات صحراوية خلابة.",
    },

    stars: 5,

    amenities: [
      "Spa",
      "Pool",
      "Beach Access",
      "Diving Center",
      "Restaurant",
      "Free WiFi",
    ],

    rooms: [
      {
        type: "double",
        pricePerNight: 8600,
        capacity: 2,
      },
      {
        type: "family",
        pricePerNight: 14500,
        capacity: 5,
      },
      {
        type: "suite",
        pricePerNight: 22000,
        capacity: 4,
      },
    ],

    averagePricePerNight: 15033,

    currency: "EGP",

    location: {
      type: "Point",
      coordinates: [34.8458, 25.0469],
    },

    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
    ],

    coverImage:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
  },
];

// ─── Seeder function ─────────────────────────────────────────────────────────
export const seedHotels = async () => {
  const count = await HotelModel.countDocuments();
  if (count > 0) {
    console.log
      (`[Seed] Hotels already seeded (${count} records) — skipping`);
    return;
  }

  console.log
    ("[Seed] Seeding hotels...");
  const inserted = await HotelModel.insertMany(HOTELS_DATA);
  console.log
    (`✅ Hotels seeded: ${inserted.length} records across ${[...new Set(inserted.map((d) => d.city))].length
      } cities`);

  // Index hotels in Pinecone for RAG
  try {
    const docsToIndex = inserted.map((doc, index) => ({
      id: `hotel_${doc._id}`,
      text: buildIndexText("hotel", doc),
      metadata: {
        _id: doc._id.toString(),
        name: doc.name,
        city: doc.city,
        stars: doc.stars,
        averagePricePerNight: doc.averagePricePerNight,
        currency: doc.currency
      }
    }));

    await upsertDocuments(docsToIndex);
    console.log(`[Seed] Indexed ${docsToIndex.length} hotels in Pinecone`);
  } catch (error) {
    console.warn(`[Seed] Failed to index hotels in Pinecone: ${error.message}`);
    // Continue anyway - seeding is successful even if Pinecone fails
  }

  return inserted;
}
