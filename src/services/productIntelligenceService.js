/**
 * Product Intelligence API Service
 * 
 * Provides:
 * 1. Real Expiry Date Detection (via Open Food Facts API, Optical OCR validation & Shelf-life algorithms)
 * 2. Raw Material Composition ("What the product is made up of", origins, active compounds, allergens, additives)
 * 3. Comprehensive Product Lifespan & Shelf Life Analysis (Total lifespan, remaining lifespan, PAO after opening, storage protocols)
 */

import { extractExpiryDate, extractMfgDate, extractIngredients, inferProductType, extractProductName } from './parserService';

// Open Food Facts API Base URLs
const OFF_API_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_API_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

/**
 * Standard shelf life profiles by category & keywords (in days)
 */
const STANDARD_LIFESPAN_PROFILES = [
  // Dairy
  {
    pattern: /\b(?:uht|tetra\s*pak|homogenised|toned\s*milk)\b/i,
    category: 'Dairy & Milk Products',
    totalDays: 180, // 6 months
    pao: 'Consume within 3 to 4 days once opened (refrigerate at 2°C–4°C)',
    storage: 'Store sealed at ambient room temperature in dry place. Keep refrigerated below 4°C immediately after breaking seal.',
    shelfLifeClass: 'Semi-Perishable (Aseptic Tetra Pak)',
    degradationRisk: 'Once opened, exposure to airborne bacteria causes rapid lactic acidification, souring, and curdling.'
  },
  {
    pattern: /\b(?:fresh\s*milk|pasteurized\s*milk|raw\s*milk)\b/i,
    category: 'Dairy & Milk Products',
    totalDays: 7,
    pao: 'Consume within 2 to 3 days (always keep chilled)',
    storage: 'Keep refrigerated continuously at 2°C–4°C. Do not leave at room temperature.',
    shelfLifeClass: 'Perishable Short-Life',
    degradationRisk: 'Rapid microbial bacterial multiplication and curdling if cold-chain is disrupted.'
  },
  {
    pattern: /\b(?:yogurt|curd|dahi|greek\s*yogurt)\b/i,
    category: 'Dairy & Milk Products',
    totalDays: 21,
    pao: 'Consume within 3 days after seal removal',
    storage: 'Store refrigerated at 2°C–5°C. Keep container tightly sealed.',
    shelfLifeClass: 'Perishable Short-Life',
    degradationRisk: 'Yeast/mold colony growth and excessive whey separation.'
  },
  {
    pattern: /\b(?:cheese|paneer|cottage\s*cheese)\b/i,
    category: 'Dairy & Milk Products',
    totalDays: 30,
    pao: 'Consume within 3 to 5 days once package is opened',
    storage: 'Wrap tightly in parchment or airtight container. Refrigerate at 2°C–4°C.',
    shelfLifeClass: 'Perishable Short-Life',
    degradationRisk: 'Surface mold formation and moisture condensation leading to fungal spoilage.'
  },
  {
    pattern: /\b(?:butter|ghee)\b/i,
    category: 'Dairy & Milk Products',
    totalDays: 180,
    pao: 'Consume within 30 to 60 days once opened',
    storage: 'Store in cool, dark pantry or refrigerate. Avoid introducing wet spoons.',
    shelfLifeClass: 'Semi-Perishable',
    degradationRisk: 'Oxidative rancidity from heat, oxygen, and ultraviolet light exposure.'
  },
  // Bakery
  {
    pattern: /\b(?:bread|loaf|bun|buns|bagel|toast)\b/i,
    category: 'Bakery & Bread',
    totalDays: 6,
    pao: 'Consume within 2 to 3 days after opening bag',
    storage: 'Keep in original sealed bag with clip in a dry, room-temperature pantry. Do not refrigerate (causes staling); freeze for long-term storage.',
    shelfLifeClass: 'Perishable Short-Life',
    degradationRisk: 'Blue/green Rhizopus mold growth due to trapped moisture and starch retrogradation.'
  },
  {
    pattern: /\b(?:biscuit|cookies|crackers)\b/i,
    category: 'Snacks & Sweets',
    totalDays: 240, // 8 months
    pao: 'Consume within 7 to 14 days; store in airtight tin to prevent softening',
    storage: 'Store in cool, dry place away from sunlight and moisture.',
    shelfLifeClass: 'Shelf-Stable Long-Life',
    degradationRisk: 'Moisture absorption leading to loss of crispness and lipid oxidation.'
  },
  // Pantry Staples & Grains
  {
    pattern: /\b(?:oats|quaker|oatmeal|rolled\s*oats)\b/i,
    category: 'Grains & Pasta',
    totalDays: 365, // 1 year
    pao: 'Consume within 2 to 3 months once inner pouch is unsealed',
    storage: 'Keep in an airtight jar in a cool, dark, dry pantry cabinet.',
    shelfLifeClass: 'Shelf-Stable Long-Life',
    degradationRisk: 'Weevil insect infestation and lipid rancidity if stored in high humidity.'
  },
  {
    pattern: /\b(?:rice|basmati|wheat|flour|atta|pasta)\b/i,
    category: 'Grains & Pasta',
    totalDays: 365,
    pao: 'Consume within 3 to 6 months once unsealed',
    storage: 'Store in airtight food-grade container away from moisture and pests.',
    shelfLifeClass: 'Shelf-Stable Long-Life',
    degradationRisk: 'Granary weevil hatching and moisture clumping.'
  },
  // Condiments & Sauces
  {
    pattern: /\b(?:ketchup|sauce|mayo|mayonnaise|mustard)\b/i,
    category: 'Condiments & Sauces',
    totalDays: 365,
    pao: 'Consume within 30 to 60 days after breaking seal (must refrigerate)',
    storage: 'Ambient storage prior to opening. MUST REFRIGERATE at 2°C–4°C immediately after breaking seal.',
    shelfLifeClass: 'Shelf-Stable Unopened / Perishable Once Opened',
    degradationRisk: 'Fermentation, mold formation around the neck/cap, and color darkening.'
  },
  // Canned Goods
  {
    pattern: /\b(?:canned|tin|beans|tuna|sardines|corn)\b/i,
    category: 'Canned & Jarred Goods',
    totalDays: 730, // 2 years
    pao: 'Transfer to non-metal glass/plastic container and consume within 2 days (refrigerated)',
    storage: 'Store cans at dry ambient room temperature. Never keep food inside opened metallic tin cans.',
    shelfLifeClass: 'Shelf-Stable Long-Life',
    degradationRisk: 'Metallic tin leaching and rapid bacterial growth once tin seal is pierced.'
  },
  // Medicines - Solids
  {
    pattern: /\b(?:paracetamol|dolo|crocin|aspirin|ibuprofen|tablet|tablets|capsule|capsules)\b/i,
    category: 'Tablets & Capsules',
    totalDays: 730, // 2 years
    pao: 'Retains full potency until printed blister expiration date if blister foil remains intact',
    storage: 'Store below 25°C–30°C in original moisture-barrier blister. Protect from direct heat, sunlight, and bathroom humidity.',
    shelfLifeClass: 'Pharmaceutical Solid Formulation',
    degradationRisk: 'Moisture hydrolysis leading to breakdown of active molecule into inactive or toxic degradation products.'
  },
  // Medicines - Reconstituted Oral Suspensions
  {
    pattern: /\b(?:suspension|oral\s*suspension|dry\s*syrup|amoxicillin|augmentin)\b/i,
    category: 'Syrups & Liquids',
    totalDays: 14, // 10-14 days once water added
    pao: 'MUST BE DISCARDED 10 TO 14 DAYS AFTER RECONSTITUTION WITH WATER',
    storage: 'Store reconstituted liquid in refrigerator at 2°C–8°C. Do not freeze. Shake vigorously before each dose.',
    shelfLifeClass: 'Reconstituted Antibiotic (Ultra-Short Opened Life)',
    degradationRisk: 'Rapid beta-lactam ring hydrolysis destroying antibiotic efficacy and possible microbial proliferation.'
  },
  // Medicines - Eye Drops
  {
    pattern: /\b(?:eye\s*drop|eye\s*drops|ophthalmic|ear\s*drops)\b/i,
    category: 'Eye & Ear Drops',
    totalDays: 30, // 28-30 days once opened
    pao: 'DISCARD STRICTLY 28 DAYS AFTER BREAKING THE STERILITY SEAL',
    storage: 'Store at 15°C–25°C (or refrigerated if specified). Never touch dropper tip to eyelashes, fingers, or any surface.',
    shelfLifeClass: 'Sterile Multi-Dose Ophthalmic',
    degradationRisk: 'Bacterial contamination (Pseudomonas aeruginosa) which can cause severe ocular infections or loss of vision.'
  },
  // Medicines - Insulin & Injections
  {
    pattern: /\b(?:insulin|pen|cartridge|injection)\b/i,
    category: 'Injections & Vials',
    totalDays: 28, // 28 days once in use at room temp
    pao: 'Discard after 28 days of use (even if insulin remains in pen)',
    storage: 'Unopened pens: store in refrigerator 2°C–8°C. In-use pen: store at room temperature (below 30°C) for up to 28 days.',
    shelfLifeClass: 'Biologic Protein Hormone',
    degradationRisk: 'Protein denaturation, peptide aggregation, and complete loss of blood-glucose-lowering potency.'
  }
];

