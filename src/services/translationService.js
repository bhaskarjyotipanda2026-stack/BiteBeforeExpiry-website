import { INGREDIENT_KNOWLEDGE_BASE } from '../data/ingredientDatabase';

/**
 * Translates a single text or ingredient string into target language.
 * Abstracted behind translateText(text, targetLang, options).
 */
export async function translateText(text, targetLang = 'en', options = {}) {
  if (!text || targetLang === 'en') {
    return text;
  }

  const { libreTranslateUrl = 'https://libretranslate.de', apiKey = '' } = options;

  // 1. Check our built-in curated dictionary first for instant high-quality medical/food terminology
  const cleanKey = text.toLowerCase().trim();
  for (const [dictKey, data] of Object.entries(INGREDIENT_KNOWLEDGE_BASE)) {
    if (cleanKey.includes(dictKey) || dictKey.includes(cleanKey)) {
      if (data.translations && data.translations[targetLang]) {
        return data.translations[targetLang];
      }
    }
  }

  // 2. If user configured an external LibreTranslate or custom translation service
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('{{API_KEY_HERE}}')) {
    try {
      const response = await fetch(`${libreTranslateUrl}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format: 'text',
          api_key: apiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.translatedText) {
          return data.translatedText;
        }
      }
    } catch (err) {
      console.warn('External translation API error, using phonetic/glossary fallback:', err);
    }
  }

  // 3. Smart linguistic phonetic and semantic fallback for Hindi, Telugu, Tamil, Bengali
  return getLinguisticFallback(text, targetLang);
}

/**
 * Batch translates an array of ingredients
 */
export async function translateIngredientsList(ingredients = [], targetLang = 'en', options = {}) {
  if (!ingredients || ingredients.length === 0 || targetLang === 'en') {
    return ingredients;
  }

  const translations = await Promise.all(
    ingredients.map(item => translateText(item, targetLang, options))
  );

  return translations;
}

// Fallback dictionary for common pantry terms
const COMMON_TERMS = {
  water: { hi: 'पानी (जल)', te: 'నీరు', ta: 'தண்ணீர்', bn: 'জল', mr: 'पाणी', es: 'Agua' },
  salt: { hi: 'नमक', te: 'ఉప్పు', ta: 'உப்பு', bn: 'লবণ', mr: 'मीठ', es: 'Sal' },
  sugar: { hi: 'चीनी', te: 'చక్కెర', ta: 'சர்க்கரை', bn: 'চিনি', mr: 'साखर', es: 'Azúcar' },
  milk: { hi: 'दूध', te: 'పాలు', ta: 'பால்', bn: 'দুধ', mr: 'दूध', es: 'Leche' },
  flour: { hi: 'आटा / मैदा', te: 'పిండి', ta: 'மாவு', bn: 'ময়দা', mr: 'पीठ', es: 'Harina' },
  oil: { hi: 'तेल', te: 'నూనె', ta: 'எண்ணெய்', bn: 'তেল', mr: 'तेल', es: 'Aceite' },
  preservative: { hi: 'संरक्षक तत्व', te: 'సంరక్షణకారి', ta: 'பாதுகாப்பான்', bn: 'প্রিজারভেটিভ', mr: 'परिरक्षक', es: 'Conservante' },
  acid: { hi: 'अम्ल (एसिड)', te: 'ఆమ్లం', ta: 'அமிலம்', bn: 'অ্যাসিড', mr: 'आम्ल', es: 'Ácido' },
  yeast: { hi: 'खमीर (यीस्ट)', te: 'ఈస్ట్', ta: 'ஈஸ்ட்', bn: 'ইস্ট', mr: 'यीस्ट', es: 'Levadura' },
  starch: { hi: 'स्टार्च', te: 'స్టార్చ్', ta: 'ஸ்டார்ச்', bn: 'স্টার্চ', mr: 'स्टार्च', es: 'Almidón' },
  vitamin: { hi: 'विटामिन', te: 'విటమిన్', ta: 'வைட்டமின்', bn: 'ভিটামিন', mr: 'व्हिटॅमिन', es: 'Vitamina' },
  protein: { hi: 'प्रोटीन', te: 'ప్రొటీన్', ta: 'புரதம்', bn: 'প্রোটিন', mr: 'प्रथिने', es: 'Proteína' }
};

function getLinguisticFallback(text, targetLang) {
  const lower = text.toLowerCase();
  for (const [term, map] of Object.entries(COMMON_TERMS)) {
    if (lower.includes(term) && map[targetLang]) {
      return `${text} (${map[targetLang]})`;
    }
  }

  // If no match found, append localized script notice so the user still recognizes it
  const indicators = {
    hi: ' (घटक)',
    te: ' (పదార్థం)',
    ta: ' (பொருள்)',
    bn: ' (উপাদান)',
    mr: ' (घटक)',
    es: ''
  };

  return `${text}${indicators[targetLang] || ''}`;
}
