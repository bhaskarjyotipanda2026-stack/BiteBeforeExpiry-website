/**
 * BiteBeforeExpiry — Intelligent Alert & Notification Engine
 * 
 * Generates prioritized, non-spammy alerts categorized by clinical and safety urgency:
 * 1. CRITICAL: Expired or Expiry Today (Highest Priority)
 * 2. ALLERGY: Potential allergen detected matching active user profile
 * 3. CONFLICT: Conflicting barcode catalog vs OCR package date
 * 4. OCR_VERIFY: OCR confidence low or missing date requiring verification
 * 5. WASTE_RISK: High probability of waste predicted by ML engine
 * 6. EXPIRY_SOON: Items approaching expiry within configured lead threshold
 */

import { evaluateAllergyRisk } from './allergyIntelligenceService.js';
import { predictSmartAttention } from '../ml/mlPipeline.js';

export const ALERT_PRIORITY = {
  CRITICAL: 1,
  WARNING: 2,
  ATTENTION: 3,
  INFO: 4
};

export function getPrioritizedAlerts({
  items = [],
  userProfile = null,
  wasteRecords = [],
  settings = {}
}) {
  const alerts = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const leadDays = settings.notificationLeadDays || 3;
  const userAllergies = userProfile?.allergies || settings.userAllergies || [];
  const historicalRecords = [...items, ...wasteRecords];

  const activeItems = items.filter(i => i.status !== 'used' && i.status !== 'wasted' && i.status !== 'discarded');

  for (const item of activeItems) {
    let daysRemaining = null;
    const expStr = item.expiryDate || item.expiry_date;
    if (expStr) {
      const exp = new Date(expStr);
      exp.setHours(0, 0, 0, 0);
      daysRemaining = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // 1. CRITICAL: Expired or Expiry Today
    if (daysRemaining !== null && daysRemaining <= 0) {
      alerts.push({
        id: `alert_exp_${item.id}`,
        itemId: item.id,
        item,
        type: daysRemaining === 0 ? 'expiry_today' : 'expired',
        priority: ALERT_PRIORITY.CRITICAL,
        priorityLabel: 'CRITICAL',
        title: daysRemaining === 0 
          ? `Expires Today: ${item.name}` 
          : `Expired ${Math.abs(daysRemaining)}d ago: ${item.name}`,
        message: item.type === 'medicine'
          ? 'Expired pharmaceutical product. Chemical stability degraded. Do not consume. Dispose safely.'
          : 'Product has passed its printed expiration date. Removed from active-use recommendations.',
        actionLabel: item.type === 'medicine' ? 'Safe Medical Disposal' : 'Record Waste / Discard',
        actionType: 'record_outcome',
        timestamp: new Date().toISOString()
      });
      continue; // Expired items already receive top priority
    }

    // 2. ALLERGY ATTENTION
    if (userAllergies.length > 0 && (item.ingredientsOriginal || item.rawOcrText)) {
      const allergyCheck = evaluateAllergyRisk({
        ingredients: item.ingredientsOriginal || [],
        rawOcrText: item.rawOcrText || '',
        userAllergies,
        productName: item.name,
        productType: item.type || 'grocery'
      });

      if (allergyCheck.hasMatch) {
        alerts.push({
          id: `alert_allergy_${item.id}`,
          itemId: item.id,
          item,
          type: 'allergy_attention',
          priority: allergyCheck.confidenceLevel === 'ATTENTION' ? ALERT_PRIORITY.CRITICAL : ALERT_PRIORITY.WARNING,
          priorityLabel: allergyCheck.confidenceLevel,
          title: `Allergen Match Detected: ${item.name}`,
          message: allergyCheck.alertMessage + ' ' + allergyCheck.detailedExplanation,
          actionLabel: 'Review Allergen Details',
          actionType: 'view_details',
          timestamp: new Date().toISOString()
        });
      }
    }

    // 3. CONFLICTING INFORMATION
    if (item.conflictDetected || item.hasConflict || (item.conflicts && item.conflicts.length > 0)) {
      alerts.push({
        id: `alert_conflict_${item.id}`,
        itemId: item.id,
        item,
        type: 'conflicting_information',
        priority: ALERT_PRIORITY.WARNING,
        priorityLabel: 'WARNING',
        title: `Information Conflict: ${item.name}`,
        message: item.conflictMessage || 'Barcode database catalog attributes and optical label text differ. Please review physical packaging.',
        actionLabel: 'Verify Label',
        actionType: 'edit_details',
        timestamp: new Date().toISOString()
      });
    }

    // 4. OCR VERIFICATION REQUIRED
    if (item.requiresVerification || (!item.expiryDate && item.sourceOfInfo !== 'manual')) {
      alerts.push({
        id: `alert_ocr_${item.id}`,
        itemId: item.id,
        item,
        type: 'ocr_verification_required',
        priority: ALERT_PRIORITY.ATTENTION,
        priorityLabel: 'VERIFY',
        title: `Verification Required: ${item.name}`,
        message: 'OCR could not confidently detect the printed expiration date. Please confirm with packaging.',
        actionLabel: 'Set Expiry Date',
        actionType: 'edit_details',
        timestamp: new Date().toISOString()
      });
    }

    // 5. HIGH WASTE PROBABILITY PREDICTION
    const ml = predictSmartAttention(item, { historicalRecords, userAllergies });
    if (ml.waste_risk_level === 'CRITICAL' || ml.waste_risk_level === 'HIGH') {
      alerts.push({
        id: `alert_waste_${item.id}`,
        itemId: item.id,
        item,
        type: 'high_waste_probability',
        priority: ALERT_PRIORITY.ATTENTION,
        priorityLabel: 'WASTE RISK',
        title: `Elevated Waste Risk: ${item.name}`,
        message: `Predicted ${Math.round(ml.waste_probability * 100)}% waste probability based on historical consumption velocity.`,
        actionLabel: 'View Recipe / Repurpose',
        actionType: 'repurpose',
        timestamp: new Date().toISOString()
      });
    }

    // 6. EXPIRY APPROACHING
    if (daysRemaining !== null && daysRemaining > 0 && daysRemaining <= leadDays) {
      alerts.push({
        id: `alert_soon_${item.id}`,
        itemId: item.id,
        item,
        type: 'expiry_approaching',
        priority: ALERT_PRIORITY.WARNING,
        priorityLabel: 'USE SOON',
        title: `Expiring Soon: ${item.name}`,
        message: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Plan to consume or freeze promptly.`,
        actionLabel: 'View Item',
        actionType: 'view_details',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Sort by priority (1 is highest), then by item daysRemaining
  return alerts.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const daysA = a.item?.expiryDate ? new Date(a.item.expiryDate).getTime() : 9999999999;
    const daysB = b.item?.expiryDate ? new Date(b.item.expiryDate).getTime() : 9999999999;
    return daysA - daysB;
  });
}

/**
 * Convenience wrapper supporting (items, settings, wasteRecords) or ({ items, ... })
 */
export function generateIntelligentAlerts(arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    return getPrioritizedAlerts({
      items: arg1,
      settings: arg2 || {},
      userProfile: { allergies: arg2?.allergyProfile || arg2?.userAllergies || [] },
      wasteRecords: arg3 || []
    });
  }
  return getPrioritizedAlerts(arg1 || {});
}