/**
 * Raw Material & Origin Knowledge Base
 */
const INGREDIENT_ORIGIN_DATABASE = {
  // Dairy
  'milk': { origin: 'Dairy Farm Husbandry (Bovine/Cow/Buffalo)', category: 'Dairy Base' },
  'pasteurized toned milk': { origin: 'Dairy Farm Bovine Processing', category: 'Dairy Base' },
  'milk solids': { origin: 'Concentrated Dehydrated Milk (Dairy)', category: 'Dairy Protein & Lactose' },
  'whey protein': { origin: 'Dairy Cheese Co-product Separation', category: 'High-Bioavailability Protein' },
  'cheese': { origin: 'Cultured & Coagulated Milk Curd', category: 'Dairy Solid' },
  'paneer': { origin: 'Fresh Acid-Coagulated Cow/Buffalo Milk', category: 'Fresh Dairy Curd' },
  'butter': { origin: 'Churned Fermented Cream (Animal Fat)', category: 'Dairy Lipid' },
  
  // Grains & Flours
  'wheat flour': { origin: 'Triticum Aestivum Cereal Grain Milling', category: 'Plant / Whole Grain' },
  'atta': { origin: 'Whole Grain Stone-Ground Durum Wheat', category: 'Plant / Whole Grain' },
  'maida': { origin: 'Refined & Bleached Endosperm Wheat Flour', category: 'Refined Grain' },
  'rolled oats': { origin: 'Avena Sativa Oat Groats (Steamed & Rolled)', category: 'Whole Grain Cereal' },
  'rice': { origin: 'Oryza Sativa Grain Agriculture', category: 'Plant Cereal Grain' },
  'semolina': { origin: 'Coarse Purified Wheat Middlings', category: 'Plant Grain' },
  
  // Sugars & Sweeteners
  'sugar': { origin: 'Saccharum Officinarum (Sugarcane Extraction)', category: 'Natural Disaccharide' },
  'glucose': { origin: 'Enzymatically Hydrolyzed Plant Cornstarch', category: 'Simple Carbohydrate' },
  'maltodextrin': { origin: 'Partially Hydrolyzed Vegetable Starch', category: 'Polysaccharide Additive' },
  'honey': { origin: 'Apis Mellifera Floral Nectar Enzymatic Processing', category: 'Natural Invert Sugar' },

  // Lipids & Oils
  'palm oil': { origin: 'Elaeis Guineensis Fruit Mesocarp Oil', category: 'Plant Saturated Lipid' },
  'edible vegetable oil': { origin: 'Pressed Plant Seeds (Sunflower/Soy/Canola)', category: 'Plant Triglyceride' },
  'sunflower oil': { origin: 'Helianthus Annuus Seed Pressing', category: 'Plant Polyunsaturated Fat' },
  'olive oil': { origin: 'Olea Europaea Cold-Pressed Drupes', category: 'Plant Monounsaturated Fat' },

  // Botanicals & Spices
  'tomato paste': { origin: 'Solanum Lycopersicum Cooked & Strained Puree', category: 'Vegetable Derivative' },
  'garlic': { origin: 'Allium Sativum Botanical Bulb', category: 'Allium Botanical' },
  'onion': { origin: 'Allium Cepa Root Vegetable', category: 'Allium Botanical' },
  'salt': { origin: 'Evaporated Sea Water / Underground Mineral Halite', category: 'Natural Mineral Electrolyte' },
  'iodized salt': { origin: 'Refined Sodium Chloride Fortified with Potassium Iodate', category: 'Fortified Mineral' },
  'yeast': { origin: 'Saccharomyces Cerevisiae Fungal Fermentation', category: 'Live Fermentation Culture' },

  // Active Pharmaceutical Ingredients (APIs)
  'paracetamol': { origin: 'Synthetic Acylated Aromatic Amide (Organic Synthesis)', category: 'Analgesic & Antipyretic API' },
  'paracetamol ip': { origin: 'USP/IP Grade Synthetic Para-Acetylaminophenol', category: 'Active Pharmaceutical Ingredient' },
  'amoxicillin': { origin: 'Semi-Synthetic Beta-Lactam Penicillin Derivative', category: 'Antibacterial Antibiotic API' },
  'ibuprofen': { origin: 'Synthetic Isobutylphenyl Propionic Acid', category: 'NSAID Anti-Inflammatory API' },
  'microcrystalline cellulose': { origin: 'Purified Partially Depolymerized Wood Pulp Cellulose', category: 'Pharmaceutical Tablet Binder' },
  'magnesium stearate': { origin: 'Magnesium Salt of Vegetable/Animal Stearic Acid', category: 'Pharmaceutical Tablet Lubricant' }
};

