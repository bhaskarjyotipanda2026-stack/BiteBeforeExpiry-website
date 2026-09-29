/**
 * Health Score & Clean Eating Evaluation Service
 * Evaluates food products and individual ingredients on a 0-100 scale based on:
 * 1. NOVA Classification (Unprocessed, Processed Culinary, Processed, Ultra-Processed)
 * 2. Nutritional density (Protein, Fiber, Micronutrients vs Added Sugar/Preservatives)
 * 3. Additive & preservative safety profile
 */

// Additive and preservative penalty registry
const HIGH_CONCERN_ADDITIVES = {
  'preservative (282)': { penalty: 18, reason: 'Calcium propionate preservative' },
  'preservative 282': { penalty: 18, reason: 'Synthetic bread preservative' },
  'sodium benzoate': { penalty: 20, reason: 'Chemical preservative (E211)' },
  'potassium sorbate': { penalty: 15, reason: 'Synthetic antifungal preservative' },
  'msg': { penalty: 15, reason: 'Monosodium glutamate flavor enhancer' },
  'monosodium glutamate': { penalty: 15, reason: 'Added excitotoxin flavor enhancer' },
  'tartrazine': { penalty: 25, reason: 'Synthetic azo dye (Yellow 5)' },
  'artificial color': { penalty: 20, reason: 'Synthetic petroleum-derived dye' },
  'high fructose corn syrup': { penalty: 25, reason: 'High glycemic processed sweetener' },
  'hydrogenated': { penalty: 25, reason: 'Industrial trans fat source' },
  'palm oil': { penalty: 15, reason: 'High saturated fatty acid profile' },
  'aspartame': { penalty: 20, reason: 'Synthetic non-nutritive sweetener' },
  'acesulfame k': { penalty: 20, reason: 'Artificial intense sweetener' },
  'sodium nitrite': { penalty: 25, reason: 'Curing agent preservative' },
  'bht': { penalty: 22, reason: 'Chemical antioxidant additive (E321)' },
  'bha': { penalty: 22, reason: 'Synthetic preservative (E320)' }
};

// Positive whole food / nutrient boosts
const WHOLE_FOOD_BOOSTS = {
  'milk': { boost: 12, reason: 'Complete dairy protein & bioavailable calcium' },
  'paneer': { boost: 14, reason: 'High biological value protein & phosphorus' },
  'cottage cheese': { boost: 14, reason: 'Clean unfermented casein protein' },
  'egg': { boost: 15, reason: 'Gold standard complete amino acid profile & choline' },
  'eggs': { boost: 15, reason: 'Complete protein with lutein & zeaxanthin' },
  'wheat': { boost: 10, reason: 'Complex carbohydrates & insoluble dietary fiber' },
  'whole wheat': { boost: 14, reason: 'Whole grain bran, germ & B-vitamins' },
  'spinach': { boost: 16, reason: 'High folate, iron, and antioxidant carotenoids' },
  'tomato': { boost: 14, reason: 'High in lycopene & Vitamin C' },
  'tomatoes': { boost: 14, reason: 'Lycopene & potassium' },
  'potato': { boost: 8, reason: 'Potassium-rich complex starchy vegetable' },
  'onion': { boost: 10, reason: 'Prebiotic inulin & quercetin flavonoid' },
  'garlic': { boost: 12, reason: 'Allicin antimicrobial compound' },
  'oats': { boost: 14, reason: 'Beta-glucan soluble fiber for cholesterol support' },
  'dal': { boost: 14, reason: 'Plant protein & low glycemic dietary fiber' },
  'rice': { boost: 8, reason: 'Easily digestible hypoallergenic carbohydrate' },
  'curd': { boost: 15, reason: 'Live active probiotic cultures for gut microbiome' },
  'yogurt': { boost: 15, reason: 'Lactobacillus probiotics & calcium' },
  'vitamin a': { boost: 6, reason: 'Essential micronutrient for vision and immunity' },
  'vitamin d': { boost: 8, reason: 'Bone health & immune system regulator' },
  'apple': { boost: 12, reason: 'Dietary pectin fiber & polyphenols' },
  'banana': { boost: 10, reason: 'Potassium & natural sustained fuel' }
};

/**
 * Calculates health score (0 to 100) for a product or ingredient list
 */
