/**
 * Multi-lingual Zone-Aware Localization Engine
 * - South India Zone: Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), English
 * - Non-South Zones (North, West, East, All): Hindi (हिन्दी), English
 */

import { RegionId } from "./sim/network";

export type SupportedLanguage = "en" | "kn" | "ta" | "te" | "ml" | "hi";

export interface LanguageInfo {
  id: SupportedLanguage;
  name: string;
  nativeName: string;
  zone: "south" | "other" | "all";
  flag: string;
}

export const LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
  en: { id: "en", name: "English", nativeName: "English", zone: "all", flag: "🌐" },
  kn: { id: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", zone: "south", flag: "🇮🇳" },
  ta: { id: "ta", name: "Tamil", nativeName: "தமிழ்", zone: "south", flag: "🇮🇳" },
  te: { id: "te", name: "Telugu", nativeName: "తెలుగు", zone: "south", flag: "🇮🇳" },
  ml: { id: "ml", name: "Malayalam", nativeName: "മലയാളം", zone: "south", flag: "🇮🇳" },
  hi: { id: "hi", name: "Hindi", nativeName: "हिन्दी", zone: "other", flag: "🇮🇳" },
};

/**
 * Returns available languages based on active India zone
 * - South: Kannada, Tamil, Telugu, Malayalam, English
 * - Other zones (North, West, East, All): Hindi, English (plus regional options)
 */
export function getLanguagesForZone(zone: RegionId = "all"): LanguageInfo[] {
  if (zone === "south") {
    return [
      LANGUAGES.en,
      LANGUAGES.kn,
      LANGUAGES.ta,
      LANGUAGES.te,
      LANGUAGES.ml,
    ];
  }
  // Other than South (North, West, East, All): Hindi is the primary Indian language!
  return [
    LANGUAGES.en,
    LANGUAGES.hi,
    LANGUAGES.kn,
    LANGUAGES.ta,
    LANGUAGES.te,
    LANGUAGES.ml,
  ];
}

/**
 * Automatically determine best initial language based on truck or regional division
 */
export function getDefaultLanguageForTruck(originState?: string, region: RegionId = "south"): SupportedLanguage {
  if (region === "south") {
    if (originState === "Karnataka") return "kn";
    if (originState === "Tamil Nadu") return "ta";
    if (originState === "Telangana" || originState === "Andhra Pradesh") return "te";
    if (originState === "Kerala") return "ml";
    return "kn";
  }
  // All other regions (North, West, East) default to Hindi
  return "hi";
}

export interface I18nDictionary {
  // Navigation
  controlRoom: string;
  impact: string;
  reportIssue: string;
  howItWorks: string;
  simulation: string;
  regionalDivision: string;

  // Zones
  allIndia: string;
  southIndia: string;
  northIndia: string;
  westIndia: string;
  eastIndia: string;

  // Driver Cockpit
  liveInCabTerminal: string;
  backToControlRoom: string;
  selectTruck: string;
  reCenterTruck: string;
  detourActive: string;
  onSchedule: string;
  directiveHeadlineFallback: string;
  directiveProceedFallback: string;
  routeModificationDirective: string;
  corridorOperational: string;
  audibleAlert: string;
  nextInterchange: string;
  remainingTime: string;
  expectedEta: string;
  routeCompletion: string;
  completed: string;
  safeDetour: string;
  standardSpeed: string;
  coldChainTelemetry: string;
  stable: string;
  batteryReserve: string;
  confirmAlternateRoute: string;
  routeConfirmed: string;
  reportRoadHazard: string;
  callDispatchDesk: string;
  activeCorridor: string;
  speed: string;
  heading: string;
  division: string;
  plate: string;
  driver: string;
  safe: string;

  // Statuses
  inTransit: string;
  rerouted: string;
  delayed: string;
  held: string;
  delivered: string;
}