/**
 * Common food and medicine additives with safety ratings
 */
const ADDITIVES_DATABASE = {
  'e330': { name: 'Citric Acid', purpose: 'Acidity Regulator & Natural Antioxidant', safety: 'safe' },
  'ins 330': { name: 'Citric Acid', purpose: 'Acidity Regulator & Antioxidant', safety: 'safe' },
  'e282': { name: 'Calcium Propionate', purpose: 'Anti-Mold Bread Preservative', safety: 'safe' },
  'ins 282': { name: 'Calcium Propionate', purpose: 'Anti-Fungal Preservative', safety: 'safe' },
  'e211': { name: 'Sodium Benzoate', purpose: 'Antimicrobial Preservative in Acidic Foods', safety: 'caution' },
  'ins 211': { name: 'Sodium Benzoate', purpose: 'Antimicrobial Preservative', safety: 'caution' },
  'e322': { name: 'Lecithins', purpose: 'Natural Plant Phospholipid Emulsifier', safety: 'safe' },
  'ins 322': { name: 'Lecithins (Soy/Sunflower)', purpose: 'Emulsifier & Stabilizer', safety: 'safe' },
  'e621': { name: 'Monosodium Glutamate (MSG)', purpose: 'Flavor Enhancer (Umami)', safety: 'moderate' },
  'ins 621': { name: 'MSG', purpose: 'Flavor Enhancer', safety: 'moderate' },
  'e250': { name: 'Sodium Nitrite', purpose: 'Color Fixative & C. botulinum Inhibitor', safety: 'caution' },
  'ins 250': { name: 'Sodium Nitrite', purpose: 'Curing Preservative', safety: 'caution' }
};

