/**
 * BiteBeforeExpiry — Medicine Expiry & Healthcare Inventory Service
 * 
 * Clinical Safety Mandates:
 * 1. NEVER provide medical diagnosis, prescription advice, or dosage alterations.
 * 2. NEVER suggest culinary recipes for medicines or pharmaceutical items.
 * 3. Expired medicines must ALWAYS be quarantined for safe disposal (DO NOT INGEST).
 * 4. Transparent provenance indicators for every field:
 *    - USER INPUT
 *    - VERIFIED SOURCE DATA (OpenFDA / NDC)
 *    - OCR RESULT
 *    - AI-GENERATED INFORMATION (Requires User Confirmation)
 * 5. Safe disposal protocols according to FDA & WHO guidelines (Take-Back programs).
 */

import { calculateDaysRemaining } from './fefoService.js';

export const MEDICINE_PROVENANCE = {
  USER_INPUT: 'USER_INPUT',
  VERIFIED_SOURCE_DATA: 'VERIFIED_SOURCE_DATA',
  OCR_RESULT: 'OCR_RESULT',
  AI_GENERATED_CONFIRMATION_REQUIRED: 'AI_GENERATED_CONFIRMATION_REQUIRED'
};

export const RECALL_STATUS = {
  CLEAR: 'CLEAR',
  POTENTIAL_MATCH: 'POTENTIAL_MATCH',
  CONFIRMED_RECALL: 'CONFIRMED_RECALL'
};

// Curated verified database of known pharmaceutical batch recalls for safety testing
export const KNOWN_PHARMACEUTICAL_RECALLS = [
  {
    medicine_name: 'Paracetamol Pediatric Oral Suspension',
    brand: 'Generic Care',
    batch_number: 'PARA-REC-2024-09',
    reason: 'Trace particulate contamination identified in specific lot during stability testing.',
    severity: 'Class II',
    actionRequired: 'Immediately cease dispensing. Return to manufacturer distributor or pharmacy take-back.'
  },
  {
    medicine_name: 'Eye Lubricant Drops 10ml',
    brand: 'OptiClear Health',
    batch_number: 'OPT-7712-B',
    reason: 'Potential lack of sterility in bottle dropper tip.',
    severity: 'Class I',
    actionRequired: 'DO NOT USE. Immediately quarantine bottle. Risk of ocular irritation or infection.'
  },
  {
    medicine_name: 'Amoxicillin Trihydrate 500mg',
    brand: 'Biocure Labs',
    batch_number: 'AMX-404-X',
    reason: 'Sub-potent active pharmaceutical ingredient dissolution failure in accelerated study.',
    severity: 'Class II',
    actionRequired: 'Do not distribute. Contact pharmacy for replacement batch.'
  }
];

/**
 * Standard FDA / WHO Safe Disposal Guidance
 */
export function getSafeDisposalGuidance(medicineName, isControlledSubstance = false) {
  return {
    primaryMethod: 'Authorized Drug Take-Back Program',
    primaryInstructions: 'The safest disposal method is dropping unneeded or expired medication off at an authorized DEA/FDA drug take-back site or local pharmacy collection kiosk.',
    householdFallback: 'If no take-back program is immediately available: (1) Mix medicine (do not crush tablets) with an unpalatable substance such as used coffee grounds, cat litter, or dirt. (2) Place mixture into a sealable container or plastic bag. (3) Throw container into household trash. (4) Scratch off personal details on prescription label before recycling container.',
    flushDisclaimer: 'DO NOT flush medicines down the toilet or sink drain unless explicitly directed on FDA Flush List.',
    disclaimer: 'CLINICAL NOTICE: BiteBeforeExpiry does not provide medical diagnoses or prescription advice. Always consult a licensed healthcare professional or pharmacist regarding medication concerns.'
  };
}

/**
 * Evaluates medicine batch against known recall registry
 */
export function checkBatchRecall(medicineName = '', batchNumber = '') {
  if (!batchNumber) {
    return {
      status: RECALL_STATUS.CLEAR,
      details: null
    };
  }

  const cleanBatch = batchNumber.trim().toUpperCase();
  const cleanName = medicineName.trim().toLowerCase();

  const match = KNOWN_PHARMACEUTICAL_RECALLS.find(r => 
    r.batch_number.toUpperCase() === cleanBatch ||
    (r.medicine_name.toLowerCase() === cleanName && r.batch_number.toUpperCase() === cleanBatch)
  );

  if (match) {
    return {
      status: RECALL_STATUS.CONFIRMED_RECALL,
      details: match
    };
  }

  return {
    status: RECALL_STATUS.CLEAR,
    details: null
  };
}

/**
 * Evaluates medicine expiry status and clinical safety directives
 */
export function evaluateMedicineStatus(medicineItem) {
  const days = calculateDaysRemaining(medicineItem.expiry_date);
  const recallCheck = checkBatchRecall(medicineItem.medicine_name, medicineItem.batch_number);

  let status = 'ACTIVE';
  let safetyDirective = '';
  let canAdminister = true;

  if (recallCheck.status === RECALL_STATUS.CONFIRMED_RECALL) {
    status = 'RECALLED';
    canAdminister = false;
    safetyDirective = `CRITICAL SAFETY ALERT: This batch (${medicineItem.batch_number}) is subject to a manufacturer recall. DO NOT ADMINISTER. ${recallCheck.details.actionRequired}`;
  } else if (days !== null && days <= 0) {
    status = 'EXPIRED';
    canAdminister = false;
    safetyDirective = 'MEDICATION EXPIRED: Potency and chemical stability are no longer guaranteed. Degradation products can cause reduced efficacy or toxicity. DO NOT INGEST. Quarantine for safe pharmaceutical disposal.';
  } else if (days !== null && days <= 14) {
    status = 'EXPIRING_SOON';
    safetyDirective = `Expiring soon (${days} days remaining). Review treatment schedule and prepare reorder if treatment is ongoing.`;
  } else {
    status = 'ACTIVE';
    safetyDirective = `Safe for use within labeled shelf life (${days || 'N/A'} days remaining). Store in recommended conditions.`;
  }

  return {
    daysRemaining: days,
    status,
    canAdminister,
    safetyDirective,
    recallCheck,
    disposalGuidance: getSafeDisposalGuidance(medicineItem.medicine_name)
  };
}
