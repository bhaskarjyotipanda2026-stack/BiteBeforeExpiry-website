/**
 * BiteBeforeExpiry — AI Ingredient Intelligence Service
 * 
 * Pipeline:
 * OCR Ingredients + Product Database + Ingredient Knowledge Base
 *   ↓
 * Ingredient Normalization (synonyms, botanical names, E-numbers, variants)
 *   ↓
 * AI Interpretation (allergens, contains/may-contain statements, ambiguity checks)
 */

// Normalized allergen taxonomy mapping synonyms and botanical names
const INGREDIENT_NORMALIZATION_MAP = {
  // Milk & Dairy
  'milk': 'Milk',
  'cow milk': 'Milk',
  'buffalo milk': 'Milk',
  'toned milk': 'Milk',
  'standardised milk': 'Milk',
  'dairy': 'Milk',
  'lactose': 'Milk',
  'casein': 'Milk',
  'sodium caseinate': 'Milk',
  'calcium caseinate': 'Milk',
  'whey': 'Milk',
  'whey protein': 'Milk',
  'whey powder': 'Milk',
  'butter': 'Milk',
  'ghee': 'Milk',
  'curd': 'Milk',
  'dahi': 'Milk',
  'yogurt': 'Milk',
  'paneer': 'Milk',
  'cheese': 'Milk',
  'cream': 'Milk',
  'milk solids': 'Milk',
  'skimmed milk powder': 'Milk',

  // Gluten & Wheat
  'wheat': 'Gluten (Wheat)',
  'wheat flour': 'Gluten (Wheat)',
  'whole wheat': 'Gluten (Wheat)',
  'atta': 'Gluten (Wheat)',
  'maida': 'Gluten (Wheat)',
  'semolina': 'Gluten (Wheat)',
  'suji': 'Gluten (Wheat)',
  'sooji': 'Gluten (Wheat)',
  'barley': 'Gluten (Wheat)',
  'rye': 'Gluten (Wheat)',
  'malt': 'Gluten (Wheat)',
  'malt extract': 'Gluten (Wheat)',
  'spelt': 'Gluten (Wheat)',
  'triticum': 'Gluten (Wheat)',
  'gluten': 'Gluten (Wheat)',

  // Soybeans & Soy
  'soy': 'Soybeans & Soy',
  'soya': 'Soybeans & Soy',
  'soybean': 'Soybeans & Soy',
  'soybeans': 'Soybeans & Soy',
  'soya flour': 'Soybeans & Soy',
  'soy lecithin': 'Soybeans & Soy',
  'soya lecithin': 'Soybeans & Soy',
  'e322': 'Soybeans & Soy',
  'lecithin (soy)': 'Soybeans & Soy',
  'tofu': 'Soybeans & Soy',
  'edamame': 'Soybeans & Soy',
  'glycine max': 'Soybeans & Soy',

  // Peanuts
  'peanut': 'Peanuts',
  'peanuts': 'Peanuts',
  'groundnut': 'Peanuts',
  'groundnuts': 'Peanuts',
  'monkey nut': 'Peanuts',
  'peanut butter': 'Peanuts',
  'peanut oil': 'Peanuts',
  'arachis hypogaea': 'Peanuts',

  // Tree Nuts
  'almond': 'Tree Nuts',
  'almonds': 'Tree Nuts',
  'cashew': 'Tree Nuts',
  'cashews': 'Tree Nuts',
  'kaju': 'Tree Nuts',
  'walnut': 'Tree Nuts',
  'walnuts': 'Tree Nuts',
  'akhrot': 'Tree Nuts',
  'pistachio': 'Tree Nuts',
  'pistachios': 'Tree Nuts',
  'pista': 'Tree Nuts',
  'hazelnut': 'Tree Nuts',
  'hazelnuts': 'Tree Nuts',
  'pecan': 'Tree Nuts',
  'macadamia': 'Tree Nuts',
  'brazil nut': 'Tree Nuts',

  // Eggs
  'egg': 'Eggs',
  'eggs': 'Eggs',
  'egg white': 'Eggs',
  'egg yolk': 'Eggs',
  'whole egg': 'Eggs',
  'egg powder': 'Eggs',
  'albumin': 'Eggs',
  'ovalbumin': 'Eggs',
  'lysozyme': 'Eggs',

  // Fish & Seafood
  'fish': 'Fish & Seafood',
  'salmon': 'Fish & Seafood',
  'tuna': 'Fish & Seafood',
  'cod': 'Fish & Seafood',
  'anchovy': 'Fish & Seafood',
  'prawn': 'Fish & Seafood',
  'prawns': 'Fish & Seafood',
  'shrimp': 'Fish & Seafood',
  'crab': 'Fish & Seafood',
  'lobster': 'Fish & Seafood',
  'shellfish': 'Fish & Seafood',
  'fish oil': 'Fish & Seafood',

  // Mustard
  'mustard': 'Mustard',
  'mustard seed': 'Mustard',
  'mustard seeds': 'Mustard',
  'sarson': 'Mustard',
  'rai': 'Mustard',
  'mustard oil': 'Mustard',

  // Sesame Seeds
  'sesame': 'Sesame Seeds',
  'sesame seeds': 'Sesame Seeds',
  'til': 'Sesame Seeds',
  'tahini': 'Sesame Seeds',
  'gingelly': 'Sesame Seeds'
};