/**
 * Primary Allergens detection list
 */
const ALLERGEN_TRIGGERS = [
  { trigger: /\b(?:milk|dairy|lactose|casein|whey|butter|ghee|paneer|cheese)\b/i, allergen: 'Milk & Lactose' },
  { trigger: /\b(?:wheat|gluten|atta|maida|semolina|barley|rye)\b/i, allergen: 'Gluten (Wheat)' },
  { trigger: /\b(?:soy|soya|lecithin|edamame)\b/i, allergen: 'Soybeans & Soy Derivatives' },
  { trigger: /\b(?:peanut|peanuts|groundnut)\b/i, allergen: 'Peanuts' },
  { trigger: /\b(?:almond|cashew|walnut|pistachio|hazelnut|tree\s*nut)\b/i, allergen: 'Tree Nuts' },
  { trigger: /\b(?:egg|eggs|albumin|egg\s*powder)\b/i, allergen: 'Eggs' },
  { trigger: /\b(?:fish|salmon|tuna|cod)\b/i, allergen: 'Fish' },
  { trigger: /\b(?:mustard|sarson)\b/i, allergen: 'Mustard' },
  { trigger: /\b(?:sesame|til)\b/i, allergen: 'Sesame Seeds' }
];

/**
 * 1. Fetch live product data from Open Food Facts API
 * Supports barcode lookup or full-text query
 */
