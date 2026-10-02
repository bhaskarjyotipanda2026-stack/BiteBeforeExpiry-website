/**
 * BiteBeforeExpiry — Personalized AI Pantry Service
 * 
 * Computes:
 * - "Use Soon" prioritized queue
 * - "Why this item needs attention" explainability
 * - "Products you frequently waste" (from real database records)
 * - "Consumption pattern" analysis
 * - "Pantry summary"
 * - Safe vs Waste Risk differentiation
 */

import { predictSmartAttention } from '../ml/mlPipeline.js';

export function computePersonalizedPantry({
  pantryItems = [],
  wasteRecords = [],
  userProfile = null
}) {
  const userAllergies = userProfile?.allergies || [];
  const historicalRecords = [...pantryItems, ...wasteRecords];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // 1. Analyze and enrich active pantry items with ML predictions
  const activeItems = pantryItems.filter(item => item.status !== 'consumed' && item.status !== 'wasted');
  
  const enrichedItems = activeItems.map(item => {
    let daysRemaining = 999;
    const expStr = item.expiryDate || item.expiry_date;
    if (expStr) {
      const exp = new Date(expStr);
      exp.setHours(0, 0, 0, 0);
      daysRemaining = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    const ml = predictSmartAttention(item, {
      historicalRecords,
      userAllergies
    });

    return {
      ...item,
      daysRemaining,
      mlPrediction: ml,
      attentionLevel: ml.recommended_attention_level,
      wasteRiskLevel: ml.waste_risk_level,
      foodSafetyStatus: ml.food_safety_status,
      whyAttentionNeeded: ml.explanation
    };
  });

  // 2. "Use Soon" list: Items with daysRemaining <= 7 or elevated attention level
  const useSoonList = enrichedItems
    .filter(i => i.daysRemaining <= 7 || i.attentionLevel === 'URGENT' || i.attentionLevel === 'HIGH')
    .sort((a, b) => {
      // Sort by days remaining first, then waste probability
      if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
      return b.mlPrediction.waste_probability - a.mlPrediction.waste_probability;
    });

  // 3. "Products you frequently waste" analysis
  const wastedEvents = wasteRecords.filter(r => r.status === 'wasted' || r.status === 'discarded');
  let frequentlyWasted = {
    hasData: false,
    message: 'Not enough data yet. Record waste or consumed items to generate insights.',
    categories: [],
    topItems: []
  };

  if (wastedEvents.length >= 2) {
    const categoryCounts = {};
    const itemCounts = {};

    for (const event of wastedEvents) {
      const cat = event.category || 'Other Grocery';
      const name = event.reason || event.name || 'Unknown Item';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      itemCounts[name] = (itemCounts[name] || 0) + 1;
    }

    const sortedCats = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count, percentage: Math.round((count / wastedEvents.length) * 100) }))
      .sort((a, b) => b.count - a.count);

    const sortedItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    frequentlyWasted = {
      hasData: true,
      totalWastedCount: wastedEvents.length,
      categories: sortedCats,
      topItems: sortedItems.slice(0, 5),
      primaryWastedCategory: sortedCats[0]?.category || null,
      message: `Your most frequently wasted category is ${sortedCats[0]?.category} (${sortedCats[0]?.count} items).`
    };
  }

  // 4. "Consumption Pattern"
  const consumedEvents = wasteRecords.filter(r => r.status === 'used' || r.status === 'consumed');
  const totalTrackedOutcomes = wastedEvents.length + consumedEvents.length;

  let consumptionPattern = {
    hasData: false,
    message: 'Not enough data yet.',
    totalOutcomes: totalTrackedOutcomes,
    consumedCount: consumedEvents.length,
    wastedCount: wastedEvents.length,
    wastePreventionRate: 100
  };

  if (totalTrackedOutcomes >= 3) {
    const preventionRate = Math.round((consumedEvents.length / totalTrackedOutcomes) * 100);
    consumptionPattern = {
      hasData: true,
      totalOutcomes: totalTrackedOutcomes,
      consumedCount: consumedEvents.length,
      wastedCount: wastedEvents.length,
      wastePreventionRate: preventionRate,
      summaryText: `You have successfully consumed ${consumedEvents.length} items (${preventionRate}%) and wasted ${wastedEvents.length} items.`
    };
  }

  // 5. "Pantry Summary" with Cross-Category History
  const approachingExpiryCount = enrichedItems.filter(i => i.daysRemaining <= 5 && i.daysRemaining >= 0).length;
  const expiredCount = enrichedItems.filter(i => i.daysRemaining < 0).length;
  
  // Identify items approaching expiry that belong to previously wasted categories
  const previouslyWastedCategories = new Set(wastedEvents.map(w => (w.category || '').toLowerCase()));
  const approachingInWastedCategory = enrichedItems.filter(i => 
    i.daysRemaining <= 5 && 
    i.daysRemaining >= 0 && 
    previouslyWastedCategories.has((i.category || '').toLowerCase())
  ).length;

  // Safe items with high waste risk
  const safeHighWasteRiskCount = enrichedItems.filter(i => 
    i.foodSafetyStatus === 'SAFE' && 
    (i.wasteRiskLevel === 'HIGH' || i.wasteRiskLevel === 'CRITICAL')
  ).length;

  const medicineCount = enrichedItems.filter(i => i.type === 'medicine').length;
  const groceryCount = enrichedItems.filter(i => i.type !== 'medicine').length;

  const pantrySummary = {
    totalActiveItems: enrichedItems.length,
    approachingExpiryCount,
    expiredCount,
    approachingInWastedCategory,
    safeHighWasteRiskCount,
    medicineCount,
    groceryCount,
    narrative: [
      `You have ${approachingExpiryCount} product${approachingExpiryCount === 1 ? '' : 's'} approaching expiry.`,
      approachingInWastedCategory > 0 
        ? `${approachingInWastedCategory} belong${approachingInWastedCategory === 1 ? 's' : ''} to categories that were previously wasted.`
        : null,
      safeHighWasteRiskCount > 0
        ? `${safeHighWasteRiskCount} currently SAFE product${safeHighWasteRiskCount === 1 ? ' has' : 's have'} elevated waste risk.`
        : null
    ].filter(Boolean)
  };

  return {
    useSoonList,
    frequentlyWasted,
    consumptionPattern,
    pantrySummary,
    allEnrichedItems: enrichedItems
  };
}