// Common E-number food additives dictionary
const E_NUMBER_MAP = {
  'e102': { name: 'Tartrazine', role: 'Synthetic Food Coloring (Yellow)', caution: 'May cause sensitivity in asthmatics' },
  'e150d': { name: 'Caramel IV (Sulphite Ammonia Caramel)', role: 'Caramel Color', caution: 'Processed with ammonium and sulphites' },
  'e211': { name: 'Sodium Benzoate', role: 'Preservative (Antifungal)', caution: 'Inhibits yeast and bacterial spoilage' },
  'e202': { name: 'Potassium Sorbate', role: 'Preservative', caution: 'Widely used antimicrobial agent' },
  'e322': { name: 'Lecithin', role: 'Emulsifier', caution: 'Usually derived from soybean or sunflower' },
  'e330': { name: 'Citric Acid', role: 'Acidity Regulator / Antioxidant', caution: 'Naturally occurring organic acid' },
  'e621': { name: 'Monosodium Glutamate (MSG)', role: 'Flavor Enhancer', caution: 'Provides umami savory taste' },
  'e500': { name: 'Sodium Carbonates', role: 'Raising Agent / Baking Soda', caution: 'Standard bakery leavener' },
  'e415': { name: 'Xanthan Gum', role: 'Stabilizer and Thickener', caution: 'Soluble fermented polysaccharide' }
};

/**
 * Normalizes an individual ingredient string
 */
export function normalizeSingleIngredient(rawIng) {
  if (!rawIng || typeof rawIng !== 'string') return null;
  const clean = rawIng.trim().replace(/^[\*\-\.\d\s%()]+/, '').replace(/[\(\)]/g, ' ').trim();
  const lower = clean.toLowerCase();

  // 1. Direct synonym lookup
  for (const [key, normalized] of Object.entries(INGREDIENT_NORMALIZATION_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(lower)) {
      return {
        original: clean,
        normalizedName: clean,
        allergenCategory: normalized,
        isAllergenDerived: true
      };
    }
  }

  // 2. Check E-numbers
  const eMatch = lower.match(/\b(e\d{3,4}[a-z]?)\b/i);
  if (eMatch && E_NUMBER_MAP[eMatch[1].toLowerCase()]) {
    const eData = E_NUMBER_MAP[eMatch[1].toLowerCase()];
    return {
      original: clean,
      normalizedName: `${clean} (${eData.name})`,
      additiveInfo: eData,
      allergenCategory: eMatch[1].toLowerCase() === 'e322' ? 'Soybeans & Soy' : null,
      isAllergenDerived: eMatch[1].toLowerCase() === 'e322'
    };
  }

  return {
    original: clean,
    normalizedName: clean,
    allergenCategory: null,
    isAllergenDerived: false
  };
}

/**
 * Parses explicit "Contains" and "May Contain" allergen advisory statements from packaging text
 */