export const TRANSLATIONS: Record<SupportedLanguage, I18nDictionary> = {
  en: {
    controlRoom: "Control room",
    impact: "Impact",
    reportIssue: "Report an issue",
    howItWorks: "How it works",
    simulation: "Simulation",
    regionalDivision: "Regional Division",

    allIndia: "All India",
    southIndia: "South India",
    northIndia: "North India",
    westIndia: "West India",
    eastIndia: "East India",

    liveInCabTerminal: "Live In-Cab Terminal",
    backToControlRoom: "Back to Control Room",
    selectTruck: "Select Truck",
    reCenterTruck: "Re-Center Truck",
    detourActive: "DETOUR ACTIVE",
    onSchedule: "ON SCHEDULE",
    directiveHeadlineFallback: "Divert via Safe Alternate Bypass",
    directiveProceedFallback: "Proceed along Primary Assigned Corridor",
    routeModificationDirective: "Live Route Modification Directive",
    corridorOperational: "Corridor Operational",
    audibleAlert: "Audible Alert",
    nextInterchange: "Next Interchange",
    remainingTime: "Remaining Time",
    expectedEta: "Expected ETA",
    routeCompletion: "Route Completion",
    completed: "Completed",
    safeDetour: "+65m Safe Detour",
    standardSpeed: "Standard Speed",
    coldChainTelemetry: "Cold Chain Telemetry",
    stable: "STABLE",
    batteryReserve: "Battery Reserve",
    confirmAlternateRoute: "I Understand & Confirm Alternate Route",
    routeConfirmed: "Route Confirmed ✓",
    reportRoadHazard: "Report Road Hazard Ahead",
    callDispatchDesk: "Call Dispatch Desk",
    activeCorridor: "Active Corridor",
    speed: "Speed",
    heading: "Heading",
    division: "Division",
    plate: "Plate",
    driver: "Driver",
    safe: "SAFE",

    inTransit: "In Transit",
    rerouted: "Relocated (Detour)",
    delayed: "Hazard Alert",
    held: "Staged / Held",
    delivered: "Delivered",
  },

  kn: {
    controlRoom: "ನಿಯಂತ್ರಣ ಕೊಠಡಿ",
    impact: "ಪರಿಣಾಮ ವಿಶ್ಲೇಷಣೆ",
    reportIssue: "ರಸ್ತೆ ಸಮಸ್ಯೆ ವರದಿ",
    howItWorks: "ಕಾರ್ಯವಿಧಾನ",
    simulation: "ಸಿಮ್ಯುಲೇಶನ್",
    regionalDivision: "ವಲಯ ವಿಭಾಗ",

    allIndia: "ಅಖಿಲ ಭಾರತ",
    southIndia: "ದಕ್ಷಿಣ ಭಾರತ",
    northIndia: "ಉತ್ತರ ಭಾರತ",
    westIndia: "ಪಶ್ಚಿಮ ಭಾರತ",
    eastIndia: "ಪೂರ್ವ ಭಾರತ",

    liveInCabTerminal: "ಲೈವ್ ಕ್ಯಾಬ್ ಟರ್ಮಿನಲ್",
    backToControlRoom: "ನಿಯಂತ್ರಣ ಕೊಠಡಿಗೆ ಹಿಂತಿರುಗಿ",
    selectTruck: "ಟ್ರಕ್ ಆಯ್ಕೆಮಾಡಿ",
    reCenterTruck: "ಟ್ರಕ್ ಕೇಂದ್ರಬಿಂದುಗೊಳಿಸಿ",
    detourActive: "ಪರ್ಯಾಯ ಮಾರ್ಗ ಸಕ್ರಿಯ",
    onSchedule: "ನಿಗದಿತ ಸಮಯದಲ್ಲಿದೆ",
    directiveHeadlineFallback: "ಸುರಕ್ಷಿತ ಪರ್ಯಾಯ ಬೈಪಾಸ್ ಮೂಲಕ ಮುಂದುವರಿಯಿರಿ",
    directiveProceedFallback: "ಪ್ರಾಥಮಿಕ ನಿಯೋಜಿತ ಹೆದ್ದಾರಿಯಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ",
    routeModificationDirective: "ಲೈವ್ ಮಾರ್ಗ ಬದಲಾವಣೆ ನಿರ್ದೇಶನ",
    corridorOperational: "ರಸ್ತೆ ಸಂಚಾರ ಮುಕ್ತವಾಗಿದೆ",
    audibleAlert: "ಧ್ವನಿ ಎಚ್ಚರಿಕೆ",
    nextInterchange: "ಮುಂದಿನ ಜಂಕ್ಷನ್",
    remainingTime: "ಉಳಿದ ಸಮಯ",
    expectedEta: "ನಿರೀಕ್ಷಿತ ಆಗಮನ ಸಮಯ",
    routeCompletion: "ಪ್ರಯಾಣ ಪ್ರಗತಿ",
    completed: "ಪೂರ್ಣಗೊಂಡಿದೆ",
    safeDetour: "+65 ನಿಮಿಷ ಸುರಕ್ಷಿತ ಪರ್ಯಾಯ ಮಾರ್ಗ",
    standardSpeed: "ಸಾಮಾನ್ಯ ವೇಗ",
    coldChainTelemetry: "ಕೋಲ್ಡ್ ಚೈನ್ ತಾಪಮಾನ",
    stable: "ಸ್ಥಿರವಾಗಿದೆ",
    batteryReserve: "ಬ್ಯಾಟರಿ ಮೀಸಲು",
    confirmAlternateRoute: "ಪರ್ಯಾಯ ಮಾರ್ಗವನ್ನು ಒಪ್ಪಿ ದೃಢೀಕರಿಸಿ",
    routeConfirmed: "ಮಾರ್ಗ ದೃಢೀಕರಿಸಲಾಗಿದೆ ✓",
    reportRoadHazard: "ಮುಂದಿನ ರಸ್ತೆ ಅಪಾಯ ವರದಿ ಮಾಡಿ",
    callDispatchDesk: "ನಿಯಂತ್ರಣ ಡೆಸ್ಕ್‌ಗೆ ಕರೆ ಮಾಡಿ",
    activeCorridor: "ಸಕ್ರಿಯ ಕಾರಿಡಾರ್",
    speed: "ವೇಗ",
    heading: "ಗಮ್ಯಸ್ಥಾನ",
    division: "ವಿಭಾಗ",
    plate: "ನಂಬರ್ ಪ್ಲೇಟ್",
    driver: "ಚಾಲಕ",
    safe: "ಸುರಕ್ಷಿತ",

    inTransit: "ಪ್ರಯಾಣದಲ್ಲಿದೆ",
    rerouted: "ಪರ್ಯಾಯ ಮಾರ್ಗ ಬದಲಾವಣೆ",
    delayed: "ಅಪಾಯ ಎಚ್ಚರಿಕೆ",
    held: "ತಡೆಹಿಡಿಯಲಾಗಿದೆ / ಸಿದ್ಧ",
    delivered: "ತಲುಪಿಸಲಾಗಿದೆ",
  },

  ta: {
    controlRoom: "கட்டுப்பாட்டு அறை",
    impact: "தாக்க மதிப்பீடு",
    reportIssue: "சாலை சிக்கல் அறிக்கை",
    howItWorks: "செயல்முறை",
    simulation: "மாதிரி உருவகப்படுத்துதல்",
    regionalDivision: "மண்டல பிரிவு",

    allIndia: "அனைத்து இந்தியா",
    southIndia: "தென் இந்தியா",
    northIndia: "வட இந்தியா",
    westIndia: "மேற்கு இந்தியா",
    eastIndia: "கிழக்கு இந்தியா",

    liveInCabTerminal: "நேரலை கேபின் முனையம்",
    backToControlRoom: "கட்டுப்பாட்டு அறைக்கு திரும்பு",
    selectTruck: "லாரியைத் தேர்ந்தெடுக்கவும்",
    reCenterTruck: "லாரியை மையப்படுத்து",
    detourActive: "மாற்றுப் பாதை இயக்கத்தில்",
    onSchedule: "சரியான நேரத்தில்",
    directiveHeadlineFallback: "பாதுகாப்பான மாற்றுப் பாதை வழியாக செல்லவும்",
    directiveProceedFallback: "முதன்மை ஒதுக்கப்பட்ட பாதையில் தொடரவும்",
    routeModificationDirective: "நேரலை பாதை மாற்ற உத்தரவு",
    corridorOperational: "பாதை சீராக இயங்குகிறது",
    audibleAlert: "ஒலி எச்சரிக்கை",
    nextInterchange: "அடுத்த சந்திப்பு",
    remainingTime: "மீதமுள்ள நேரம்",
    expectedEta: "வருகை நேரம் (ETA)",
    routeCompletion: "பயண முன்னேற்றம்",
    completed: "நிறைவுற்றது",
    safeDetour: "+65 நிமிடம் பாதுகாப்பான மாற்றுப் பாதை",
    standardSpeed: "வழக்கமான வேகம்",
    coldChainTelemetry: "குளிர்பதன நிலை",
    stable: "நிலையானது",
    batteryReserve: "பேட்டரி இருப்பு",
    confirmAlternateRoute: "மாற்றுப் பாதையை உறுதிசெய்கிறேன்",
    routeConfirmed: "பாதை உறுதிசெய்யப்பட்டது ✓",
    reportRoadHazard: "சாலை ஆபத்தை புகாரளிக்கவும்",
    callDispatchDesk: "கட்டுப்பாட்டு மையத்தை அழைக்கவும்",
    activeCorridor: "செயலில் உள்ள பாதை",
    speed: "வேகம்",
    heading: "இலக்கு",
    division: "பிரிவு",
    plate: "வண்டி எண்",
    driver: "ஓட்டுநர்",
    safe: "பாதுகாப்பானது",

    inTransit: "பயணத்தில்",
    rerouted: "மாற்றுப் பாதை",
    delayed: "ஆபத்து எச்சரிக்கை",
    held: "நிறுத்தப்பட்டுள்ளது",
    delivered: "டெலிவரி செய்யப்பட்டது",
  },

  te: {
    controlRoom: "కంట్రోల్ రూమ్",
    impact: "ప్రభావ విశ్లేషణ",
    reportIssue: "రహదారి సమస్య నివేదిక",
    howItWorks: "ఇది ఎలా పనిచేస్తుంది",
    simulation: "సిమ్యులేషన్",
    regionalDivision: "ప్రాంతీయ విభాగం",

    allIndia: "అఖిల భారతదేశం",
    southIndia: "దక్షిణ భారతదేశం",
    northIndia: "ఉత్తర భారతదేశం",
    westIndia: "పశ్చిమ భారతదేశం",
    eastIndia: "తూర్పు భారతదేశం",

    liveInCabTerminal: "లైవ్ క్యాబిన్ టెర్మినల్",
    backToControlRoom: "కంట్రోల్ రూమ్‌కు తిరిగి వెళ్ళండి",
    selectTruck: "ట్రక్కును ఎంచుకోండి",
    reCenterTruck: "ట్రక్కును రీ-సెంటర్ చేయండి",
    detourActive: "ప్రత్యామ్నాయ మార్గం యాక్టివ్",
    onSchedule: "సమయానికి నడుస్తోంది",
    directiveHeadlineFallback: "సురక్షిత ప్రత్యామ్నాయ బైపాస్ ద్వారా మళ్లించండి",
    directiveProceedFallback: "ప్రాథమిక కేటాయించిన రహదారిపై కొనసాగండి",
    routeModificationDirective: "లైవ్ రూట్ మార్పు ఆదేశం",
    corridorOperational: "రహదారి సురక్షితంగా ఉంది",
    audibleAlert: "వాయిస్ హెచ్చరిక",
    nextInterchange: "తదుపరి జంక్షన్",
    remainingTime: "మిగిలిన సమయం",
    expectedEta: "చేరుకునే సమయం (ETA)",
    routeCompletion: "మార్గం పురోగతి",
    completed: "పూర్తయింది",
    safeDetour: "+65 నిమిషాల సురక్షిత ప్రత్యామ్నాయం",
    standardSpeed: "సాధారణ వేగం",
    coldChainTelemetry: "కోల్డ్ చైన్ ఉష్ణోగ్రత",
    stable: "స్థిరంగా ఉంది",
    batteryReserve: "బ్యాటరీ రిజర్వ్",
    confirmAlternateRoute: "ప్రత్యామ్నాయ మార్గాన్ని నిర్ధారిస్తున్నాను",
    routeConfirmed: "మార్గం నిర్ధారించబడింది ✓",
    reportRoadHazard: "ముందున్న ప్రమాదాన్ని నివేదించండి",
    callDispatchDesk: "డిస్పాచ్ డెస్క్‌కు కాల్ చేయండి",
    activeCorridor: "యాక్టివ్ కారిడార్",
    speed: "వేగం",
    heading: "గమ్యం",
    division: "విభాగం",
    plate: "నంబర్ ప్లేట్",
    driver: "డ్రైవర్",
    safe: "సురక్షితం",

    inTransit: "ప్రయాణంలో",
    rerouted: "మార్గం మళ్లించబడింది",
    delayed: "ప్రమాద హెచ్చరిక",
    held: "నిలిపివేయబడింది",
    delivered: "చేరవేయబడింది",
  },

  ml: {
    controlRoom: "കൺട്രോൾ റൂം",
    impact: "പ്രത്യാഘാത വിശകലനം",
    reportIssue: "റോഡ് തടസ്സം റിപ്പോർട്ട് ചെയ്യുക",
    howItWorks: "പ്രവർത്തന രീതി",
    simulation: "സിമുലേഷൻ",
    regionalDivision: "മേഖലാ വിഭാഗം",

    allIndia: "അഖിലേന്ത്യാ",
    southIndia: "ദക്ഷിണേന്ത്യ",
    northIndia: "ഉത്തരേന്ത്യ",
    westIndia: "പശ്ചിമേന്ത്യ",
    eastIndia: "കിഴക്കൻ ഇന്ത്യ",

    liveInCabTerminal: "ലൈവ് ക്യാബിൻ ടെർമിനൽ",
    backToControlRoom: "കൺട്രോൾ റൂമിലേക്ക് മടങ്ങുക",
    selectTruck: "ട്രക്ക് തിരഞ്ഞെടുക്കുക",
    reCenterTruck: "ട്രക്ക് കേന്ദ്രീകരിക്കുക",
    detourActive: "ബദൽ റൂട്ട് സജീവം",
    onSchedule: "കൃത്യസമയത്ത്",
    directiveHeadlineFallback: "സുരക്ഷിതമായ ബദൽ ബൈപാസ് വഴി തിരിയുക",
    directiveProceedFallback: "നിശ്ചിത പ്രധാന പാതയിലൂടെ യാത്ര തുടരുക",
    routeModificationDirective: "ലൈവ് റൂട്ട് മാറ്റ നിർദ്ദേശം",
    corridorOperational: "പാത സുഗമമാണ്",
    audibleAlert: "ശബ്ദ മുന്നറിയിപ്പ്",
    nextInterchange: "അടുത്ത ജംഗ്ഷൻ",
    remainingTime: "ബാക്കി സമയം",
    expectedEta: "പ്രതീക്ഷിക്കുന്ന സമയം (ETA)",
    routeCompletion: "യാത്രാ പുരോഗതി",
    completed: "പൂർത്തിയായി",
    safeDetour: "+65 മിനിറ്റ് സുരക്ഷിത ബദൽ പാത",
    standardSpeed: "സാധാരണ വേഗത",
    coldChainTelemetry: "കോൾഡ് ചെയിൻ ടെലിമെട്രി",
    stable: "സുസ്ഥിരം",
    batteryReserve: "ബാറ്ററി റിസർവ്",
    confirmAlternateRoute: "ബദൽ റൂട്ട് ഞാൻ സ്ഥിരീകരിക്കുന്നു",
    routeConfirmed: "റൂട്ട് സ്ഥിരീകരിച്ചു ✓",
    reportRoadHazard: "റോഡിലെ അപകടാവസ്ഥ അറിയിക്കുക",
    callDispatchDesk: "കൺട്രോൾ ഡെസ്കിലേക്ക് വിളിക്കുക",
    activeCorridor: "സജീവ പാത",
    speed: "വേഗത",
    heading: "ദിശ",
    division: "മേഖല",
    plate: "വാഹന നമ്പർ",
    driver: "ഡ്രൈവർ",
    safe: "സുരക്ഷിതം",

    inTransit: "യാത്രയിലാണ്",
    rerouted: "റൂട്ട് മാറ്റി (Detour)",
    delayed: "അപകട മുന്നറിയിപ്പ്",
    held: "തടഞ്ഞുവെച്ചിരിക്കുന്നു",
    delivered: "ഡെലിവറി ചെയ്തു",
  },

  hi: {
    controlRoom: "कंट्रोल रूम",
    impact: "प्रभाव विश्लेषण",
    reportIssue: "सड़क समस्या रिपोर्ट करें",
    howItWorks: "यह कैसे काम करता है",
    simulation: "सिमुलेशन",
    regionalDivision: "क्षेत्रीय प्रभाग",

    allIndia: "अखिल भारत",
    southIndia: "दक्षिण भारत",
    northIndia: "उत्तर भारत",
    westIndia: "पश्चिम भारत",
    eastIndia: "पूर्व भारत",

    liveInCabTerminal: "लाइव इन-कैब टर्मिनल",
    backToControlRoom: "कंट्रोल रूम में वापस जाएं",
    selectTruck: "ट्रक चुनें",
    reCenterTruck: "ट्रक को पुनः केंद्रित करें",
    detourActive: "वैकल्पिक मार्ग सक्रिय",
    onSchedule: "समय पर",
    directiveHeadlineFallback: "सुरक्षित वैकल्पिक बाईपास मार्ग लें",
    directiveProceedFallback: "प्राथमिक आवंटित कॉरिडोर पर आगे बढ़ें",
    routeModificationDirective: "लाइव मार्ग संशोधन निर्देश",
    corridorOperational: "कॉरिडोर सुचारू रूप से चालू है",
    audibleAlert: "ध्वनि चेतावनी",
    nextInterchange: "अगला जंक्शन",
    remainingTime: "शेष समय",
    expectedEta: "अपेक्षित आगमन समय (ETA)",
    routeCompletion: "मार्ग पूर्णता",
    completed: "पूर्ण हुआ",
    safeDetour: "+65 मिनट सुरक्षित बाईपास",
    standardSpeed: "मानक गति",
    coldChainTelemetry: "कोल्ड चेन टेलीमेट्री",
    stable: "स्थिर",
    batteryReserve: "बैटरी रिज़र्व",
    confirmAlternateRoute: "मैं वैकल्पिक मार्ग की पुष्टि करता हूँ",
    routeConfirmed: "मार्ग की पुष्टि हो गई ✓",
    reportRoadHazard: "आगे सड़क खतरे की रिपोर्ट करें",
    callDispatchDesk: "डिस्पैच डेस्क को कॉल करें",
    activeCorridor: "सक्रिय कॉरिडोर",
    speed: "गति",
    heading: "दिशा",
    division: "प्रभाग",
    plate: "नंबर प्लेट",
    driver: "चालक",
    safe: "सुरक्षित",

    inTransit: "मार्ग में",
    rerouted: "पुनर्निर्देशित (बाईपास)",
    delayed: "खतरा चेतावनी",
    held: "रोका गया / तैयार",
    delivered: "वितरित",
  },
};