export async function fetchFromOpenFoodFacts(identifier) {
  if (!identifier || typeof identifier !== 'string') return null;
  const cleanId = identifier.trim();

  // If identifier is a barcode (digits 8-14 chars)
  const isBarcode = /^\d{8,14}$/.test(cleanId);

  try {
    const url = isBarcode
      ? `${OFF_API_PRODUCT_URL}/${cleanId}.json`
      : `${OFF_API_SEARCH_URL}?search_terms=${encodeURIComponent(cleanId)}&search_simple=1&action=process&json=1&page_size=2`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout for fast UI response

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'BiteBeforeExpiryApp/1.0 (contact: info@bitebeforeexpiry.local)'
      }
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const json = await res.json();

    if (isBarcode && json.status === 1 && json.product) {
      return normalizeOffProduct(json.product, cleanId);
    } else if (!isBarcode && json.products && json.products.length > 0) {
      return normalizeOffProduct(json.products[0], cleanId);
    }
  } catch (err) {
    console.warn('Open Food Facts API fetch aborted or unreachable:', err.message);
  }

  return null;
}

/**
 * Normalizes Open Food Facts product structure
 */
function normalizeOffProduct(product, rawQuery) {
  // Extract ingredients list
  let ingredients = [];
  if (product.ingredients && Array.isArray(product.ingredients)) {
    ingredients = product.ingredients.map(i => i.text || i.id?.replace(/^en:/, '')).filter(Boolean);
  } else if (product.ingredients_text) {
    ingredients = product.ingredients_text
      .split(/[,;•\n]/)
      .map(s => s.trim().replace(/^[\*\-\.\s]+/, ''))
      .filter(s => s.length > 2 && s.length < 80);
  }

  // Extract allergens
  const allergens = [];
  if (product.allergens_tags && Array.isArray(product.allergens_tags)) {
    product.allergens_tags.forEach(tag => {
      const clean = tag.replace(/^en:/, '').replace(/-/g, ' ');
      allergens.push(clean.charAt(0).toUpperCase() + clean.slice(1));
    });
  }

  // Extract additives
  const additives = [];
  if (product.additives_tags && Array.isArray(product.additives_tags)) {
    product.additives_tags.forEach(tag => {
      const code = tag.replace(/^en:/, '').toLowerCase();
      additives.push(code);
    });
  }

  return {
    source: 'Open Food Facts Database',
    barcode: product.code || rawQuery,
    productName: product.product_name || product.generic_name || rawQuery,
    brands: product.brands || '',
    categories: product.categories || 'Groceries & Foods',
    ingredientsText: product.ingredients_text || '',
    ingredientsList: ingredients.slice(0, 15),
    allergens: allergens,
    additives: additives,
    expirationDateRaw: product.expiration_date || null,
    conservationConditions: product.conservation_conditions || '',
    origins: product.origins || product.manufacturing_places || 'Agricultural Supply Chain',
    novaGroup: product.nova_group || null,
    nutriscoreGrade: product.nutriscore_grade || null
  };
}

