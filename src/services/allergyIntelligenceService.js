/**
 * BiteBeforeExpiry — AI Allergy Intelligence Service
 * 
 * Evaluates food/medicine package ingredients against user's allergy profile.
 * 
 * Confidence Levels:
 * - CLEAR: No matching allergens or cross-contact warnings found in parsed text.
 * - ATTENTION: Potential allergen detected (direct ingredient or advisory match).
 * - VERIFY: Ingredient text is degraded, truncated, or ambiguous.
 * 
 * Strict Clinical Safety Policy:
 * - Never claims a product is "100% medically safe".
 * - Always preserves original packaging text for independent user verification.
 */

import { analyzeIngredientsAI } from './ingredientIntelligenceService.js';

export function evaluateAllergyRisk({
  ingredients = [],
  rawOcrText = '',
  userAllergies = [],
  productName = '',
  productType = 'grocery'
}) {
  const profile = Array.isArray(userAllergies) ? userAllergies : [];

  // If user has no active allergy profile configured
  if (profile.length === 0) {
    return {
      status: 'CLEAR',
      hasMatch: false,
      matchedAllergens: [],
      alertMessage: 'No active allergies configured in profile.',
      detailedExplanation: 'Configure your allergies in Settings to activate AI cross-contact monitoring.',
      confidenceLevel: 'CLEAR',
      preservesRawLabel: true,
      originalText: rawOcrText,
      medicalDisclaimer: 'Always review physical package labels before consumption.'
    };
  }

  // Analyze ingredients with AI Ingredient Intelligence
  const analysis = analyzeIngredientsAI({
    ingredients,
    rawOcrText,
    productType
  });

  // Check if ingredients were unreadable or ambiguous
  if (analysis.isUnclear && (!ingredients || ingredients.length === 0)) {
    return {
      status: 'VERIFY',
      hasMatch: false,
      matchedAllergens: [],
      alertMessage: 'Ingredient information is unclear. Please verify the package.',
      detailedExplanation: 'Optical scan was unable to confidently parse the complete ingredient statement. Due to safety rules, please inspect the physical package directly.',
      confidenceLevel: 'VERIFY',
      preservesRawLabel: true,
      originalText: rawOcrText,
      medicalDisclaimer: 'Safety baseline: Optical ambiguity requires direct package confirmation.'
    };
  }

  const matched = [];
  const triggerDetails = [];

  for (const userAllergen of profile) {
    const userCategoryLower = userAllergen.toLowerCase();

    // 1. Direct match in identified allergens from normalized list
    const foundDirect = analysis.identifiedAllergens.find(
      cat => cat.toLowerCase().includes(userCategoryLower) || userCategoryLower.includes(cat.toLowerCase())
    );

    // 2. Check individual normalized ingredients for specific triggers
    const triggerIng = analysis.normalizedIngredients.find(item => {
      if (!item) return false;
      if (item.allergenCategory && (
        item.allergenCategory.toLowerCase().includes(userCategoryLower) ||
        userCategoryLower.includes(item.allergenCategory.toLowerCase())
      )) {
        return true;
      }
      return false;
    });

    // 3. Check "May Contain" cross-contact advisory
    const isMayContain = analysis.advisoryStatements.mayContainStatements.some(stmt => {
      return stmt.toLowerCase().includes(userCategoryLower.split(' ')[0]);
    });

    if (foundDirect || triggerIng || isMayContain) {
      matched.push(userAllergen);
      triggerDetails.push({
        allergenCategory: userAllergen,
        triggerIngredient: triggerIng ? triggerIng.original : userAllergen,
        isCrossContactAdvisory: isMayContain && !triggerIng,
        explanation: triggerIng
          ? `Product contains "${triggerIng.original}", which is categorized under ${userAllergen}.`
          : `Package carries a cross-contact advisory ("May contain ${userAllergen}").`
      });
    }
  }

  // Status calculation
  if (matched.length > 0) {
    const isAdvisoryOnly = triggerDetails.every(d => d.isCrossContactAdvisory);
    return {
      status: isAdvisoryOnly ? 'VERIFY' : 'ATTENTION',
      hasMatch: true,
      matchedAllergens: matched,
      triggerDetails,
      alertMessage: isAdvisoryOnly ? 'Potential allergen detected (Advisory statement). Please verify.' : 'Potential allergen detected.',
      detailedExplanation: triggerDetails.map(t => t.explanation).join(' '),
      confidenceLevel: isAdvisoryOnly ? 'VERIFY' : 'ATTENTION',
      preservesRawLabel: true,
      originalText: rawOcrText,
      medicalDisclaimer: 'AI Food Safety Notice: Does not replace professional clinical advice or manufacturer labeling.'
    };
  }

  // If ambiguous OCR detected even without matching known allergens
  if (analysis.isUnclear) {
    return {
      status: 'VERIFY',
      hasMatch: false,
      matchedAllergens: [],
      triggerDetails: [],
      alertMessage: 'Ingredient information is unclear. Please verify the package.',
      detailedExplanation: 'No configured allergens were detected, but some portions of the ingredient label were degraded or difficult to read.',
      confidenceLevel: 'VERIFY',
      preservesRawLabel: true,
      originalText: rawOcrText,
      medicalDisclaimer: 'Always verify physical labeling when optical scan is partially obscured.'
    };
  }

  // Clean
  return {
    status: 'CLEAR',
    hasMatch: false,
    matchedAllergens: [],
    triggerDetails: [],
    alertMessage: 'No declared allergens matching your profile were detected.',
    detailedExplanation: `Scanned ingredients and package text do not contain declared matches for: ${profile.join(', ')}.`,
    confidenceLevel: 'CLEAR',
    preservesRawLabel: true,
    originalText: rawOcrText,
    medicalDisclaimer: 'Manufacturer formulations may change. Always inspect the physical packaging before consumption.'
  };
}