/**
 * Translates dynamic route instruction headline into chosen regional language
 */
export function getLocalizedHeadline(
  headline: string,
  lang: SupportedLanguage,
  isRerouted: boolean,
  alternateVia?: string,
  isEscalated?: boolean
): string {
  if (isEscalated) {
    switch (lang) {
      case "kn":
        return "ಮುಂದಿನ ರಸ್ತೆ ಬಂದ್: ರವಾನೆದಾರರ ಸೂಚನೆಗೆ ನಿರೀಕ್ಷಿಸಿ";
      case "ta":
        return "பாதை அடைப்பு: கட்டுப்பாட்டு அறை அனுமதியை எதிர்பார்க்கவும்";
      case "te":
        return "రహదారి మూసివేయబడింది: డిస్పాచర్ క్లియరెన్స్ కోసం వేచి ఉండండి";
      case "ml":
        return "പാത തടസ്സപ്പെട്ടു: കൺട്രോൾ റൂം അനുമതിക്കായി കാത്തിരിക്കുക";
      case "hi":
        return "कॉरिडोर अवरुद्ध: डिस्पैचर क्लीयरेंस की प्रतीक्षा करें";
      default:
        return "Corridor Impassable: Await Dispatch Clearance";
    }
  }

  if (!isRerouted) {
    return TRANSLATIONS[lang].directiveProceedFallback;
  }

  if (alternateVia && alternateVia.includes("Madikeri")) {
    switch (lang) {
      case "kn":
        return "ಮೈಸೂರು / ಮಡಿಕೇರಿ ಮಾರ್ಗವನ್ನು (SH88) ತೆಗೆದುಕೊಳ್ಳಿ";
      case "ta":
        return "மைசூர் / மடிகேரி வழியைப் (SH88) பயன்படுத்தவும்";
      case "te":
        return "మైసూర్ / మడికేరి మార్గాన్ని (SH88) ఎంచుకోండి";
      case "ml":
        return "മൈസൂരു / മടിക്കേരി റൂട്ട് (SH88) സ്വീകരിക്കുക";
      case "hi":
        return "मैसूरु / मदिकेरी मार्ग (SH88 बाईपास) लें";
      default:
        return "Take the Mysuru / Madikeri Route (SH88)";
    }
  }

  if (alternateVia) {
    switch (lang) {
      case "kn":
        return `${alternateVia} ಮೂಲಕ ತಿರುಗಿ (ಸುರಕ್ಷಿತ ಬೈಪಾಸ್)`;
      case "ta":
        return `${alternateVia} வழியாக செல்லவும் (பாதுகாப்பான மாற்று)`;
      case "te":
        return `${alternateVia} ద్వారా మళ్లించండి (సురక్షిత బైపాస్)`;
      case "ml":
        return `${alternateVia} വഴി തിരിയുക (സുരക്ഷിത ബൈപാസ്)`;
      case "hi":
        return `${alternateVia} के माध्यम से मुड़ें (सुरक्षित बाईपास)`;
      default:
        return `Divert via ${alternateVia}`;
    }
  }

  return TRANSLATIONS[lang].directiveHeadlineFallback;
}

