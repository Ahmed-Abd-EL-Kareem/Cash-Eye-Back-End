// Source: gldv2_info.csv — real Egypt landmark data with Wikipedia images.
// GeoJSON format: coordinates: [longitude, latitude] — MongoDB order (lng first).
// Run via: npm run seed

import DestinationModel from "../modules/destinations/destination.model.js";
import logger from "../config/logger.js";
import { upsertDocuments, buildIndexText } from "../ai/pinecone.rag.js";

export const DESTINATIONS_DATA = [
  // ─── Cairo ───────────────────────────────────────────────────────────────
  {
    name: { en: "Great Pyramid of Giza", ar: "الهرم الأكبر بالجيزة" },
    slug: "great-pyramid-of-giza",
    city: "Cairo", region: "Lower Egypt", category: "historical",
    description: {
      en: "The oldest of the Seven Wonders of the Ancient World. Built for Pharaoh Khufu around 2560 BC, standing 138 metres tall on the Giza Plateau alongside the Sphinx and two other pyramids.",
      ar: "أقدم عجائب العالم القديم السبع. بُني للفرعون خوفو حوالي 2560 قبل الميلاد، يبلغ ارتفاعه 138 متراً على هضبة الجيزة جنباً إلى جنب مع أبو الهول وهرمين آخرين.",
    },
    attractions: [
      { name: { en: "Pyramid of Khufu", ar: "هرم خوفو" }, type: "historical", entryFee: 360 },
      { name: { en: "Pyramid of Khafre", ar: "هرم خفرع" }, type: "historical", entryFee: 100 },
      { name: { en: "Pyramid of Menkaure", ar: "هرم منقرع" }, type: "historical", entryFee: 100 },
      { name: { en: "Great Sphinx", ar: "أبو الهول" }, type: "historical", entryFee: 0 },
      { name: { en: "Solar Boat Museum", ar: "متحف المركب الشمسية" }, type: "museum", entryFee: 100 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 1200, currency: "EGP",
    location: { type: "Point", coordinates: [31.1342, 29.9792] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/f/fd/Pyramids_of_Egypt.png",
      "https://upload.wikimedia.org/wikipedia/commons/5/58/Flickr_-_Gaspa_-_Giza%2C_la_piramide_grande.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/2/25/The_Great_Sphinx_of_Giza.JPG",
      "https://upload.wikimedia.org/wikipedia/commons/a/ac/Cheops_Pyramid_%284314345022%29.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/f/fd/Pyramids_of_Egypt.png",
  },
  {
    name: { en: "Cairo Citadel", ar: "قلعة القاهرة" },
    slug: "cairo-citadel",
    city: "Cairo", region: "Lower Egypt", category: "historical",
    description: {
      en: "A medieval Islamic fortification built by Saladin in the 12th century. Houses the Muhammad Ali Mosque and offers panoramic views over Cairo.",
      ar: "قلعة إسلامية من العصور الوسطى بناها صلاح الدين في القرن الثاني عشر. تضم مسجد محمد علي وتطل بمنظر بانورامي على القاهرة.",
    },
    attractions: [
      { name: { en: "Muhammad Ali Mosque", ar: "مسجد محمد علي" }, type: "religious", entryFee: 0 },
      { name: { en: "National Military Museum", ar: "المتحف العسكري الوطني" }, type: "museum", entryFee: 30 },
      { name: { en: "Al-Nasir Muhammad Mosque", ar: "مسجد الناصر محمد" }, type: "religious", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 600, currency: "EGP",
    location: { type: "Point", coordinates: [31.2599, 30.0287] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/9/9f/Cairo_Citadel.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/f/fe/Cairo_Saladin_Citadel.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Cairo_Citadel.jpg",
  },
  {
    name: { en: "Khan el-Khalili", ar: "خان الخليلي" },
    slug: "khan-el-khalili",
    city: "Cairo", region: "Lower Egypt", category: "cultural",
    description: {
      en: "Cairo's iconic medieval bazaar — a labyrinthine market offering spices, jewelry, crafts, and souvenirs in the heart of Islamic Cairo since the 14th century.",
      ar: "السوق الشعبي الأيقوني في القاهرة منذ القرن الرابع عشر — متشعب يقدم التوابل والمجوهرات والحرف والتذكارات في قلب القاهرة الإسلامية.",
    },
    attractions: [
      { name: { en: "Khan el-Khalili Bazaar", ar: "بازار خان الخليلي" }, type: "market", entryFee: 0 },
      { name: { en: "Al-Hussein Mosque", ar: "مسجد الحسين" }, type: "religious", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March", "April"],
    averageBudgetPerDay: 400, currency: "EGP",
    location: { type: "Point", coordinates: [31.2625, 30.0478] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/3a/Khan_el-Khalili_market.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Khan_el-Khalili_market.jpg",
  },
  {
    name: { en: "Saqqara Necropolis", ar: "سقارة" },
    slug: "saqqara",
    city: "Cairo", region: "Lower Egypt", category: "historical",
    description: {
      en: "A vast ancient burial ground featuring the Step Pyramid of Djoser — the world's oldest stone structure — along with dozens of mastabas and royal tombs spanning 3,000 years.",
      ar: "مقبرة قديمة شاسعة تضم هرم زوسر المدرج — أقدم هيكل حجري في العالم — إلى جانب عشرات المصاطب والمقابر الملكية التي تمتد عبر 3000 عام.",
    },
    attractions: [
      { name: { en: "Step Pyramid of Djoser", ar: "هرم زوسر المدرج" }, type: "historical", entryFee: 200 },
      { name: { en: "Imhotep Museum", ar: "متحف إمحوتب" }, type: "museum", entryFee: 60 },
      { name: { en: "Pyramid of Unas", ar: "هرم أوناس" }, type: "historical", entryFee: 100 },
      { name: { en: "Mastaba of Ti", ar: "مصطبة تي" }, type: "historical", entryFee: 80 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 700, currency: "EGP",
    location: { type: "Point", coordinates: [31.2165, 29.8714] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/d/df/Saqqara_BW_5.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/1/10/Djoser_Pyramid_Saqqara_2007_cropped.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/d/df/Saqqara_BW_5.jpg",
  },
  {
    name: { en: "Bab al-Nasr", ar: "باب النصر" },
    slug: "bab-al-nasr",
    city: "Cairo", region: "Lower Egypt", category: "historical",
    description: {
      en: "One of Cairo's three surviving Fatimid-era city gates, built in 1087. Its name means 'Gate of Victory'. A striking example of medieval Islamic military architecture.",
      ar: "إحدى بوابات القاهرة الفاطمية الثلاث الباقية، بُنيت عام 1087. اسمها يعني 'باب الانتصار'. مثال بارز للعمارة العسكرية الإسلامية في العصور الوسطى.",
    },
    attractions: [
      { name: { en: "Bab al-Nasr Gate", ar: "بوابة باب النصر" }, type: "historical", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 300, currency: "EGP",
    location: { type: "Point", coordinates: [31.2638, 30.0626] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/37/Bab_en-Nasr_%281878%29_-_TIMEA.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/2/2a/Bab_al-Nasr_in_2017%2C_photo_by_Hatem_Moushir_09.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/a/a2/Cairo-Bab-al-Nasr.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/3/37/Bab_en-Nasr_%281878%29_-_TIMEA.jpg",
  },
  {
    name: { en: "Wadi Degla", ar: "وادي دجلة" },
    slug: "wadi-degla",
    city: "Cairo", region: "Lower Egypt", category: "nature",
    description: {
      en: "A protected wadi in the eastern Cairo desert with dramatic limestone cliffs. Popular for hiking, birdwatching, and spotting rare wildlife like foxes and Egyptian vultures.",
      ar: "وادٍ محمي في صحراء القاهرة الشرقية بجروف جيرية درامية. مشهور بالتنزه ومشاهدة الطيور ورصد الحياة البرية النادرة كالثعالب والنسور المصرية.",
    },
    attractions: [
      { name: { en: "Wadi Degla Protectorate", ar: "محمية وادي دجلة" }, type: "nature", entryFee: 5 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March", "April"],
    averageBudgetPerDay: 200, currency: "EGP",
    location: { type: "Point", coordinates: [31.3567, 29.9742] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/4/4a/Wadi_Degla.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Wadi_Degla.jpg",
  },
  {
    name: { en: "Bayt Al-Suhaymi", ar: "بيت السحيمي" },
    slug: "bayt-al-suhaymi",
    city: "Cairo", region: "Lower Egypt", category: "cultural",
    description: {
      en: "A beautifully preserved 17th-century Ottoman-era mansion in Islamic Cairo. Offers an authentic glimpse into the aristocratic domestic life of medieval Egypt.",
      ar: "قصر عثماني من القرن السابع عشر محفوظ بشكل جميل في القاهرة الإسلامية. يقدم لمحة أصيلة عن الحياة المنزلية الأرستقراطية في مصر الوسيطة.",
    },
    attractions: [
      { name: { en: "Bayt Al-Suhaymi Mansion", ar: "قصر بيت السحيمي" }, type: "cultural", entryFee: 60 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 300, currency: "EGP",
    location: { type: "Point", coordinates: [31.2626, 30.0591] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/c/c1/Beit_as-Suhaymi.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Beit_as-Suhaymi.jpg",
  },

  // ─── Luxor ───────────────────────────────────────────────────────────────
  {
    name: { en: "Karnak Temple Complex", ar: "معبد الكرنك" },
    slug: "karnak-temple",
    city: "Luxor", region: "Upper Egypt", category: "historical",
    description: {
      en: "The largest ancient religious site in the world. A vast complex of temples, pylons, and obelisks built over 2,000 years by successive pharaohs, dominated by the Great Hypostyle Hall.",
      ar: "أكبر موقع ديني قديم في العالم. مجمع ضخم من المعابد والبوابات والمسلات بُني على مدى 2000 عام بواسطة الفراعنة المتعاقبين، يهيمن عليه قاعة الأعمدة العظيمة.",
    },
    attractions: [
      { name: { en: "Great Hypostyle Hall", ar: "قاعة الأعمدة العظيمة" }, type: "historical", entryFee: 0 },
      { name: { en: "Sacred Lake", ar: "البحيرة المقدسة" }, type: "historical", entryFee: 0 },
      { name: { en: "Avenue of Sphinxes", ar: "طريق الكباش" }, type: "historical", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 900, currency: "EGP",
    location: { type: "Point", coordinates: [32.6573, 25.7188] },
    images: [
      "http://upload.wikimedia.org/wikipedia/commons/0/0e/Karnak16%28js%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/bd/Karnak_temple_-_panoramio_%28112%29.jpg",
    ],
    coverImage: "http://upload.wikimedia.org/wikipedia/commons/0/0e/Karnak16%28js%29.jpg",
  },
  {
    name: { en: "Colossi of Memnon", ar: "تمثالا ممنون" },
    slug: "colossi-of-memnon",
    city: "Luxor", region: "Upper Egypt", category: "historical",
    description: {
      en: "Two massive stone statues of Pharaoh Amenhotep III standing 18 metres tall on Luxor's west bank. They once guarded the entrance to his long-destroyed mortuary temple.",
      ar: "تمثالان حجريان ضخمان للفرعون أمنحوتب الثالث يبلغ ارتفاعهما 18 متراً على الضفة الغربية للأقصر. كانا يحرسان مدخل معبده الجنائزي الذي اندثر منذ زمن طويل.",
    },
    attractions: [
      { name: { en: "Colossi of Memnon", ar: "تمثالا ممنون" }, type: "historical", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 700, currency: "EGP",
    location: { type: "Point", coordinates: [32.6101, 25.7202] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/bd/Colossi_of_Memnon_May_2015.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/9/9a/Memnon_colossi_front.jpg",
      "http://upload.wikimedia.org/wikipedia/commons/0/06/Memnon_17.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/b/bd/Colossi_of_Memnon_May_2015.jpg",
  },
  {
    name: { en: "Deir el-Bahari", ar: "الدير البحري" },
    slug: "deir-el-bahari",
    city: "Luxor", region: "Upper Egypt", category: "historical",
    description: {
      en: "A complex of mortuary temples carved into dramatic cliffs on Luxor's west bank. Dominated by the stunning Temple of Hatshepsut, considered one of the finest surviving ancient Egyptian buildings.",
      ar: "مجمع من المعابد الجنائزية منحوت في جروف درامية على الضفة الغربية للأقصر. يهيمن عليه معبد حتشبسوت الرائع، الذي يُعدّ من أفضل المباني المصرية القديمة الباقية.",
    },
    attractions: [
      { name: { en: "Temple of Hatshepsut", ar: "معبد حتشبسوت" }, type: "historical", entryFee: 180 },
      { name: { en: "Temple of Mentuhotep II", ar: "معبد منتوحوتب الثاني" }, type: "historical", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 800, currency: "EGP",
    location: { type: "Point", coordinates: [32.6071, 25.7379] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/3/37/Deir_el-Bahri_2012.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/e/e4/Deir-El-Bahari_2005_cropped.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/3/37/Deir_el-Bahri_2012.jpg",
  },
  {
    name: { en: "Dendera Temple", ar: "معبد دندرة" },
    slug: "dendera-temple",
    city: "Luxor", region: "Upper Egypt", category: "historical",
    description: {
      en: "One of the best-preserved temples in Egypt, dedicated to the goddess Hathor. Famous for its extraordinary astronomical ceiling, the Dendera Zodiac, and well-preserved colours.",
      ar: "أحد أفضل المعابد المحفوظة في مصر، مكرّس للإلهة حتحور. مشهور بسقفه الفلكي الاستثنائي وبرج الدندرة والألوان المحفوظة بشكل جيد.",
    },
    attractions: [
      { name: { en: "Temple of Hathor", ar: "معبد حتحور" }, type: "historical", entryFee: 120 },
      { name: { en: "Dendera Zodiac", ar: "برج الدندرة" }, type: "historical", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 700, currency: "EGP",
    location: { type: "Point", coordinates: [32.6703, 26.1419] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/b3/Dendera3_d.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/cd/Dendera.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Dendera3_d.jpg",
  },

  // ─── Aswan ───────────────────────────────────────────────────────────────
  {
    name: { en: "Philae Temple", ar: "معبد فيلة" },
    slug: "philae-temple",
    city: "Aswan", region: "Upper Egypt", category: "historical",
    description: {
      en: "A stunning island temple complex dedicated to the goddess Isis. Relocated stone by stone to Agilkia Island in the 1970s to save it from the rising waters of Lake Nasser.",
      ar: "مجمع معابد جزيرة رائع مكرّس للإلهة إيزيس. أُعيد بناؤه حجراً بحجر إلى جزيرة أجيلكيا في السبعينيات لإنقاذه من ارتفاع مياه بحيرة ناصر.",
    },
    attractions: [
      { name: { en: "Temple of Isis", ar: "معبد إيزيس" }, type: "historical", entryFee: 180 },
      { name: { en: "Kiosk of Trajan", ar: "كشك تراجان" }, type: "historical", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February"],
    averageBudgetPerDay: 800, currency: "EGP",
    location: { type: "Point", coordinates: [32.8823, 24.0256] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/f/f3/2005-03-30_Urlaub_Aegypten_%28088%29.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/c/cc/%D9%85%D8%B9%D8%A8%D8%AF_%D8%AC%D8%B2%D9%8A%D8%B1%D8%A9_%D9%81%D9%8A%D9%84%D8%A9_01.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/f/f3/2005-03-30_Urlaub_Aegypten_%28088%29.jpg",
  },
  {
    name: { en: "Aswan High Dam", ar: "السد العالي" },
    slug: "aswan-high-dam",
    city: "Aswan", region: "Upper Egypt", category: "landmark",
    description: {
      en: "One of the world's largest embankment dams, built between 1960 and 1970. It controls the Nile's annual flood, generates hydroelectric power, and created the vast Lake Nasser.",
      ar: "أحد أكبر سدود الردم في العالم، بُني بين عامَي 1960 و1970. يتحكم في فيضان النيل السنوي ويولّد طاقة كهرومائية وخلق بحيرة ناصر الشاسعة.",
    },
    attractions: [
      { name: { en: "Aswan High Dam", ar: "السد العالي" }, type: "landmark", entryFee: 0 },
      { name: { en: "Soviet-Egyptian Friendship Monument", ar: "نصب الصداقة السوفيتية المصرية" }, type: "landmark", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February"],
    averageBudgetPerDay: 500, currency: "EGP",
    location: { type: "Point", coordinates: [32.8998, 23.9714] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/b4/By_ovedc_-_Aswan_High_Dam_-_08.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/b/b4/By_ovedc_-_Aswan_High_Dam_-_08.jpg",
  },
  {
    name: { en: "Qubbet el-Hawa", ar: "قبة الهوا" },
    slug: "qubbet-el-hawa",
    city: "Aswan", region: "Upper Egypt", category: "historical",
    description: {
      en: "A ridge on Aswan's west bank containing ancient rock-cut tombs of Old and Middle Kingdom noblemen. Offers sweeping views of the Nile and Elephantine Island.",
      ar: "حافة على الضفة الغربية لأسوان تحتوي على مقابر صخرية قديمة لنبلاء المملكة القديمة والوسطى. تطل بإطلالات واسعة على النيل وجزيرة الفنتين.",
    },
    attractions: [
      { name: { en: "Rock-cut Tombs", ar: "المقابر الصخرية" }, type: "historical", entryFee: 80 },
    ],
    bestMonths: ["October", "November", "December", "January", "February"],
    averageBudgetPerDay: 600, currency: "EGP",
    location: { type: "Point", coordinates: [32.8751, 24.0889] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/0/0b/Qubbet_el-Hawa.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/0/0b/Qubbet_el-Hawa.jpg",
  },

  // ─── Alexandria ───────────────────────────────────────────────────────────
  {
    name: { en: "Bibliotheca Alexandrina", ar: "مكتبة الإسكندرية" },
    slug: "bibliotheca-alexandrina",
    city: "Alexandria", region: "Mediterranean", category: "cultural",
    description: {
      en: "A modern architectural marvel and cultural centre built near the site of the legendary ancient Library of Alexandria. Houses millions of books, multiple museums, and a planetarium.",
      ar: "معجزة معمارية حديثة ومركز ثقافي بُني بالقرب من موقع مكتبة الإسكندرية القديمة الأسطورية. تضم ملايين الكتب ومتاحف متعددة ومتحف الكون.",
    },
    attractions: [
      { name: { en: "Main Reading Hall", ar: "قاعة القراءة الرئيسية" }, type: "cultural", entryFee: 70 },
      { name: { en: "Antiquities Museum", ar: "متحف الآثار" }, type: "museum", entryFee: 40 },
      { name: { en: "Planetarium", ar: "متحف الكون" }, type: "cultural", entryFee: 50 },
    ],
    bestMonths: ["April", "May", "June", "September", "October", "November"],
    averageBudgetPerDay: 700, currency: "EGP",
    location: { type: "Point", coordinates: [29.9090, 31.2085] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/0/0c/Space_in_bibliotheca_Alexandrina_02.jpg",
      "http://upload.wikimedia.org/wikipedia/commons/b/ba/GD-EG-BibAlex-Livraison_d%27une_statue.JPG",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Space_in_bibliotheca_Alexandrina_02.jpg",
  },
  {
    name: { en: "Citadel of Qaitbay", ar: "قلعة قايتباي" },
    slug: "citadel-of-qaitbay",
    city: "Alexandria", region: "Mediterranean", category: "historical",
    description: {
      en: "A 15th-century defensive fortress built on the exact site of the ancient Lighthouse of Alexandria — one of the Seven Wonders. Offers stunning views over the Mediterranean.",
      ar: "قلعة دفاعية من القرن الخامس عشر بُنيت على الموقع الدقيق لمنارة الإسكندرية القديمة — إحدى عجائب الدنيا السبع. تطل بإطلالات رائعة على البحر المتوسط.",
    },
    attractions: [
      { name: { en: "Citadel of Qaitbay", ar: "قلعة قايتباي" }, type: "historical", entryFee: 100 },
    ],
    bestMonths: ["April", "May", "June", "September", "October", "November"],
    averageBudgetPerDay: 600, currency: "EGP",
    location: { type: "Point", coordinates: [29.8851, 31.2137] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/c/ce/%D9%82%D9%84%D8%B9%D8%A9_%D9%82%D8%A7%D9%8A%D8%AA%D8%A8%D8%A7%D9%8A_-_5.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/a/ae/Cidadela_de_Qaitbay_17.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/0/0a/Bay_Citadel.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/c/ce/%D9%82%D9%84%D8%B9%D8%A9_%D9%82%D8%A7%D9%8A%D8%AA%D8%A8%D8%A7%D9%8A_-_5.jpg",
  },
  {
    name: { en: "Greco-Roman Museum", ar: "المتحف اليوناني الروماني" },
    slug: "greco-roman-museum",
    city: "Alexandria", region: "Mediterranean", category: "cultural",
    description: {
      en: "One of Egypt's most important archaeological museums displaying over 40,000 artifacts from the Ptolemaic and Roman periods including mummies, coins, terracotta figures, and sculptures.",
      ar: "أحد أهم المتاحف الأثرية في مصر، يعرض أكثر من 40,000 قطعة من العصرين البطلمي والروماني تشمل المومياوات والعملات وتماثيل التيراكوتا والمنحوتات.",
    },
    attractions: [
      { name: { en: "Greco-Roman Collection", ar: "المجموعة اليونانية الرومانية" }, type: "museum", entryFee: 60 },
    ],
    bestMonths: ["April", "May", "June", "September", "October", "November"],
    averageBudgetPerDay: 500, currency: "EGP",
    location: { type: "Point", coordinates: [29.9120, 31.1964] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/2/2a/Greco-Roman_Museum_Alexandria.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Greco-Roman_Museum_Alexandria.jpg",
  },

  // ─── Fayoum ───────────────────────────────────────────────────────────────
  {
    name: { en: "Wadi el-Rayan", ar: "وادي الريان" },
    slug: "wadi-el-rayan",
    city: "Fayoum", region: "Western Desert", category: "nature",
    description: {
      en: "A protected area in the Western Desert with two interconnected lakes and Egypt's only natural waterfalls. A haven for migratory birds and rare desert wildlife.",
      ar: "منطقة محمية في الصحراء الغربية بها بحيرتان مترابطتان وأوحيد شلالات طبيعية في مصر. ملجأ للطيور المهاجرة والحياة البرية الصحراوية النادرة.",
    },
    attractions: [
      { name: { en: "Wadi el-Rayan Waterfalls", ar: "شلالات وادي الريان" }, type: "nature", entryFee: 20 },
      { name: { en: "Upper & Lower Lakes", ar: "البحيرتان العليا والسفلى" }, type: "nature", entryFee: 0 },
      { name: { en: "Wadi el-Hitan (Whale Valley)", ar: "وادي الحيتان" }, type: "nature", entryFee: 30 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 500, currency: "EGP",
    location: { type: "Point", coordinates: [30.3918, 29.2542] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/8/85/Wadi_El_Raiyan.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/8/85/Wadi_El_Raiyan.jpg",
  },
  {
    name: { en: "Qasr Qarun", ar: "قصر قارون" },
    slug: "qasr-qarun",
    city: "Fayoum", region: "Western Desert", category: "historical",
    description: {
      en: "A well-preserved Ptolemaic temple dedicated to the crocodile god Sobek, located at the western tip of Lake Qarun. One of Fayoum's most atmospheric ancient sites.",
      ar: "معبد بطلمي محفوظ بشكل جيد مكرّس لإله التماسيح سوبك، يقع عند الطرف الغربي لبحيرة قارون. أحد أكثر مواقع الفيوم الأثرية القديمة أجواءً.",
    },
    attractions: [
      { name: { en: "Temple of Sobek", ar: "معبد سوبك" }, type: "historical", entryFee: 50 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 400, currency: "EGP",
    location: { type: "Point", coordinates: [30.4197, 29.5139] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/f/fa/Qasr_Karun.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Qasr_Karun.jpg",
  },

  // ─── Sinai ────────────────────────────────────────────────────────────────
  {
    name: { en: "Na'ama Bay", ar: "خليج نعمة" },
    slug: "naama-bay",
    city: "Sharm El-Sheikh", region: "Sinai", category: "beach",
    description: {
      en: "The vibrant heart of Sharm El-Sheikh — a crescent bay lined with resorts, restaurants, and dive centres. Crystal-clear waters with some of the world's most spectacular coral reefs.",
      ar: "القلب النابض لشرم الشيخ — خليج هلالي تصطف على جانبيه المنتجعات والمطاعم ومراكز الغوص. مياه صافية مع بعض أكثر الشعاب المرجانية روعةً في العالم.",
    },
    attractions: [
      { name: { en: "Na'ama Bay Beach", ar: "شاطئ خليج نعمة" }, type: "beach", entryFee: 0 },
      { name: { en: "Coral Reef Dive Sites", ar: "مواقع غوص الشعاب المرجانية" }, type: "nature", entryFee: 0 },
    ],
    bestMonths: ["March", "April", "May", "September", "October", "November"],
    averageBudgetPerDay: 1500, currency: "EGP",
    location: { type: "Point", coordinates: [34.3299, 27.9158] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/9/92/Sailboat_on_beach_at_Na%27ama_Bay.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/b2/%D0%A8%D0%B0%D1%80%D0%BC-%D1%8D%D0%BB%D1%8C-%D0%A8%D0%B5%D0%B9%D1%85_-_panoramio_%2843%29.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/9/92/Sailboat_on_beach_at_Na%27ama_Bay.jpg",
  },

  // ─── Red Sea ──────────────────────────────────────────────────────────────
  {
    name: { en: "Wadi el Gemal National Park", ar: "محمية وادي الجمال" },
    slug: "wadi-el-gemal",
    city: "Marsa Alam", region: "Red Sea", category: "nature",
    description: {
      en: "A vast coastal national park in southern Egypt protecting pristine coral reefs, seagrass beds, mangroves, hawksbill turtles, and dugongs in some of the clearest waters on Earth.",
      ar: "محمية طبيعية ساحلية شاسعة في جنوب مصر تحمي الشعاب المرجانية البكر ومروج الأعشاب البحرية والمانغروف وسلاحف منقار الصقر وخيول البحر في مياه من أصفى مياه الأرض.",
    },
    attractions: [
      { name: { en: "Wadi el Gemal Beach", ar: "شاطئ وادي الجمال" }, type: "beach", entryFee: 0 },
      { name: { en: "Snorkeling & Diving", ar: "الغطس والغوص" }, type: "nature", entryFee: 30 },
      { name: { en: "Mangrove Forest", ar: "غابة المانغروف" }, type: "nature", entryFee: 0 },
    ],
    bestMonths: ["March", "April", "May", "September", "October", "November"],
    averageBudgetPerDay: 1000, currency: "EGP",
    location: { type: "Point", coordinates: [35.1167, 24.5500] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/5/5b/Wadi_El_Gemal.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Wadi_El_Gemal.jpg",
  },

  // ─── Siwa ─────────────────────────────────────────────────────────────────
  {
    name: { en: "Siwa Oasis", ar: "واحة سيوة" },
    slug: "siwa-oasis",
    city: "Siwa", region: "Western Desert", category: "nature",
    description: {
      en: "A remote and magical oasis near the Libyan border, famous for its unique Berber culture, salt lakes, ancient Oracle Temple visited by Alexander the Great, and stunning Great Sand Sea.",
      ar: "واحة نائية وساحرة قرب الحدود الليبية، مشهورة بثقافتها البربرية الفريدة والبحيرات الملحية ومعبد الأوراكل القديم الذي زاره الإسكندر الأكبر وبحر الرمال العظيم الخلّاب.",
    },
    attractions: [
      { name: { en: "Oracle Temple", ar: "معبد الأوراكل" }, type: "historical", entryFee: 60 },
      { name: { en: "Shali Fortress", ar: "قلعة شالي" }, type: "historical", entryFee: 0 },
      { name: { en: "Cleopatra's Bath", ar: "حمام كليوباترا" }, type: "nature", entryFee: 0 },
      { name: { en: "Great Sand Sea", ar: "بحر الرمال العظيم" }, type: "adventure", entryFee: 0 },
    ],
    bestMonths: ["October", "November", "December", "January", "February", "March"],
    averageBudgetPerDay: 600, currency: "EGP",
    location: { type: "Point", coordinates: [25.5195, 29.2031] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/bf/Siwa_oasis_-_Egypt.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/b/bb/Siwa_general_view.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/b/bf/Siwa_oasis_-_Egypt.jpg",
  },

  // ─── Delta ────────────────────────────────────────────────────────────────
  {
    name: { en: "Ras El Bar", ar: "رأس البر" },
    slug: "ras-el-bar",
    city: "Damietta", region: "Delta", category: "beach",
    description: {
      en: "A scenic peninsula at the mouth of the Nile where the river meets the Mediterranean. Popular with Egyptian families for its unique freshwater-saltwater beaches and peaceful atmosphere.",
      ar: "شبه جزيرة خلّابة عند مصبّ النيل حيث يلتقي النهر بالبحر المتوسط. تحبّها الأسر المصرية لشواطئها الفريدة التي تمزج بين المياه العذبة والمالحة وأجوائها الهادئة.",
    },
    attractions: [
      { name: { en: "Ras El Bar Beach", ar: "شاطئ رأس البر" }, type: "beach", entryFee: 0 },
      { name: { en: "Nile-Mediterranean Meeting Point", ar: "ملتقى النيل والبحر المتوسط" }, type: "landmark", entryFee: 0 },
    ],
    bestMonths: ["May", "June", "July", "August", "September"],
    averageBudgetPerDay: 400, currency: "EGP",
    location: { type: "Point", coordinates: [31.8333, 31.4833] },
    images: [
      "https://upload.wikimedia.org/wikipedia/commons/b/b3/Ras_El_Bar.jpg",
    ],
    coverImage: "https://upload.wikimedia.org/wikipedia/commons/b/b3/Ras_El_Bar.jpg",
  },
];

// ─── Seeder function ─────────────────────────────────────────────────────────
export const seedDestinations = async () => {
  const count = await DestinationModel.countDocuments();
  if (count > 0) {
    console.log
      (`[Seed] Destinations already seeded (${count} records) — skipping`);
    return;
  }

  console.log
    ("[Seed] Seeding destinations...");
  const inserted = await DestinationModel.insertMany(DESTINATIONS_DATA);
  console.log
    (`✅ Destinations seeded: ${inserted.length} records across ${[...new Set(inserted.map((d) => d.city))].length
      } cities`);

  // Index destinations in Pinecone for RAG
  try {
    const docsToIndex = inserted.map((doc, index) => ({
      id: `dest_${doc._id}`,
      text: buildIndexText("destination", doc),
      metadata: {
        _id: doc._id.toString(),
        name: doc.name,
        city: doc.city,
        region: doc.region,
        category: doc.category,
        slug: doc.slug
      }
    }));

    await upsertDocuments(docsToIndex);
    console.log(`[Seed] Indexed ${docsToIndex.length} destinations in Pinecone`);
  } catch (error) {
    console.warn(`[Seed] Failed to index destinations in Pinecone: ${error.message}`);
    // Continue anyway - seeding is successful even if Pinecone fails
  }

  return inserted;
}