export function extractAdvisoryStatements(text = '') {
  if (!text) return { containsStatements: [], mayContainStatements: [] };

  const containsStatements = [];
  const mayContainStatements = [];

  // 1. "Contains: ..." pattern
  const containsPatterns = [
    /(?:contains|allergen(?:s)?\s*declared)[:\s]+([^.;\n]+)/gi,
    /(?:allergen\s*information[:\s]+contains\s+)([^.;\n]+)/gi
  ];

  for (const regex of containsPatterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        containsStatements.push(match[1].trim());
      }
    }
  }

  // 2. "May contain: ..." advisory pattern
  const mayContainPatterns = [
    /(?:may\s*contain|manufactured\s*in\s*a\s*facility\s*that\s*also\s*(?:processes|handles)|processed\s*on\s*equipment\s*that\s*also\s*processes)[:\s]+([^.;\n]+)/gi,
    /(?:traces\s*of\s*)([^.;\n]+)/gi
  ];

  for (const regex of mayContainPatterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        mayContainStatements.push(match[1].trim());
      }
    }
  }

  return {
    containsStatements,
    mayContainStatements
  };
}

/**
 * Checks whether an ingredient list or OCR string is degraded, noisy, or uncertain
 */
export function detectIngredientAmbiguity(rawText = '', ingredientsList = []) {
  if (!rawText && (!ingredientsList || ingredientsList.length === 0)) {
    return {
      isUnclear: true,
      reason: 'No ingredients detected on package.'
    };
  }

  // High proportion of non-alphanumeric noise or fragmented words
  const letters = (rawText.match(/[a-zA-Z]/g) || []).length;
  const symbols = (rawText.match(/[^\w\s,\.\-]/g) || []).length;
  const total = rawText.length;

  if (total > 15 && symbols / total > 0.35) {
    return {
      isUnclear: true,
      reason: 'Optical noise and character distortion detected in ingredient section.'
    };
  }

  // Check if any ingredient entry contains illegible fragment artifacts or question marks
  const hasGarbledEntries = ingredientsList.some(ing => {
    return ing.length > 2 && (/[\^~#$@%&*_+=?]{2,}/.test(ing) || /\?{2,}/.test(ing) || /unknown/i.test(ing));
  });

  if (hasGarbledEntries) {
    return {
      isUnclear: true,
      reason: 'Fragmented or partial words detected in optical label scan.'
    };
  }

  return {
    isUnclear: false,
    reason: null
  };
}

/**
 * Complete AI Ingredient Intelligence Engine
 */
export function analyzeIngredientsAI({ ingredients = [], rawOcrText = '', productType = 'grocery' }) {
  const combinedText = `${Array.isArray(ingredients) ? ingredients.join(', ') : ''} ${rawOcrText}`;

  // 1. Ambiguity detection
  const ambiguity = detectIngredientAmbiguity(rawOcrText, ingredients);

  // 2. Normalization
  const normalizedList = ingredients.map(ing => normalizeSingleIngredient(ing)).filter(Boolean);

  // 3. Allergen extraction from normalization & advisory statements
  const advisory = extractAdvisoryStatements(combinedText);

  // Extract explicit allergens identified
  const directAllergens = new Set();
  normalizedList.forEach(item => {
    if (item.allergenCategory) directAllergens.add(item.allergenCategory);
  });

  // Extract allergens declared in "contains" and "may contain" statements
  const advisoryAllergens = new Set();
  const advisoryText = `${advisory.containsStatements.join(' ')} ${advisory.mayContainStatements.join(' ')}`;
  for (const [key, category] of Object.entries(INGREDIENT_NORMALIZATION_MAP)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(advisoryText)) {
      advisoryAllergens.add(category);
    }
  }

  const allIdentifiedAllergens = Array.from(new Set([...directAllergens, ...advisoryAllergens]));

  // Additives found
  const additivesFound = normalizedList
    .filter(i => i.additiveInfo)
    .map(i => i.additiveInfo);

  const notice = ambiguity.isUnclear ? 'Ingredient information is unclear. Please verify the package.' : null;

  return {
    isUnclear: ambiguity.isUnclear,
    hasAmbiguity: ambiguity.isUnclear,
    unclearWarning: notice,
    ambiguityNotice: notice,
    normalizedIngredients: normalizedList,
    identifiedAllergens: allIdentifiedAllergens,
    advisoryStatements: advisory,
    additivesFound,
    ingredientCount: normalizedList.length,
    confidence: ambiguity.isUnclear ? 0.45 : (normalizedList.length > 0 ? 0.95 : 0.70)
  };
}
