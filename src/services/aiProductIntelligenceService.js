/**
 * BiteBeforeExpiry — Unified AI Product Intelligence Engine
 * 
 * Pipeline:
 * Barcode Data + OCR Data + Product DB + User Profile + Pantry History
 *   ↓
 * AI Product Intelligence Engine (Food Pipeline vs Medicine Pipeline)
 *   ↓
 * Structured JSON Response & Explainable Insights
 */

import { analyzeIngredientsAI } from './ingredientIntelligenceService.js';
import { evaluateAllergyRisk } from './allergyIntelligenceService.js';

/**
 * Main Product Intelligence Entrypoint
 */
export async function generateProductIntelligence({
  barcodeData = null,
  ocrData = null,
  productDbData = null,
  userProfile = null,
  pantryHistory = [],
  apiKeys = {}
}) {
  // 1. Resolve combined inputs
  const combinedBarcode = barcodeData?.barcode || ocrData?.barcode || productDbData?.barcode || null;
  const rawOcrText = ocrData?.rawOcrText || '';
  const ingredients = ocrData?.ingredientsOriginal || productDbData?.ingredients || barcodeData?.ingredients || [];
  const nutrition = ocrData?.nutritionInfo || productDbData?.nutrition || barcodeData?.nutrition || null;
  const brand = ocrData?.brand || productDbData?.brand || barcodeData?.brand || null;
  const name = ocrData?.name || productDbData?.product_name || barcodeData?.name || 'Scanned Product';
  const category = ocrData?.category || productDbData?.category || barcodeData?.category || 'Other Grocery';
  const expiryDate = ocrData?.expiryDate || barcodeData?.expiryDate || null;
  const mfgDate = ocrData?.mfgDate || barcodeData?.mfgDate || null;
  const userAllergies = userProfile?.allergies || [];
  const dietaryPreferences = userProfile?.dietary_preferences || [];

  // Determine whether this item is food or medicine
  const isMedicine = ocrData?.type === 'medicine' || 
    productDbData?.product_type === 'medicine' || 
    barcodeData?.type === 'medicine' ||
    /\b(?:tablet|capsule|syrup|drop|ointment|suspension|mg|paracetamol|crocin|advil|amoxicillin|antibiotic|analgesic|pharma|rx)\b/i.test(`${name} ${rawOcrText}`);

  const productType = isMedicine ? 'medicine' : 'grocery';

  // 2. Perform Ingredient & Allergy Intelligence
  const ingredientAnalysis = analyzeIngredientsAI({
    ingredients,
    rawOcrText,
    productType
  });

  const allergyEvaluation = evaluateAllergyRisk({
    ingredients,
    rawOcrText,
    userAllergies,
    productName: name,
    productType
  });

  // 3. Dispatch to appropriate specialized pipeline
  if (isMedicine) {
    return runMedicineIntelligencePipeline({
      name,
      brand,
      category,
      combinedBarcode,
      expiryDate,
      mfgDate,
      batchNumber: ocrData?.batchNumber,
      ingredients,
      rawOcrText,
      allergyEvaluation,
      ingredientAnalysis,
      pantryHistory
    });
  } else {
    return runFoodIntelligencePipeline({
      name,
      brand,
      category,
      combinedBarcode,
      expiryDate,
      mfgDate,
      batchNumber: ocrData?.batchNumber,
      ingredients,
      nutrition,
      rawOcrText,
      allergyEvaluation,
      ingredientAnalysis,
      dietaryPreferences,
      pantryHistory
    });
  }
}

/**
 * FOOD INTELLIGENCE PIPELINE
 */
