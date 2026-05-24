import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import Destination from "../modules/destinations/destination.model.js";
 const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

 dotenv.config({ path: resolve(__dirname, "../../.development.env") });
const destinations = [
  {
    name: { en: "Cairo", ar: "القاهرة" },
    slug: "cairo",
    city: "Cairo",
    currency: "EGP",
    description: {
      en: "Egypt's vibrant capital, home to the iconic Pyramids of Giza, the Great Sphinx, and the Egyptian Museum. A city where ancient history meets modern life.",
      ar: "العاصمة المصرية النابضة بالحياة، موطن أهرامات الجيزة الشهيرة وأبو الهول والمتحف المصري. مدينة تلتقي فيها الحضارة القديمة بالحياة العصرية.",
    },
    attractions: [
      { name: { en: "Pyramids of Giza", ar: "أهرامات الجيزة" }, type: "historical", entryFee: 360 },
      { name: { en: "Great Sphinx", ar: "أبو الهول" }, type: "historical", entryFee: 0 },
      { name: { en: "Egyptian Museum", ar: "المتحف المصري" }, type: "museum", entryFee: 200 },
      { name: { en: "Khan el-Khalili", ar: "خان الخليلي" }, type: "market", entryFee: 0 },
      { name: { en: "Cairo Citadel", ar: "قلعة صلاح الدين" }, type: "historical", entryFee: 180 },
      { name: { en: "Grand Egyptian Museum", ar: "المتحف المصري الكبير" }, type: "museum", entryFee: 500 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 1200,
    coordinates: { lat: 30.0444, lng: 31.2357 },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/0/0b/%D8%A8%D8%A7%D9%86%D9%88%D8%B1%D8%A7%D9%85%D8%A7_%D8%A7%D9%87%D8%B1%D8%A7%D9%85%D8%A7%D8%AA_%D8%A7%D9%84%D8%AC%D9%8A%D8%B2%D8%A9.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Pyramids_of_Egypt.png",
      "https://upload.wikimedia.org/wikipedia/commons/5/58/Flickr_-_Gaspa_-_Giza%2C_la_piramide_grande.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/a/ac/Cheops_Pyramid_%284314345022%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/2/25/The_Great_Sphinx_of_Giza.JPG",
      "https://upload.wikimedia.org/wikipedia/commons/6/6f/The_Sphinx_%284313608005%29.jpg",
    ],
  },
  {
    name: { en: "Luxor", ar: "الأقصر" },
    slug: "luxor",
    city: "Luxor",
    currency: "EGP",
    description: {
      en: "The world's greatest open-air museum, home to the Valley of the Kings, Karnak Temple, and Luxor Temple. A paradise for history lovers on the banks of the Nile.",
      ar: "أعظم متحف مفتوح في العالم، موطن وادي الملوك ومعبد الكرنك ومعبد الأقصر. جنة لعشاق التاريخ على ضفاف النيل.",
    },
    attractions: [
      { name: { en: "Luxor Temple", ar: "معبد الأقصر" }, type: "historical", entryFee: 140 },
      { name: { en: "Karnak Temple", ar: "معبد الكرنك" }, type: "historical", entryFee: 200 },
      { name: { en: "Valley of the Kings", ar: "وادي الملوك" }, type: "historical", entryFee: 240 },
      { name: { en: "Colossi of Memnon", ar: "تمثالا ممنون" }, type: "historical", entryFee: 0 },
      { name: { en: "Hatshepsut Temple", ar: "معبد حتشبسوت" }, type: "historical", entryFee: 180 },
      { name: { en: "Tomb of Nefertari", ar: "مقبرة نفرتاري" }, type: "historical", entryFee: 1800 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 900,
    coordinates: { lat: 25.6872, lng: 32.6396 },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/c/cf/Louxor_temple_%26_palm_in_louxor.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/89/LuxorTempleFromSE.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/bc/Contribs.jpg",
      "http://upload.wikimedia.org/wikipedia/commons/0/0e/Karnak16%28js%29.jpg",
      "http://upload.wikimedia.org/wikipedia/commons/0/06/Memnon_17.jpg",
      "http://upload.wikimedia.org/wikipedia/commons/d/dc/Memnonkolosse_0483.JPG",
    ],
  },
  {
    name: { en: "Aswan", ar: "أسوان" },
    slug: "aswan",
    city: "Aswan",
    currency: "EGP",
    description: {
      en: "A serene Nile city with rich Nubian culture, the magnificent High Dam, Philae Temple, and nearby Abu Simbel — one of Egypt's most breathtaking sites.",
      ar: "مدينة نيلية هادئة بثقافة نوبية غنية والسد العالي الرائع ومعبد فيلة وأبو سمبل القريب — أحد أكثر المواقع روعةً في مصر.",
    },
    attractions: [
      { name: { en: "Aswan High Dam", ar: "السد العالي" }, type: "landmark", entryFee: 0 },
      { name: { en: "Philae Temple", ar: "معبد فيلة" }, type: "historical", entryFee: 180 },
      { name: { en: "Unfinished Obelisk", ar: "المسلة الناقصة" }, type: "historical", entryFee: 100 },
      { name: { en: "Mausoleum of Aga Khan", ar: "مقبرة آغا خان" }, type: "landmark", entryFee: 0 },
      { name: { en: "Nubia Museum", ar: "المتحف النوبي" }, type: "museum", entryFee: 100 },
      { name: { en: "Elephantine Island", ar: "جزيرة الفنتين" }, type: "nature", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February"],
    averageBudgetPerDay: 800,
    coordinates: { lat: 24.0889, lng: 32.8998 },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/b4/By_ovedc_-_Aswan_High_Dam_-_08.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/f3/2005-03-30_Urlaub_Aegypten_%28088%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/cc/%D9%85%D8%B9%D8%A8%D8%AF_%D8%AC%D8%B2%D9%8A%D8%B1%D8%A9_%D9%81%D9%8A%D9%84%D8%A9_01.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/1/11/Aswan_Philae_temple_Nile_view.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/8/81/Assuan_Unvollendeter_Obelisk_47.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/01/By_ovedc_-_Unfinished_obelisk_in_Aswan_-_13.jpg",
    ],
  },
  {
    name: { en: "Dahab", ar: "دهب" },
    slug: "dahab",
    city: "Dahab",
    currency: "EGP",
    description: {
      en: "A laid-back Red Sea resort town on the Sinai Peninsula, famous for world-class diving, the legendary Blue Hole, and the stunning Coloured Canyon.",
      ar: "مدينة منتجعية هادئة على البحر الأحمر في شبه جزيرة سيناء، مشهورة بالغوص العالمي والثقبة الزرقاء الأسطورية والكانيون الملوّن الخلّاب.",
    },
    attractions: [
      { name: { en: "Blue Hole", ar: "الثقبة الزرقاء" }, type: "nature", entryFee: 0 },
      { name: { en: "Coloured Canyon", ar: "الكانيون الملوّن" }, type: "nature", entryFee: 50 },
      { name: { en: "The Lagoon", ar: "البحيرة" }, type: "beach", entryFee: 0 },
    ],
    bestMonths: ["March", "April", "May", "September", "October", "November"],
    averageBudgetPerDay: 700,
    coordinates: { lat: 28.5109, lng: 34.5157 },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/bf/BlueHole_Rohscan_bearb_150d.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/e/e5/BlueHolePlagues.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/bf/Sinai_Coloured_Canyon_-_panoramio_%287%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/5/5f/Sinai_Coloured_Canyon_-_panoramio_%281%29.jpg",
    ],
  },
  {
    name: { en: "Sharm El-Sheikh", ar: "شرم الشيخ" },
    slug: "sharm-el-sheikh",
    city: "Sharm El-Sheikh",
    currency: "EGP",
    description: {
      en: "A world-renowned Red Sea resort destination with pristine coral reefs, crystal-clear waters, Ras Mohammed National Park, and vibrant nightlife.",
      ar: "وجهة منتجعية عالمية الشهرة على البحر الأحمر تتميز بشعابها المرجانية البكر ومياهها الصافية ومحمية رأس محمد وحياتها الليلية المفعمة.",
    },
    attractions: [
      { name: { en: "Naama Bay", ar: "خليج نعمة" }, type: "beach", entryFee: 0 },
      { name: { en: "Ras Mohammed National Park", ar: "محمية رأس محمد" }, type: "nature", entryFee: 100 },
      { name: { en: "Nabq Protected Area", ar: "محمية نبق" }, type: "nature", entryFee: 50 },
      { name: { en: "Tiran Island", ar: "جزيرة تيران" }, type: "nature", entryFee: 0 },
    ],
    bestMonths: ["March", "April", "May", "September", "October", "November"],
    averageBudgetPerDay: 1500,
    coordinates: { lat: 27.9158, lng: 34.3299 },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/b2/%D0%A8%D0%B0%D1%80%D0%BC-%D1%8D%D0%BB%D1%8C-%D0%A8%D0%B5%D0%B9%D1%85_-_panoramio_%2843%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/9/92/Sailboat_on_beach_at_Na%27ama_Bay.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/e/e9/SharmDunraven.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/6/63/Ras_Mohammed_-_panoramio_%283%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/9/91/Nabq_Protected_Area_%2C_photo_by_Hatem_Moushir_34.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/cf/Avicennia_marina_-_Nabq_by_Hatem_Moushir_7.JPG",
    ],
  },
  {
    name: { en: "Alexandria", ar: "الإسكندرية" },
    slug: "alexandria",
    city: "Alexandria",
    currency: "EGP",
    description: {
      en: "Egypt's Mediterranean jewel, blending Greek, Roman, and Arab heritage. Home to the Bibliotheca Alexandrina, Citadel of Qaitbay, and a stunning coastal corniche.",
      ar: "جوهرة مصر المتوسطية، تمزج بين التراث اليوناني والروماني والعربي. موطن مكتبة الإسكندرية وقلعة قايتباي وكورنيش ساحلي خلّاب.",
    },
    attractions: [
      { name: { en: "Bibliotheca Alexandrina", ar: "مكتبة الإسكندرية" }, type: "cultural", entryFee: 70 },
      { name: { en: "Citadel of Qaitbay", ar: "قلعة قايتباي" }, type: "historical", entryFee: 100 },
      { name: { en: "Pompey's Pillar", ar: "عمود السواري" }, type: "historical", entryFee: 60 },
      { name: { en: "Montaza Palace", ar: "قصر المنتزه" }, type: "landmark", entryFee: 20 },
      { name: { en: "Kom el-Shoqafa Catacombs", ar: "مقابر كوم الشقافة" }, type: "historical", entryFee: 80 },
    ],
    bestMonths: ["April", "May", "June", "September", "October", "November"],
    averageBudgetPerDay: 800,
    coordinates: { lat: 31.2001, lng: 29.9187 },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/0/0c/Space_in_bibliotheca_Alexandrina_02.jpg",
      "http://upload.wikimedia.org/wikipedia/commons/b/ba/GD-EG-BibAlex-Livraison_d%27une_statue.JPG",
      "https://upload.wikimedia.org/wikipedia/commons/c/ce/%D9%82%D9%84%D8%B9%D8%A9_%D9%82%D8%A7%D9%8A%D8%AA%D8%A8%D8%A7%D9%8A_-_5.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/a/ae/Cidadela_de_Qaitbay_17.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/0a/Bay_Citadel.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/5/52/Pompey%27s_Pillar_with_Sphinx.jpg",
    ],
  },
  {
    name: { en: "Siwa Oasis", ar: "واحة سيوة" },
    slug: "siwa",
    city: "Siwa",
    currency: "EGP",
    description: {
      en: "A remote and magical oasis near the Libyan border, known for its Berber culture, salt lakes, ancient Oracle Temple, and stunning desert landscapes.",
      ar: "واحة نائية وساحرة قرب الحدود الليبية، تشتهر بثقافتها البربرية والبحيرات الملحية ومعبد الأوراكل القديم والمناظر الصحراوية الخلّابة.",
    },
    attractions: [
      { name: { en: "Oracle Temple", ar: "معبد الأوراكل" }, type: "historical", entryFee: 60 },
      { name: { en: "Shali Fortress", ar: "قلعة شالي" }, type: "historical", entryFee: 0 },
      { name: { en: "Cleopatra's Bath", ar: "حمام كليوباترا" }, type: "nature", entryFee: 0 },
      { name: { en: "Siwa Salt Lakes", ar: "البحيرات الملحية" }, type: "nature", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 600,
    coordinates: { lat: 29.2031, lng: 25.5195 },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/bf/Siwa_oasis_-_Egypt.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/bb/Siwa_general_view.jpg",
    ],
  },
];
 
const seedDestinations = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DATABASE_URL);
    console.log("Connected to MongoDB");
 
    await Destination.deleteMany({});
    console.log("Cleared existing destinations");
 
    const inserted = await Destination.insertMany(destinations);
    console.log(`\n Seeded ${inserted.length} destinations successfully:`);
    inserted.forEach((d) => console.log(` ${d.name.en} — ${d.images.length} images, ${d.attractions.length} attractions`));
 
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
};
 
seedDestinations();