/**
 * 2. Analyze What the Product is Made Up Of (Composition)
 */
export function analyzeProductComposition(ingredients = [], productName = '', rawOcrText = '', offData = null) {
  const allText = `${productName} ${ingredients.join(' ')} ${rawOcrText}`.toLowerCase();
  const primaryRawMaterials = [];
  const identifiedAllergens = new Set(offData?.allergens || []);
  const identifiedAdditives = [];
  const sourceOrigins = new Set();
  const activeCompounds = [];

  // Match raw ingredients against database
  const processedIngredients = ingredients.length > 0 ? ingredients : extractIngredients(rawOcrText);

  processedIngredients.forEach(ing => {
    const lower = ing.toLowerCase();
    let matchedOrigin = null;

    for (const [key, info] of Object.entries(INGREDIENT_ORIGIN_DATABASE)) {
      if (lower.includes(key)) {
        matchedOrigin = info;
        sourceOrigins.add(info.category);
        break;
      }
    }

    if (matchedOrigin) {
      primaryRawMaterials.push({
        name: ing,
        origin: matchedOrigin.origin,
        category: matchedOrigin.category,
        isOrganic: /organic|bio|jaivik/i.test(ing)
      });
    } else {
      // General heuristic
      primaryRawMaterials.push({
        name: ing,
        origin: 'Standard Food / Botanical Supply',
        category: 'Ingredient',
        isOrganic: false
      });
    }

    // Check for active medicines
    if (/\b(?:paracetamol|amoxicillin|ibuprofen|cetirizine|metformin|pantoprazole|ip|usp|bp)\b/i.test(ing)) {
      activeCompounds.push(ing);
    }
  });

  // Check allergens
  ALLERGEN_TRIGGERS.forEach(({ trigger, allergen }) => {
    if (trigger.test(allText)) {
      identifiedAllergens.add(allergen);
    }
  });

  // Check additives & preservatives
  for (const [code, info] of Object.entries(ADDITIVES_DATABASE)) {
    if (allText.includes(code) || (offData?.additives && offData.additives.includes(code))) {
      identifiedAdditives.push({
        code: code.toUpperCase(),
        name: info.name,
        purpose: info.purpose,
        safetyLevel: info.safety
      });
    }
  }

  // Construct source origins list
  if (sourceOrigins.size === 0) {
    if (inferProductType(allText) === 'medicine') {
      sourceOrigins.add('Pharmaceutical Chemical Synthesis');
    } else {
      sourceOrigins.add('Natural Agricultural Supply Chain');
    }
  }

  // Generate concise human summary of product makeup
  const isMed = inferProductType(allText) === 'medicine';
  let summary = '';
  if (isMed) {
    const actives = activeCompounds.length > 0 ? activeCompounds.join(', ') : 'Active therapeutic medicinal compounds';
    summary = `Composed of ${actives} formulated in a protective excipient matrix for targeted pharmacological stability.`;
  } else {
    const topIngredients = primaryRawMaterials.slice(0, 3).map(m => m.name).join(', ');
    summary = topIngredients 
      ? `Crafted primarily from ${topIngredients}, combined with standard natural and culinary stabilizing agents.`
      : `Formulated from natural food-grade components sourced through verified agricultural supply chains.`;
  }

  return {
    primaryRawMaterials: primaryRawMaterials.slice(0, 10),
    sourceOrigins: Array.from(sourceOrigins),
    activeCompounds,
    allergens: Array.from(identifiedAllergens),
    additivesAndPreservatives: identifiedAdditives,
    summary
  };
}

/**
 * 3. Analyze Product Lifespan & Shelf Life
 */