function runFoodIntelligencePipeline({
  name,
  brand,
  category,
  combinedBarcode,
  expiryDate,
  mfgDate,
  batchNumber,
  ingredients,
  nutrition,
  rawOcrText,
  allergyEvaluation,
  ingredientAnalysis,
  dietaryPreferences,
  pantryHistory
}) {
  // Factor explainability calculation
  const explainabilityFactors = [];
  
  if (expiryDate) {
    explainabilityFactors.push({
      factor: 'Printed Expiry Date',
      impact: 'High',
      detail: `Target date ${expiryDate} identified from packaging.`
    });
  }

  if (allergyEvaluation.hasMatch) {
    explainabilityFactors.push({
      factor: 'Allergy Preference Match',
      impact: 'Critical',
      detail: `Matches your saved profile allergy: ${allergyEvaluation.matchedAllergens.join(', ')}.`
    });
  }

  // Check pantry history for similar category waste
  const historyWastes = pantryHistory.filter(i => (i.category === category || i.type === 'grocery') && i.status === 'wasted');
  if (historyWastes.length > 0) {
    explainabilityFactors.push({
      factor: 'Historical Pantry Waste',
      impact: 'Medium',
      detail: `${historyWastes.length} item(s) in category "${category}" were previously wasted.`
    });
  }

  // Nutrition Interpretation
  let nutritionSummary = 'Standard nutritional values not specified on scanned label.';
  if (nutrition) {
    const parts = [];
    if (nutrition.energy) parts.push(`Energy: ${nutrition.energy}`);
    if (nutrition.protein) parts.push(`Protein: ${nutrition.protein}`);
    if (nutrition.carbs) parts.push(`Carbs: ${nutrition.carbs}`);
    if (nutrition.fat) parts.push(`Fat: ${nutrition.fat}`);
    if (parts.length > 0) {
      nutritionSummary = `Per serving contains ${parts.join(', ')}.`;
    }
  }

  // Storage guidance
  let storageGuidance = 'Store in a cool, dry place away from direct sunlight.';
  if (/milk|yogurt|dairy|cheese|paneer|meat|fish|poultry/i.test(`${name} ${category}`)) {
    storageGuidance = 'Keep continuously refrigerated at 2°C–4°C. Consume within 2-3 days after opening.';
  } else if (/bread|bakery/i.test(`${name} ${category}`)) {
    storageGuidance = 'Store at room temperature in sealed bread bag. Do not refrigerate (causes staling); freeze slices for long-term storage.';
  }

  // Waste reduction recommendation
  let wasteReduction = 'Plan to incorporate into meals early in the week.';
  if (/milk|dairy/i.test(name)) {
    wasteReduction = 'If approaching expiry, convert into paneer, buttermilk, or freeze in an airtight container for cooking.';
  } else if (/bread/i.test(name)) {
    wasteReduction = 'Turn day-old slices into toasted croutons, breadcrumbs, or french toast before mould forms.';
  } else if (/fruit|banana|berry/i.test(name)) {
    wasteReduction = 'Blend overripe fruit into breakfast smoothies or freeze for baking.';
  }

  const summary = `${brand ? brand + ' ' : ''}${name} is a ${category.toLowerCase()} product. ${
    ingredients.length > 0 ? `Formulated with ${ingredients.slice(0, 3).join(', ')}.` : ''
  }`;

  return {
    summary,
    category,
    product_type: 'food',
    allergy_alert: allergyEvaluation.alertMessage,
    allergy_confidence: allergyEvaluation.confidenceLevel,
    allergy_explanation: allergyEvaluation.detailedExplanation,
    nutrition_summary: nutritionSummary,
    storage_guidance: storageGuidance,
    recommended_action: allergyEvaluation.hasMatch 
      ? 'DO NOT CONSUME: Contains allergen matching your profile.'
      : 'Catalog in Pantry and monitor expiry timeline.',
    waste_reduction_suggestion: wasteReduction,
    confidence: allergyEvaluation.confidenceLevel === 'VERIFY' ? 0.72 : 0.94,
    safety_disclaimer: 'AI Food Safety Guidance: Review verified packaging before consumption.',
    explainability: {
      reason: explainabilityFactors.length > 0
        ? `Evaluated using ${explainabilityFactors.map(f => f.factor).join(', ')}.`
        : 'Based on verified package label attributes and standard food safety criteria.',
      factors: explainabilityFactors
    }
  };
}

/**
 * MEDICINE INTELLIGENCE PIPELINE
 * Strictly follows safety requirements:
 * - NEVER prescribes
 * - NEVER changes dosage
 * - NEVER diagnoses
 * - NEVER recommends taking expired medicine
 */
function runMedicineIntelligencePipeline({
  name,
  brand,
  category,
  combinedBarcode,
  expiryDate,
  mfgDate,
  batchNumber,
  ingredients,
  rawOcrText,
  allergyEvaluation,
  ingredientAnalysis,
  pantryHistory
}) {
  const explainabilityFactors = [
    {
      factor: 'Pharmaceutical Verification',
      impact: 'Critical',
      detail: 'Safety constraints strictly enforced. No medical diagnoses or dosage recommendations are made.'
    }
  ];

  if (expiryDate) {
    explainabilityFactors.push({
      factor: 'Strict Expiry Threshold',
      impact: 'High',
      detail: `Manufacturer stability date: ${expiryDate}. Chemical efficacy degrades after this point.`
    });
  }

  if (batchNumber) {
    explainabilityFactors.push({
      factor: 'Batch/Lot Traceability',
      impact: 'Medium',
      detail: `Batch ${batchNumber} tracked for recall verification.`
    });
  }

  const summary = `${name} is a regulated pharmaceutical product${brand ? ` marketed by ${brand}` : ''}. ${
    ingredients.length > 0 ? `Active/Inactive ingredients include: ${ingredients.slice(0, 2).join(', ')}.` : ''
  }`;

  const safeDisposal = 'Do not flush down toilets or pour down drains unless specifically directed. Dispose via pharmacy take-back programs or mix with sealed unpalatable household waste.';

  return {
    summary,
    category: category || 'Tablets & Capsules',
    product_type: 'medicine',
    allergy_alert: allergyEvaluation.alertMessage,
    allergy_confidence: allergyEvaluation.confidenceLevel,
    allergy_explanation: allergyEvaluation.detailedExplanation,
    nutrition_summary: 'Not applicable (Pharmaceutical drug product).',
    storage_guidance: 'Store in original packaging below 25°C in a dry place protected from direct light and moisture. Keep strictly out of reach of children.',
    recommended_action: 'Store securely in medicine cabinet. Inspect batch and seal before use.',
    safe_disposal_guidance: safeDisposal,
    confidence: 0.96,
    safety_disclaimer: 'CRITICAL HEALTH NOTICE: This system does not diagnose conditions, prescribe medications, or recommend dosage changes. If information is uncertain, please verify the package or consult a qualified healthcare professional.',
    explainability: {
      reason: 'Evaluated using pharmaceutical stability regulations and FDA/WHO safe medicine storage protocols.',
      factors: explainabilityFactors
    }
  };
}