export function calculateHealthScore(itemOrIngredients) {
  let ingredients = [];
  let name = '';
  let type = 'grocery';

  if (Array.isArray(itemOrIngredients)) {
    ingredients = itemOrIngredients;
  } else if (typeof itemOrIngredients === 'string') {
    ingredients = [itemOrIngredients];
    name = itemOrIngredients;
  } else if (itemOrIngredients && typeof itemOrIngredients === 'object') {
    ingredients = itemOrIngredients.ingredientsOriginal || [];
    name = itemOrIngredients.name || '';
    type = itemOrIngredients.type || 'grocery';
  }

  // Medicines have a clinical safety rating rather than food health score
  if (type === 'medicine') {
    return {
      score: 85,
      grade: 'A',
      verdict: 'Pharmaceutical Grade 💊',
      color: 'teal',
      novaClass: 'Clinical Formulation',
      positivePoints: ['Regulated therapeutic compound', 'Standardized active dosing'],
      cautionPoints: ['Follow physician dosage instructions', 'Check contraindications'],
      dietaryTags: ['Medical Therapy']
    };
  }

  let baseScore = 78;
  const positivePoints = [];
  const cautionPoints = [];
  const dietaryTags = [];

  const textToCheck = `${name} ${ingredients.join(' ')}`.toLowerCase();

  // 1. Evaluate penalties for additives & artificial ingredients
  let penaltyTotal = 0;
  for (const [additive, info] of Object.entries(HIGH_CONCERN_ADDITIVES)) {
    if (textToCheck.includes(additive)) {
      penaltyTotal += info.penalty;
      cautionPoints.push(info.reason);
    }
  }

  // Check added sugar
  if (textToCheck.includes('sugar') || textToCheck.includes('sucrose')) {
    penaltyTotal += 8;
    cautionPoints.push('Contains added refined sugar');
  }

  // 2. Evaluate boosts for whole foods & clean ingredients
  let boostTotal = 0;
  for (const [food, info] of Object.entries(WHOLE_FOOD_BOOSTS)) {
    if (textToCheck.includes(food)) {
      boostTotal += info.boost;
      if (positivePoints.length < 4 && !positivePoints.includes(info.reason)) {
        positivePoints.push(info.reason);
      }
    }
  }

  // If no ingredients listed, estimate from name
  if (ingredients.length === 0) {
    if (textToCheck.includes('fresh') || textToCheck.includes('milk') || textToCheck.includes('vegetable')) {
      boostTotal += 12;
      positivePoints.push('Fresh unprocessed produce');
    }
  }

  // Compute final score bounded between 20 and 99
  let finalScore = Math.round(baseScore + boostTotal - penaltyTotal);
  finalScore = Math.min(98, Math.max(25, finalScore));

  // Determine NOVA Processing Category
  let novaClass = 'Group 1: Unprocessed / Whole Food';
  if (penaltyTotal >= 20 || textToCheck.includes('preservative') || textToCheck.includes('hydrogenated')) {
    novaClass = 'Group 4: Ultra-Processed Food (UPF)';
  } else if (penaltyTotal > 0 || textToCheck.includes('sugar') || textToCheck.includes('oil')) {
    novaClass = 'Group 3: Processed Food';
  } else if (textToCheck.includes('flour') || textToCheck.includes('butter')) {
    novaClass = 'Group 2: Processed Culinary Ingredient';
  }

  // Assign Grade, Verdict and Color
  let grade = 'B';
  let verdict = 'Healthy & Nutritious 🟢';
  let color = 'emerald';

  if (finalScore >= 85) {
    grade = 'A';
    verdict = 'Super Clean & Whole Food 🥗';
    color = 'emerald';
  } else if (finalScore >= 70) {
    grade = 'B';
    verdict = 'Healthy & Nutritious 🟢';
    color = 'green';
  } else if (finalScore >= 50) {
    grade = 'C';
    verdict = 'Moderate / Lightly Processed 🟡';
    color = 'amber';
  } else {
    grade = 'D';
    verdict = 'High Additives / Ultra-Processed 🔴';
    color = 'rose';
  }

  // Dietary Tags
  if (textToCheck.includes('milk') || textToCheck.includes('paneer') || textToCheck.includes('egg')) {
    dietaryTags.push('High Protein');
  }
  if (textToCheck.includes('milk') || textToCheck.includes('paneer') || textToCheck.includes('cheese')) {
    dietaryTags.push('Calcium Rich');
  }
  if (textToCheck.includes('spinach') || textToCheck.includes('tomato') || textToCheck.includes('carrot')) {
    dietaryTags.push('Antioxidant Rich');
  }
  if (textToCheck.includes('wheat') || textToCheck.includes('oats')) {
    dietaryTags.push('Good Fiber');
  }
  if (cautionPoints.length === 0) {
    dietaryTags.push('Clean Label (Zero Preservatives)');
  }

  return {
    score: finalScore,
    grade,
    verdict,
    color,
    novaClass,
    positivePoints: positivePoints.length > 0 ? positivePoints : ['Natural nutritional foundation'],
    cautionPoints,
    dietaryTags
  };
}

/**
 * Calculates individual health score for a single ingredient
 */
export function getSingleIngredientScore(ingredientName = '') {
  return calculateHealthScore([ingredientName]);
}