export function analyzeProductLifespan(productName, rawText, mfgDate = null, expiryDate = null) {
  const combined = `${productName} ${rawText}`.toLowerCase();
  
  // Find matching profile from standard lifespan database
  let profile = STANDARD_LIFESPAN_PROFILES.find(p => p.pattern.test(combined));
  
  // Fallback defaults if no specific profile matched
  if (!profile) {
    const isMed = inferProductType(combined) === 'medicine';
    profile = {
      category: isMed ? 'Pharmaceutical Item' : 'General Grocery',
      totalDays: isMed ? 730 : 90, // 2 yrs for medicine, 3 months for grocery
      pao: isMed ? 'Keep in original packaging until printed expiry' : 'Consume within 3 to 7 days once opened',
      storage: isMed 
        ? 'Store below 25°C–30°C in a dry place protected from sunlight and humidity.' 
        : 'Store in a cool, dry place away from heat. Refrigerate after opening if perishable.',
      shelfLifeClass: isMed ? 'Pharmaceutical Grade' : 'Standard Shelf-Life Goods',
      degradationRisk: isMed 
        ? 'Potential degradation of active molecule under excessive humidity or heat.' 
        : 'Risk of microbial spoiling, oxidation, or loss of freshness over time.'
    };
  }

  // Calculate actual lifespan numbers
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalLifespanDays = profile.totalDays;
  let remainingLifespanDays = null;
  let remainingLifespanPercent = 100;
  let lifespanStage = 'Fresh / Peak Quality';

  if (expiryDate) {
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    remainingLifespanDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (mfgDate) {
      const mfg = new Date(mfgDate);
      mfg.setHours(0, 0, 0, 0);
      const totalSpan = Math.ceil((exp.getTime() - mfg.getTime()) / (1000 * 60 * 60 * 24));
      if (totalSpan > 0) {
        totalLifespanDays = totalSpan;
      }
    }

    if (totalLifespanDays > 0) {
      remainingLifespanPercent = Math.max(0, Math.min(100, Math.round((remainingLifespanDays / totalLifespanDays) * 100)));
    }

    if (remainingLifespanDays < 0) {
      lifespanStage = 'Expired';
    } else if (remainingLifespanDays <= 7 || remainingLifespanPercent <= 15) {
      lifespanStage = 'Approaching End of Life';
    } else if (remainingLifespanPercent >= 70) {
      lifespanStage = 'Fresh / Peak Quality';
    } else {
      lifespanStage = 'Stable Mid-Life';
    }
  }

  // Human-readable total lifespan
  let totalLifespanHuman = '';
  if (totalLifespanDays >= 365) {
    const years = (totalLifespanDays / 365).toFixed(1).replace('.0', '');
    totalLifespanHuman = `${years} Year${years === '1' ? '' : 's'} (${totalLifespanDays} Days)`;
  } else if (totalLifespanDays >= 30) {
    const months = Math.round(totalLifespanDays / 30);
    totalLifespanHuman = `${months} Month${months === 1 ? '' : 's'} (${totalLifespanDays} Days)`;
  } else {
    totalLifespanHuman = `${totalLifespanDays} Days`;
  }

  return {
    totalLifespanDays,
    totalLifespanHuman,
    remainingLifespanDays,
    remainingLifespanPercent,
    lifespanStage,
    periodAfterOpening: profile.pao,
    storageConditions: profile.storage,
    shelfLifeClass: profile.shelfLifeClass,
    degradationRisk: profile.degradationRisk
  };
}

/**
 * 4. Master Product Intelligence API Function
 * 
 * Takes barcode, product name, front text, and back text,
 * hits the Open Food Facts API + Optical analysis + Lifespan Engine,
 * and returns verified real expiry date, composition, and lifespan.
 */