/**
 * Translates audible alert text for in-cab speech broadcast
 */
export function getLocalizedAudibleAlert(
  driverMessage: string,
  lang: SupportedLanguage,
  isRerouted: boolean,
  isEscalated?: boolean
): string {
  if (isEscalated) {
    switch (lang) {
      case "kn":
        return "ಗಮನಿಸಿ: ಮುಂದಿನ ಎಲ್ಲಾ ಮಾರ್ಗಗಳು ಮುಚ್ಚಲ್ಪಟ್ಟಿವೆ. ವಾಹನವನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ನಿಲ್ಲಿಸಿ ಕಂಟ್ರೋಲ್ ರೂಂ ಸಂಪರ್ಕಿಸಿ.";
      case "ta":
        return "கவனம்: பாதை துண்டிக்கப்பட்டுள்ளது. வண்டியை பாதுகாப்பாக நிறுத்தி கட்டுப்பாட்டு அறையை தொடர்பு கொள்ளவும்.";
      case "te":
        return "గమనిక: ముందస్తు మార్గాలు మూసివేయబడ్డాయి. సురక్షిత ప్రదేశంలో ఆపి డిస్పాచర్ క్లియరెన్స్ కోసం వేచి ఉండండి.";
      case "ml":
        return "ശ്രദ്ധിക്കുക: മുൻപിലെ എല്ലാ പാതകളും തടസ്സപ്പെട്ടു. വാഹനം സുരಕ್ಷിതമായി നിർത്തി കൺട്രോൾ റൂം ബന്ധപ്പെടുക.";
      case "hi":
        return "ध्यान दें: आगे के सभी मार्ग अवरुद्ध हैं। वाहन को सुरक्षित स्थान पर रोकें और डिस्पैचर से संपर्क करें।";
      default:
        return "ATTENTION: All corridors impassable. Pull over safely and standby for dispatcher.";
    }
  }

  if (!isRerouted) {
    switch (lang) {
      case "kn":
        return "ಎಲ್ಲವೂ ಸ್ಪಷ್ಟವಾಗಿದೆ: ಸಾಮಾನ್ಯ ವೇಗದಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ.";
      case "ta":
        return "பாதை சீரானது: வழக்கமான வேகத்தில் தொடரவும்.";
      case "te":
        return "అంతా స్పష్టంగా ఉంది: సాధారణ వేగంతో కొనసాగండి.";
      case "ml":
        return "പാത സുഗമമാണ്: സാധാരണ വേഗതയിൽ തുടരുക.";
      case "hi":
        return "मार्ग साफ है: सामान्य गति बनाए रखें।";
      default:
        return "ALL CLEAR: Maintain steady cruising speed.";
    }
  }

  switch (lang) {
    case "kn":
      return "ಎಚ್ಚರಿಕೆ: ಪ್ರಾಥಮಿಕ ಹೆದ್ದಾರಿ ಬಂದ್ ಆಗಿದೆ. ತಕ್ಷಣವೇ ಜಿಪಿಎಸ್ ಪರ್ಯಾಯ ಮಾರ್ಗವನ್ನು ಅನುಸರಿಸಿ.";
    case "ta":
      return "எச்சரிக்கை: முதன்மை பாதை மூடப்பட்டுள்ளது. உடனடியாக மாற்று ஜிபிஎஸ் பாதையை பின்பற்றவும்.";
    case "te":
      return "హెచ్చరిక: ప్రధాన రహదారి మూసివేయబడింది. వెంటనే ప్రత్యామ్నాయ జిపిఎస్ మార్గాన్ని అనుసరించండి.";
    case "ml":
      return "മുന്നറിയിപ്പ്: പ്രധാന പാതയിൽ തടസ്സം. ഉടൻ തന്നെ ബദൽ ജിപിഎസ് റൂട്ട് പിന്തുടരുക.";
    case "hi":
      return "चेतावनी: प्राथमिक कॉरिडोर बंद है। कृपया तुरंत वैकल्पिक जीपीएस मार्ग का पालन करें।";
    default:
      return "RELOCATION ADVISORY: Divert immediately to safe alternate bypass corridor.";
  }
}
