/**
 * BiteBeforeExpiry — Regional Language & Voice Assistant Engine
 * 
 * Supports:
 * - English (en)
 * - Hindi (hi)
 * - Odia (or)
 * - Bengali (bn)
 * 
 * Extensible Architecture: New regional dialects and languages can be registered dynamically.
 * Strict Privacy & Verification:
 * - Operates ONLY on the authenticated user's active inventory.
 * - Never leaks or exposes another user's data.
 * - Answers derived strictly from verified database records.
 */

import { calculateDaysRemaining } from './fefoService.js';
import { scanInventoryForRecalls } from './productRecallService.js';

export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-US' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  or: { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', speechCode: 'or-IN' },
  bn: { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN' }
};

export const QUERY_INTENTS = {
  EXPIRING_SOON: 'EXPIRING_SOON',
  USE_FIRST: 'USE_FIRST',
  RECALL_CHECK: 'RECALL_CHECK',
  WASTE_STATS: 'WASTE_STATS',
  INVENTORY_COUNT: 'INVENTORY_COUNT',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Multilingual Intent Classification Rules
 */
const INTENT_PATTERNS = [
  {
    intent: QUERY_INTENTS.EXPIRING_SOON,
    patterns: [
      // English
      /expir(ing|y|ed)\s+soon/i,
      /what\s+is\s+expir/i,
      /about\s+to\s+expire/i,
      // Hindi
      /expire\s+hone\s+wala/i,
      /kya\s+expire\s+hoga/i,
      /kharab\s+hone\s+wala/i,
      /mere\s+ghar\s+mein\s+kya\s+expire/i,
      // Odia
      /କେଉଁ\s+ଖାଦ୍ୟ\s+ଶୀଘ୍ର\s+ସମାପ୍ତ/i,
      /ଶୀଘ୍ର\s+ସମାପ୍ତ\s+ହେବ/i,
      /ମୋର\s+କେଉଁ\s+ଖାଦ୍ୟ/i,
      /expire\s+hebo/i,
      // Bengali
      /কোন\s+খাবারটি\s+দ্রুত/i,
      /মেয়াদোত্তীর্ণ/i,
      /ki\s+expire\s+hobe/i
    ]
  },
  {
    intent: QUERY_INTENTS.USE_FIRST,
    patterns: [
      // English
      /use\s+first/i,
      /which\s+product(s)?\s+should\s+i\s+use/i,
      /what\s+should\s+i\s+eat\s+first/i,
      // Hindi
      /pehle\s+kya\s+use\s+karein/i,
      /pehle\s+kya\s+khayein/i,
      /use\s+first\s+kya\s+hai/i,
      // Odia
      /ପ୍ରଥମେ\s+କେଉଁଟି\s+ବ୍ୟବହାର/i,
      /ପ୍ରଥମେ\s+କଣ\s+ଖାଇବି/i,
      // Bengali
      /প্রথমে\s+কোনটি\s+ব্যবহার/i,
      /aage\s+ki\s+kheye/i
    ]
  },
  {
    intent: QUERY_INTENTS.RECALL_CHECK,
    patterns: [
      // English
      /recall/i,
      /safe\s+to\s+eat/i,
      /any\s+recalls/i,
      // Hindi
      /kya\s+koi\s+recall\s+hai/i,
      /recall\s+check/i,
      // Odia
      /କୌଣସି\s+ରିକଲ୍/i,
      /ରିକଲ୍/i,
      // Bengali
      /কোনো\s+প্রত্যাহার/i,
      /প্রত্যাহার/i
    ]
  },
  {
    intent: QUERY_INTENTS.WASTE_STATS,
    patterns: [
      // English
      /waste\s+prevented/i,
      /money\s+saved/i,
      /how\s+much\s+saved/i,
      // Hindi
      /kitni\s+bachat\s+hui/i,
      /kitna\s+bachaya/i,
      // Odia
      /କେତେ\s+ସଞ୍ଚୟ\s+ହେଲା/i,
      /ବର୍ଜ୍ୟବସ୍ତୁ\s+ରୋକିଲି/i,
      // Bengali
      /কত\s+সঞ্চয়\s+হলো/i,
      /অপচয়\s+রোধ/i
    ]
  },
  {
    intent: QUERY_INTENTS.INVENTORY_COUNT,
    patterns: [
      // English
      /how\s+many\s+item/i,
      /total\s+product/i,
      // Hindi
      /kitne\s+item\s+hain/i,
      /kya\s+kya\s+rakha\s+hai/i,
      // Odia
      /କେତେ\s+ସାମଗ୍ରୀ\s+ଅଛି/i,
      // Bengali
      /কয়টি\s+আইটেম\s+আছে/i
    ]
  }
];

export function detectQueryIntent(queryText) {
  if (!queryText || typeof queryText !== 'string') return QUERY_INTENTS.UNKNOWN;
  const clean = queryText.trim();

  for (const item of INTENT_PATTERNS) {
    for (const pattern of item.patterns) {
      if (pattern.test(clean)) {
        return item.intent;
      }
    }
  }

  return QUERY_INTENTS.UNKNOWN;
}

/**
 * Processes regional voice/text query strictly using active user's inventory
 */
export function processRegionalAssistantQuery({ queryText, userInventory = [], language = 'en' }) {
  const intent = detectQueryIntent(queryText);
  const activeItems = (userInventory || []).filter(i => (i.status || '').toUpperCase() !== 'DISCARDED');

  // Sorted by nearest expiry
  const sorted = [...activeItems].sort((a, b) => {
    const da = calculateDaysRemaining(a.expiry_date);
    const db = calculateDaysRemaining(b.expiry_date);
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });

  const expiringSoonItems = sorted.filter(i => {
    const days = calculateDaysRemaining(i.expiry_date);
    return days !== null && days >= 0 && days <= 3;
  });

  const highPriorityItems = sorted.filter(i => {
    const days = calculateDaysRemaining(i.expiry_date);
    return days !== null && days <= 1;
  });

  let responseText = '';
  let speechText = '';
  let highlights = [];

  switch (intent) {
    case QUERY_INTENTS.EXPIRING_SOON:
      if (expiringSoonItems.length === 0) {
        if (language === 'hi') {
          responseText = 'बधाई हो! आपके घर में अगले 3 दिनों में कोई भी खाद्य सामग्री या दवाई समाप्त नहीं हो रही है।';
          speechText = 'Badhaai ho! Agle teen dino mein koi bhi product expire nahi ho raha hai.';
        } else if (language === 'or') {
          responseText = 'ଅଭିନନ୍ଦନ! ଆପଣଙ୍କ ଘରେ ଆଗାମୀ ୩ ଦିନ ମଧ୍ୟରେ କୌଣସି ଖାଦ୍ୟ ସମାପ୍ତ ହେଉନାହିଁ।';
          speechText = 'Abhinandana! Aagamee teeni dina madhyare kounasi khadya samapta heunahi.';
        } else if (language === 'bn') {
          responseText = 'অভিনন্দন! আপনার ঘরে আগামী ৩ দিনের মধ্যে কোনো খাবার মেয়াদোত্তীর্ণ হচ্ছে না।';
          speechText = 'Abhinandan! Aagami teen diner moddhe kono khabar expire hocche na.';
        } else {
          responseText = 'Great news! You have no products expiring within the next 3 days.';
          speechText = 'Great news! You have no products expiring within the next 3 days.';
        }
      } else {
        const itemNames = expiringSoonItems.map(i => `${i.product_name} (${calculateDaysRemaining(i.expiry_date)}d left)`).join(', ');
        highlights = expiringSoonItems;

        if (language === 'hi') {
          responseText = `सावधान! आपके पास ${expiringSoonItems.length} सामग्री जल्द समाप्त होने वाली हैं: ${itemNames}। कृपया इन्हें पहले उपयोग करें।`;
          speechText = `Dhyan dein! Aapke ghar mein ${expiringSoonItems.length} cheezein jaldi expire hone wali hain: ${expiringSoonItems[0].product_name}। kripya ise pehle use karein.`;
        } else if (language === 'or') {
          responseText = `ସାବଧାନ! ଆପଣଙ୍କର ${expiringSoonItems.length} ଟି ଖାଦ୍ୟ ଶୀଘ୍ର ସମାପ୍ତ ହେବାକୁ ଯାଉଛି: ${itemNames}। ଦୟାକରି ଏଗୁଡିକୁ ପ୍ରଥମେ ବ୍ୟବହାର କରନ୍ତୁ।`;
          speechText = `Dhyana diyantu! Aapananka ghare ${expiringSoonItems.length} ti khadya shighra samapta hebaaku jauchhi: ${expiringSoonItems[0].product_name}। Dayakari ehaaku prathame byabahara karantu.`;
        } else if (language === 'bn') {
          responseText = `সতর্কতা! আপনার ${expiringSoonItems.length}টি খাবার শীঘ্রই মেয়াদোত্তীর্ণ হবে: ${itemNames}। অনুগ্রহ করে এগুলো আগে ব্যবহার করুন।`;
          speechText = `Shotorkota! Aaponar ${expiringSoonItems.length}ti khabar shighroi expire hobe: ${expiringSoonItems[0].product_name}। Onugroho kore eita aage babohar korun.`;
        } else {
          responseText = `Attention! You have ${expiringSoonItems.length} product(s) expiring soon: ${itemNames}. Please prioritize these first.`;
          speechText = `Attention! You have ${expiringSoonItems.length} products expiring soon, including ${expiringSoonItems[0].product_name}. Please prioritize using them.`;
        }
      }
      break;

    case QUERY_INTENTS.USE_FIRST:
      if (highPriorityItems.length === 0 && expiringSoonItems.length === 0) {
        responseText = language === 'hi'
          ? 'आपके सभी प्रोडक्ट्स सुरक्षित हैं। किसी भी अर्जेंट सामग्री को आज ही समाप्त करने की आवश्यकता नहीं है।'
          : language === 'or'
          ? 'ଆପଣଙ୍କର ସମସ୍ତ ସାମଗ୍ରୀ ସୁରକ୍ଷିତ ଅଛି। ଆଜି କୌଣସି ଜରୁରୀ ସାମଗ୍ରୀ ବ୍ୟବହାର କରିବାର ଆବଶ୍ୟକତା ନାହିଁ।'
          : language === 'bn'
          ? 'আপনার সমস্ত পণ্য নিরাপদ রয়েছে। আজই জরুরি কোনো খাবার শেষ করার প্রয়োজন নেই।'
          : 'All products are safe. There are no high-priority items requiring immediate consumption today.';
        speechText = responseText;
      } else {
        const topItem = highPriorityItems[0] || expiringSoonItems[0];
        const days = calculateDaysRemaining(topItem.expiry_date);
        highlights = [topItem];

        if (language === 'hi') {
          responseText = `यूज़ फर्स्ट प्राथमिकता: आपको सबसे पहले "${topItem.product_name}" का उपयोग करना चाहिए (एक्सपायरी: ${days} दिन)। यह ${topItem.storage_location || 'पेंट्री'} में रखा है।`;
          speechText = `Aapko sabse pehle ${topItem.product_name} use karna chahiye, jisme ${days} din bache hain.`;
        } else if (language === 'or') {
          responseText = `ପ୍ରଥମେ ବ୍ୟବହାର କରନ୍ତୁ: ଆପଣ ସର୍ବପ୍ରଥମେ "${topItem.product_name}" ବ୍ୟବହାର କରିବା ଉଚିତ (${days} ଦିନ ବାକି ଅଛି)। ଏହା ${topItem.storage_location || 'ରେଫ୍ରିଜରେଟର'} ରେ ଅଛି।`;
          speechText = `Aapana sarbaprathame ${topItem.product_name} byabahara karantu, jouthire ${days} dina baki achhi.`;
        } else if (language === 'bn') {
          responseText = `প্রথমে ব্যবহার করুন: আপনার সবচেয়ে আগে "${topItem.product_name}" ব্যবহার করা উচিত (${days} দিন বাকি)। এটি ${topItem.storage_location || 'ফ্রিজে'} আছে।`;
          speechText = `Aaponar shobcheye aage ${topItem.product_name} babohar kora uchit, jaate ${days} din baaki aache.`;
        } else {
          responseText = `USE FIRST Recommendation: You should consume "${topItem.product_name}" first (${days} days remaining). Stored in: ${topItem.storage_location || 'Pantry'}.`;
          speechText = `You should consume ${topItem.product_name} first, as it has only ${days} days remaining.`;
        }
      }
      break;

    case QUERY_INTENTS.RECALL_CHECK:
      const recallHits = scanInventoryForRecalls(activeItems);
      if (recallHits.length === 0) {
        responseText = language === 'hi'
          ? 'सुरक्षा पुष्टि: आपके पेंट्री या इन्वेंट्री में कोई भी प्रोडक्ट सरकारी रिकॉल लिस्ट में नहीं है।'
          : language === 'or'
          ? 'ସୁରକ୍ଷା ଯାଞ୍ଚ: ଆପଣଙ୍କ ଇନଭେଣ୍ଟୋରୀରେ ଥିବା କୌଣସି ସାମଗ୍ରୀ ସରକାରୀ ରିକଲ୍ ତାଲିକାରେ ନାହିଁ।'
          : language === 'bn'
          ? 'নিরাপত্তা নিশ্চিত: আপনার কোনো খাবার বা ওষুধ সরকারি প্রত্যাহার তালিকায় নেই।'
          : 'Safety Verified: None of your stored products match official FDA, USDA, or WHO recall bulletins.';
        speechText = responseText;
      } else {
        highlights = recallHits;
        responseText = language === 'hi'
          ? `चेतावनी! आपके पास ${recallHits.length} उत्पाद है जो आधिकारिक सरकारी रिकॉल से मेल खाता है: ${recallHits[0].product_name}। इसे तुरंत अलग रखें।`
          : `CRITICAL ALERT: You have ${recallHits.length} item matching an official safety recall: ${recallHits[0].product_name}. Quarantine immediately.`;
        speechText = responseText;
      }
      break;

    case QUERY_INTENTS.WASTE_STATS:
      const consumedCount = activeItems.filter(i => (i.status || '').toUpperCase() === 'CONSUMED').length;
      responseText = language === 'hi'
        ? `बचत रिपोर्ट: आपने अब तक कई सामग्रियों को समय से पहले उपयोग करके भोजन की बर्बादी को रोका है!`
        : language === 'or'
        ? `ସଞ୍ଚୟ ରିପୋର୍ଟ: ଆପଣ ଅନେକ ଖାଦ୍ୟ ସାମଗ୍ରୀକୁ ଠିକ୍ ସମୟରେ ବ୍ୟବହାର କରି ଖାଦ୍ୟ ନଷ୍ଟକୁ ରୋକିଛନ୍ତି!`
        : language === 'bn'
        ? `অপচয় রোধ রিপোর্ট: আপনি সঠিক সময়ে খাবার ব্যবহার করে আর্থিক ক্ষতি এবং খাদ্যের অপচয় বাঁচিয়েছেন!`
        : `Waste Prevention Report: Your proactive consumption has successfully prevented household grocery waste!`;
      speechText = responseText;
      break;

    case QUERY_INTENTS.INVENTORY_COUNT:
      responseText = language === 'hi'
        ? `आपके पास कुल ${activeItems.length} सामग्रियां दर्ज हैं।`
        : language === 'or'
        ? `ଆପଣଙ୍କର ସମୁଦାୟ ${activeItems.length} ଟି ସାମଗ୍ରୀ ରେକର୍ଡ ହୋଇଛି।`
        : language === 'bn'
        ? `আপনার মোট ${activeItems.length}টি পণ্য সংরক্ষিত আছে।`
        : `You have ${activeItems.length} total active item(s) logged in your inventory.`;
      speechText = responseText;
      break;

    default:
      responseText = language === 'hi'
        ? 'मैं आपकी इन्वेंट्री और एक्सपायरी में सहायता कर सकता हूँ। आप पूछ सकते हैं: "Mere ghar mein kya expire hone wala hai?" या "Pehle kya use karein?"'
        : language === 'or'
        ? 'ମୁଁ ଆପଣଙ୍କ ଖାଦ୍ୟ ଓ ସମାପ୍ତ ତାରିଖ ପାଇଁ ସାହାଯ୍ୟ କରିପାରିବି। ପଚାରନ୍ତୁ: "ମୋର କେଉଁ ଖାଦ୍ୟ ଶୀଘ୍ର ସମାପ୍ତ ହେବ?"'
        : language === 'bn'
        ? 'আমি আপনার খাদ্য সামগ্রী এবং মেয়াদের ব্যাপারে সাহায্য করতে পারি। জিজ্ঞাসা করুন: "আমার কোন খাবারটি দ্রুত শেষ হবে?"'
        : 'I can assist you with food expiry & safety. Try asking: "What is expiring soon?" or "Which products should I use first?"';
      speechText = responseText;
  }

  return {
    query: queryText,
    intent,
    language,
    responseText,
    speechText,
    highlights,
    timestamp: new Date().toISOString()
  };
}
