// hotels.seed.js

import HotelModel from "../modules/hotels/hotel.model.js";
// src/seed/hotels.seed.js
import {
  upsertDocuments,
  buildHotelIndexDoc,
  normalizeSeedDoc,
} from "../integrations/langchain/rag.retriever.js"; // was integrations/ai/pinecone.rag.js
export const HOTELS_DATA = [{
  "_id": "6a22f13a2aff6e43a1ad3c6b",
  "name": {
    "en": "Four Seasons Hotel Cairo at Nile Plaza",
    "ar": "فور سيزونز القاهرة نايل بلازا"
  },
  "slug": "four-seasons-cairo-nile-plaza",
  "city": "Cairo",
  "address": {
    "en": "1089 Corniche El Nil, Garden City, Cairo",
    "ar": "1089 كورنيش النيل، جاردن سيتي، القاهرة"
  },
  "description": {
    "en": "Luxury 5-star Nile view hotel featuring elegant rooms, spa, fine dining and premium service.",
    "ar": "فندق فاخر 5 نجوم بإطلالة على النيل يضم غرف راقية وسبا ومطاعم وخدمات مميزة."
  },
  "stars": 5,
  "amenities": [
    "Free WiFi",
    "Swimming Pool",
    "Spa",
    "Gym",
    "Restaurant",
    "Airport Shuttle"
  ],
  "rooms": [
    {
      "name": "Deluxe Nile View",
      "nameAr": "ديلوكس بإطلالة على النيل",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 20,
      "pricePerNight": 12000,
      "amenities": ["Nile View", "Free WiFi", "Minibar", "Bathrobe"],
      "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
      "isActive": true
    },
    {
      "name": "Executive Suite",
      "nameAr": "جناح تنفيذي",
      "roomType": "suite",
      "maxAdults": 2,
      "maxChildren": 2,
      "totalUnits": 8,
      "pricePerNight": 22000,
      "amenities": ["Nile View", "Living Room", "Free WiFi", "Minibar", "Bathrobe", "Butler Service"],
      "images": ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa"],
      "isActive": true
    },
    {
      "name": "Presidential Suite",
      "nameAr": "جناح رئاسي",
      "roomType": "suite",
      "maxAdults": 4,
      "maxChildren": 2,
      "totalUnits": 2,
      "pricePerNight": 45000,
      "amenities": ["Panoramic Nile View", "2 Bedrooms", "Living Room", "Dining Room", "Kitchenette", "Free WiFi", "Butler Service", "Private Elevator"],
      "images": ["https://images.unsplash.com/photo-1566073771259-6a8506099945"],
      "isActive": true
    },
    {
      "name": "Family Room - Nile View",
      "nameAr": "غرفة عائلية بإطلالة على النيل",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 3,
      "totalUnits": 10,
      "pricePerNight": 18000,
      "amenities": ["Nile View", "Connecting Rooms Available", "Free WiFi", "Extra Bed"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 24250,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [31.2296, 30.0444]
  },
  "images": [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa"
  ],
  "coverImage": "https://images.unsplash.com/photo-1566073771259-6a8506099945",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c6c",
  "name": {
    "en": "Kempinski Nile Hotel Cairo",
    "ar": "فندق كمبنسكي نايل القاهرة"
  },
  "slug": "kempinski-nile-hotel-cairo",
  "city": "Cairo",
  "address": {
    "en": "Corniche El Nil, Garden City, Cairo",
    "ar": "كورنيش النيل، جاردن سيتي، القاهرة"
  },
  "description": {
    "en": "Elegant five-star hotel on the Nile with modern rooms, rooftop pool, and sweeping city views.",
    "ar": "فندق خمس نجوم أنيق على النيل يضم غرفًا عصرية ومسبحًا على السطح وإطلالات واسعة على المدينة."
  },
  "stars": 5,
  "amenities": [
    "Rooftop Pool",
    "Free WiFi",
    "Spa",
    "Gym",
    "Restaurant",
    "Business Center"
  ],
  "rooms": [
    {
      "name": "Premier Room",
      "nameAr": "غرفة بريمير",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 30,
      "pricePerNight": 10500,
      "amenities": ["City View", "Free WiFi", "Minibar", "Work Desk"],
      "images": ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"],
      "isActive": true
    },
    {
      "name": "Executive Suite",
      "nameAr": "جناح تنفيذي",
      "roomType": "suite",
      "maxAdults": 2,
      "maxChildren": 2,
      "totalUnits": 10,
      "pricePerNight": 18000,
      "amenities": ["Nile View", "Living Area", "Free WiFi", "Minibar", "Bathrobe"],
      "images": ["https://images.unsplash.com/photo-1496417263034-38ec4f0b665a"],
      "isActive": true
    },
    {
      "name": "Family Connecting Rooms",
      "nameAr": "غرف عائلية متصلة",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 2,
      "totalUnits": 15,
      "pricePerNight": 16000,
      "amenities": ["City View", "Connecting Doors", "Free WiFi", "Extra Bed"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 14833,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [31.2238, 30.0443]
  },
  "images": [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
    "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a"
  ],
  "coverImage": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c6d",
  "name": {
    "en": "Four Seasons Hotel Alexandria at San Stefano",
    "ar": "فندق فور سيزونز الإسكندرية سان ستيفانو"
  },
  "slug": "four-seasons-alexandria-san-stefano",
  "city": "Alexandria",
  "address": {
    "en": "San Stefano Grand Plaza, Alexandria",
    "ar": "سان ستيفانو جراند بلازا، الإسكندرية"
  },
  "description": {
    "en": "Seafront luxury hotel in Alexandria with private marina, elegant rooms, and Mediterranean dining.",
    "ar": "فندق فاخر على البحر في الإسكندرية مع مراسي خاصة وغرف أنيقة ومطاعم على طراز البحر الأبيض المتوسط."
  },
  "stars": 5,
  "amenities": [
    "Private Marina",
    "Spa",
    "Gym",
    "Pool",
    "Restaurant",
    "Beach Access"
  ],
  "rooms": [
    {
      "name": "Sea View Room",
      "nameAr": "غرفة بإطلالة بحرية",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 25,
      "pricePerNight": 9000,
      "amenities": ["Sea View", "Balcony", "Free WiFi", "Minibar"],
      "images": ["https://images.unsplash.com/photo-1494526585095-c41746248156"],
      "isActive": true
    },
    {
      "name": "Deluxe Suite",
      "nameAr": "جناح ديلوكس",
      "roomType": "suite",
      "maxAdults": 2,
      "maxChildren": 2,
      "totalUnits": 8,
      "pricePerNight": 17000,
      "amenities": ["Panoramic Sea View", "Living Room", "Free WiFi", "Bathrobe", "Minibar"],
      "images": [],
      "isActive": true
    },
    {
      "name": "Family Suite",
      "nameAr": "جناح عائلي",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 3,
      "totalUnits": 6,
      "pricePerNight": 21000,
      "amenities": ["Sea View", "2 Bedrooms", "Living Area", "Free WiFi", "Extra Beds"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 15666,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [31.198, 29.9335]
  },
  "images": [
    "https://images.unsplash.com/photo-1494526585095-c41746248156"
  ],
  "coverImage": "https://images.unsplash.com/photo-1494526585095-c41746248156",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c6e",
  "name": {
    "en": "Sofitel Winter Palace Luxor",
    "ar": "سوفيتيل وينتر بالاس الأقصر"
  },
  "slug": "sofitel-winter-palace-luxor",
  "city": "Luxor",
  "address": {
    "en": "Corniche El Nile, Luxor",
    "ar": "كورنيش النيل، الأقصر"
  },
  "description": {
    "en": "Historic luxury hotel overlooking the Nile with royal gardens and classic Victorian architecture.",
    "ar": "فندق تاريخي فاخر مطل على النيل بحدائق ملكية وتصميم فيكتوري كلاسيكي."
  },
  "stars": 5,
  "amenities": [
    "Pool",
    "Free WiFi",
    "Restaurant",
    "Garden",
    "Bar"
  ],
  "rooms": [
    {
      "name": "Classic Room - Garden View",
      "nameAr": "غرفة كلاسيكية بإطلالة على الحديقة",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 40,
      "pricePerNight": 8000,
      "amenities": ["Garden View", "Free WiFi", "Minibar"],
      "images": ["https://images.unsplash.com/photo-1582719508461-905c673771fd"],
      "isActive": true
    },
    {
      "name": "Nile View Suite",
      "nameAr": "جناح بإطلالة على النيل",
      "roomType": "suite",
      "maxAdults": 2,
      "maxChildren": 2,
      "totalUnits": 12,
      "pricePerNight": 15000,
      "amenities": ["Nile View", "Living Area", "Free WiFi", "Bathrobe", "Minibar"],
      "images": [],
      "isActive": true
    },
    {
      "name": "Royal Suite",
      "nameAr": "جناح ملكي",
      "roomType": "suite",
      "maxAdults": 4,
      "maxChildren": 2,
      "totalUnits": 3,
      "pricePerNight": 35000,
      "amenities": ["Panoramic Nile View", "2 Bedrooms", "Dining Room", "Living Room", "Butler Service", "Free WiFi"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 19333,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [32.6396, 25.6872]
  },
  "images": [
    "https://images.unsplash.com/photo-1582719508461-905c673771fd"
  ],
  "coverImage": "https://images.unsplash.com/photo-1582719508461-905c673771fd",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c6f",
  "name": {
    "en": "Sofitel Legend Old Cataract Aswan",
    "ar": "سوفيتيل ليجند أولد كتاراكت أسوان"
  },
  "slug": "sofitel-legend-old-cataract-aswan",
  "city": "Aswan",
  "address": {
    "en": "Corniche El Nile, Aswan",
    "ar": "كورنيش النيل، أسوان"
  },
  "description": {
    "en": "Iconic historic hotel on a cliff above the Nile with luxurious rooms, elegant dining, and picturesque river views.",
    "ar": "فندق تاريخي أيقوني على ضفة النيل مع غرف فاخرة ومطاعم أنيقة وإطلالات خلابة على النهر."
  },
  "stars": 5,
  "amenities": [
    "Spa",
    "Pool",
    "Free WiFi",
    "Restaurant",
    "Riverside Terrace"
  ],
  "rooms": [
    {
      "name": "Palace Room - Nile View",
      "nameAr": "غرفة القصر بإطلالة على النيل",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 20,
      "pricePerNight": 9500,
      "amenities": ["Nile View", "Free WiFi", "Minibar", "Bathrobe"],
      "images": ["https://images.unsplash.com/photo-1532634896-26909d0d0d8b"],
      "isActive": true
    },
    {
      "name": "Cataract Suite",
      "nameAr": "جناح كتاراكت",
      "roomType": "suite",
      "maxAdults": 2,
      "maxChildren": 2,
      "totalUnits": 8,
      "pricePerNight": 18000,
      "amenities": ["Panoramic Nile View", "Living Room", "Free WiFi", "Butler Service", "Bathrobe"],
      "images": [],
      "isActive": true
    },
    {
      "name": "Family Suite",
      "nameAr": "جناح عائلي",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 3,
      "totalUnits": 5,
      "pricePerNight": 22000,
      "amenities": ["Nile View", "2 Bedrooms", "Living Area", "Free WiFi", "Extra Beds"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 16500,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [32.8847, 24.0907]
  },
  "images": [
    "https://images.unsplash.com/photo-1532634896-26909d0d0d8b"
  ],
  "coverImage": "https://images.unsplash.com/photo-1532634896-26909d0d0d8b",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c70",
  "name": {
    "en": "Rixos Premium Seagate",
    "ar": "ريكسوس بريميوم سيجيت"
  },
  "slug": "rixos-premium-seagate",
  "city": "Sharm El-Sheikh",
  "address": {
    "en": "Nabq Bay, Sharm El-Sheikh",
    "ar": "خليج نبق، شرم الشيخ"
  },
  "description": {
    "en": "All-inclusive luxury beach resort with private beach, aqua park and premium restaurants.",
    "ar": "منتجع شاطئي فاخر شامل الإقامة مع شاطئ خاص وأكوا بارك ومطاعم مميزة."
  },
  "stars": 5,
  "amenities": [
    "Private Beach",
    "Spa",
    "Pool",
    "Gym",
    "Kids Club",
    "Free WiFi"
  ],
  "rooms": [
    {
      "name": "Deluxe Sea View",
      "nameAr": "ديلوكس بإطلالة بحرية",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 50,
      "pricePerNight": 9500,
      "amenities": ["Sea View", "Balcony", "Free WiFi", "Minibar"],
      "images": ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461"],
      "isActive": true
    },
    {
      "name": "Family Room",
      "nameAr": "غرفة عائلية",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 3,
      "totalUnits": 30,
      "pricePerNight": 15000,
      "amenities": ["Sea View", "Connecting Rooms Available", "Free WiFi", "Kids Amenities"],
      "images": [],
      "isActive": true
    },
    {
      "name": "Presidential Suite",
      "nameAr": "جناح رئاسي",
      "roomType": "suite",
      "maxAdults": 4,
      "maxChildren": 2,
      "totalUnits": 4,
      "pricePerNight": 24000,
      "amenities": ["Panoramic Sea View", "2 Bedrooms", "Living Room", "Private Pool Access", "Butler Service", "Free WiFi"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 16166,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [34.4297, 28.0405]
  },
  "images": [
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461"
  ],
  "coverImage": "https://images.unsplash.com/photo-1578683010236-d716f9a3f461",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c71",
  "name": {
    "en": "Steigenberger ALDAU Beach Hotel",
    "ar": "فندق شتايجنبرجر الضيوء بيتش"
  },
  "slug": "steigenberger-aldau-beach-hotel",
  "city": "Hurghada",
  "address": {
    "en": "El Corniche Road, Hurghada",
    "ar": "شارع الكورنيش، الغردقة"
  },
  "description": {
    "en": "Modern beachfront resort with expansive pool areas, private beach access and family-friendly amenities.",
    "ar": "منتجع عصري على الشاطئ يضم مساحات واسعة للمسابح وإطلالة خاصة على الشاطئ ومرافق عائلية."
  },
  "stars": 5,
  "amenities": [
    "Private Beach",
    "Spa",
    "Pool",
    "Water Sports",
    "Kids Club",
    "Free WiFi"
  ],
  "rooms": [
    {
      "name": "Superior Room - Sea View",
      "nameAr": "غرفة سوبيريور بإطلالة بحرية",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 60,
      "pricePerNight": 7500,
      "amenities": ["Sea View", "Balcony", "Free WiFi", "Minibar"],
      "images": ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"],
      "isActive": true
    },
    {
      "name": "Family Suite",
      "nameAr": "جناح عائلي",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 3,
      "totalUnits": 20,
      "pricePerNight": 13000,
      "amenities": ["Sea View", "2 Bedrooms", "Living Area", "Free WiFi", "Kids Amenities"],
      "images": [],
      "isActive": true
    },
    {
      "name": "Royal Suite",
      "nameAr": "جناح ملكي",
      "roomType": "suite",
      "maxAdults": 4,
      "maxChildren": 2,
      "totalUnits": 5,
      "pricePerNight": 19000,
      "amenities": ["Panoramic Sea View", "2 Bedrooms", "Living Room", "Dining Area", "Private Terrace", "Butler Service", "Free WiFi"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 13166,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [33.8084, 27.2579]
  },
  "images": [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"
  ],
  "coverImage": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c72",
  "name": {
    "en": "Dahab Paradise",
    "ar": "جنة دهب"
  },
  "slug": "dahab-paradise",
  "city": "Dahab",
  "address": {
    "en": "Dahab Bay Road, Dahab",
    "ar": "طريق خليج دهب، دهب"
  },
  "description": {
    "en": "Relaxed Red Sea resort with bungalow-style rooms, a dive center, and direct access to snorkeling spots.",
    "ar": "منتجع مريح على البحر الأحمر بغرف على طراز البنجالو ومركز للغوص وإمكانية الوصول المباشر لأماكن الغطس."
  },
  "stars": 4,
  "amenities": [
    "Free WiFi",
    "Beach Access",
    "Snorkeling",
    "Restaurant",
    "Bar"
  ],
  "rooms": [
    {
      "name": "Standard Bungalow",
      "nameAr": "بنجالو قياسي",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 25,
      "pricePerNight": 4200,
      "amenities": ["Garden View", "Free WiFi", "Private Terrace"],
      "images": ["https://images.unsplash.com/photo-1501117716987-6b2c086f2f57"],
      "isActive": true
    },
    {
      "name": "Sea View Suite",
      "nameAr": "جناح بإطلالة بحرية",
      "roomType": "suite",
      "maxAdults": 2,
      "maxChildren": 2,
      "totalUnits": 10,
      "pricePerNight": 7200,
      "amenities": ["Sea View", "Living Area", "Free WiFi", "Minibar"],
      "images": [],
      "isActive": true
    },
    {
      "name": "Family Bungalow",
      "nameAr": "بنجالو عائلي",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 3,
      "totalUnits": 8,
      "pricePerNight": 9500,
      "amenities": ["Garden View", "2 Bedrooms", "Free WiFi", "Extra Beds", "Private Terrace"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 6966,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [34.4971, 28.5053]
  },
  "images": [
    "https://images.unsplash.com/photo-1501117716987-6b2c086f2f57"
  ],
  "coverImage": "https://images.unsplash.com/photo-1501117716987-6b2c086f2f57",
  "isActive": true
},
{
  "_id": "6a22f13a2aff6e43a1ad3c73",
  "name": {
    "en": "Hilton Marsa Alam Nubian Resort",
    "ar": "هيلتون مرسى علم نوبيان ريزورت"
  },
  "slug": "hilton-marsa-alam-nubian-resort",
  "city": "Marsa Alam",
  "address": {
    "en": "El Quseir Road, Marsa Alam",
    "ar": "طريق القصير، مرسى علم"
  },
  "description": {
    "en": "A luxury Red Sea resort with elegant rooms, spa services, diving excursions, and scenic desert views.",
    "ar": "منتجع فاخر على البحر الأحمر يضم غرفًا أنيقة وخدمات سبا ورحلات غوص وإطلالات صحراوية خلابة."
  },
  "stars": 5,
  "amenities": [
    "Spa",
    "Pool",
    "Beach Access",
    "Diving Center",
    "Restaurant",
    "Free WiFi"
  ],
  "rooms": [
    {
      "name": "Deluxe Room - Pool View",
      "nameAr": "ديلوكس بإطلالة على المسبح",
      "roomType": "double",
      "maxAdults": 2,
      "maxChildren": 1,
      "totalUnits": 40,
      "pricePerNight": 8600,
      "amenities": ["Pool View", "Balcony", "Free WiFi", "Minibar"],
      "images": ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"],
      "isActive": true
    },
    {
      "name": "Family Suite - Sea View",
      "nameAr": "جناح عائلي بإطلالة بحرية",
      "roomType": "family",
      "maxAdults": 2,
      "maxChildren": 3,
      "totalUnits": 15,
      "pricePerNight": 14500,
      "amenities": ["Sea View", "2 Bedrooms", "Living Area", "Free WiFi", "Kids Amenities"],
      "images": [],
      "isActive": true
    },
    {
      "name": "Executive Suite",
      "nameAr": "جناح تنفيذي",
      "roomType": "suite",
      "maxAdults": 4,
      "maxChildren": 2,
      "totalUnits": 6,
      "pricePerNight": 22000,
      "amenities": ["Sea View", "2 Bedrooms", "Living Room", "Private Terrace", "Butler Service", "Free WiFi"],
      "images": [],
      "isActive": true
    }
  ],
  "averagePricePerNight": 15033,
  "currency": "EGP",
  "location": {
    "type": "Point",
    "coordinates": [34.8458, 25.0469]
  },
  "images": [
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85"
  ],
  "coverImage": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
  "isActive": true
}];

// ─── Seeder function ─────────────────────────────────────────────────────────
export const seedHotels = async () => {
  const count = await HotelModel.countDocuments();
  // if (count > 0) {
  //   console.log
  //     (`[Seed] Hotels already seeded (${count} records) — skipping`);
  //   return;
  // }

  console.log
    ("[Seed] Seeding hotels...");
  // const inserted = await HotelModel.insertMany(HOTELS_DATA);
  console.log
    (`✅ Hotels seeded: ${HOTELS_DATA.length} records across ${[...new Set(HOTELS_DATA.map((d) => d.city))].length
      } cities`);

  // Index hotels in Pinecone for RAG
  // id: `hotel_${doc._id}`,
  //   text: buildIndexText("hotel", doc),
  //     metadata: {
  //   id: doc._id.toString(),
  //     city: doc.city,
  //       slug: doc.slug || "",
  //         name_en: doc.name?.en || "",
  //           name_ar: doc.name?.ar || "",
  //             description_en: doc.description?.en || "",
  //               description_ar: doc.description?.ar || "",
  // },
  try {
    const docsToIndex = HOTELS_DATA.map((doc) =>
      buildHotelIndexDoc(normalizeSeedDoc(doc))
    );

    const indexed = await upsertDocuments(docsToIndex);
    if (indexed) {
      console.log(`[Seed] Indexed ${docsToIndex.length} hotels in Pinecone`);
    } else {
      console.warn("[Seed] Pinecone indexing skipped or failed for hotels");
    }
  } catch (error) {
    console.warn(`[Seed] Failed to index hotels in Pinecone: ${error.message}`);
    // Continue anyway - seeding is successful even if Pinecone fails
  }

  return HOTELS_DATA;
}