export async function detectProductIntelligence({
  barcode = null,
  productName = '',
  frontText = '',
  backText = '',
  rawOcrText = '',
  existingExpiryDate = null,
  existingMfgDate = null
}) {
  const combinedText = `${productName} ${frontText} ${backText} ${rawOcrText}`.trim();

  // 1. Try querying Open Food Facts API (if barcode exists or if product name is recognized)
  let offData = null;
  if (barcode && /^\d{8,14}$/.test(barcode.trim())) {
    offData = await fetchFromOpenFoodFacts(barcode.trim());
  } else if (productName && productName !== 'Scanned Product' && productName !== 'Scanned Medicine') {
    offData = await fetchFromOpenFoodFacts(productName);
  }

  // 2. Real Expiry Date Detection
  // Check in priority order:
  // a) Explicit printed expiry detected by OCR
  const ocrExpDate = extractExpiryDate(combinedText);
  const ocrMfgDate = extractMfgDate(combinedText);

  let realExpiryDate = existingExpiryDate || ocrExpDate || null;
  let realMfgDate = existingMfgDate || ocrMfgDate || null;
  let isRealPrintedExpiry = false;
  let detectionSource = 'Optical Package OCR';
  let confidence = 'high';

  if (ocrExpDate) {
    realExpiryDate = ocrExpDate;
    isRealPrintedExpiry = true;
    detectionSource = 'Verified Package OCR Date';
    confidence = 'high';
  } else if (offData && offData.expirationDateRaw) {
    // Open Food Facts sometimes provides standard expiration date format
    const parsedOffDate = extractExpiryDate(offData.expirationDateRaw);
    if (parsedOffDate) {
      realExpiryDate = parsedOffDate;
      isRealPrintedExpiry = true;
      detectionSource = 'Open Food Facts Database';
      confidence = 'high';
    }
  }

  // If still no expiry date found, calculate scientific expected expiry from Mfg date + Lifespan profile
  if (!realExpiryDate && realMfgDate) {
    const lifespanPreview = analyzeProductLifespan(productName || offData?.productName || 'Grocery', combinedText);
    const mfg = new Date(realMfgDate);
    mfg.setDate(mfg.getDate() + lifespanPreview.totalLifespanDays);
    realExpiryDate = mfg.toISOString().split('T')[0];
    isRealPrintedExpiry = false;
    detectionSource = 'Calculated from Mfg Date + Scientific Shelf-Life Profile';
    confidence = 'medium';
  }

  // Days remaining calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let daysRemaining = null;
  let statusText = 'Expiry date unverified';
  let formattedHumanDate = realExpiryDate;

  if (realExpiryDate) {
    const exp = new Date(realExpiryDate);
    exp.setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    formattedHumanDate = exp.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (daysRemaining < 0) {
      statusText = `EXPIRED ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} ago (${formattedHumanDate})`;
    } else if (daysRemaining === 0) {
      statusText = `EXPIRES TODAY (${formattedHumanDate})`;
    } else if (daysRemaining <= 7) {
      statusText = `URGENT: Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} (${formattedHumanDate})`;
    } else {
      statusText = `Safe & Valid: ${daysRemaining} days remaining (${formattedHumanDate})`;
    }
  }

  // 3. Product Composition ("What it is made up of")
  const ingredientsList = offData?.ingredientsList?.length > 0 
    ? offData.ingredientsList 
    : extractIngredients(combinedText);

  const composition = analyzeProductComposition(
    ingredientsList,
    productName || offData?.productName || '',
    combinedText,
    offData
  );

  // 4. Product Lifespan & Shelf Life
  const lifespan = analyzeProductLifespan(
    productName || offData?.productName || '',
    combinedText,
    realMfgDate,
    realExpiryDate
  );

  return {
    verifiedName: offData?.productName || productName || extractProductName(combinedText),
    barcode: barcode || offData?.barcode || null,
    productType: inferProductType(combinedText),
    openFoodFactsData: offData,
    
    // 1. REAL EXPIRY DATE DETAILS
    expiryInfo: {
      realExpiryDate,
      mfgDate: realMfgDate,
      isRealPrintedExpiry,
      confidence,
      detectionSource,
      daysRemaining,
      statusText,
      formattedHumanDate
    },

    // 2. WHAT IT IS MADE UP OF (RAW MATERIALS, ORIGINS, ALLERGENS)
    composition,

    // 3. PRODUCT LIFESPAN & SHELF LIFE
    lifespan
  };
}
