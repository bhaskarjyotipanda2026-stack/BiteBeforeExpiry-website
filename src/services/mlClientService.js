/**
 * BiteBeforeExpiry — Production ML Client & Resilient Fallback Engine
 * 
 * Communicates with the Python ML Inference REST API:
 *   POST /predict/product-category
 *   POST /predict/ingredients
 *   POST /predict/expiry
 *   POST /predict/semantic-search
 *   POST /analyze/product
 * 
 * RESILIENT PRODUCTION FALLBACK:
 * If the Python ML microservice is unreachable, offline, or times out,
 * this client automatically and transparently falls back to local client-side
 * models and heuristics without crashing or blocking user workflows.
 */

import { generateProductIntelligence } from './aiProductIntelligenceService.js';
import { dbService } from './dbService.js';

const ML_API_BASE = import.meta.env?.VITE_ML_API_URL || 'http://127.0.0.1:8000';
const DEFAULT_TIMEOUT_MS = 3000;

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const mlClientService = {
  baseUrl: ML_API_BASE,

  /**
   * Health check to detect whether ML inference microservice is active
   */
  async checkHealth() {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/health`, {}, 1500);
      if (res.ok) {
        return await res.json();
      }
      return { status: 'degraded', isFallback: true };
    } catch (_) {
      return { status: 'offline', isFallback: true };
    }
  },

  /**
   * Retrieve registered model versions, architectures and evaluation metrics
   */
  async getModelsInfo() {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/models/info`, {}, 2000);
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      models: [
        {
          name: 'bitebeforeexpiry-local-client-v1',
          architecture: 'Client-side 9-D Logistic Regression & Heuristics',
          status: 'active-fallback'
        }
      ]
    };
  },

  /**
   * Predict product category (food, medicine, other)
   */
  async predictCategory({ name = '', brand = '', ingredientsText = '', rawOcrText = '' }) {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/predict/product-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_name: name, brand, ingredients_text: ingredientsText, raw_ocr_text: rawOcrText })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.info('[ML Client] Microservice unavailable, using local category classifier fallback.');
    }

    // Local Fallback Classifier
    const combined = `${name} ${brand} ${ingredientsText} ${rawOcrText}`.toLowerCase();
    const isMed = /\b(?:tablet|capsule|syrup|drop|ointment|suspension|mg|paracetamol|crocin|advil|amoxicillin|antibiotic|analgesic|pharma|rx)\b/i.test(combined);
    const isOther = /\b(?:detergent|cleaner|soap|shampoo|liquid handwash|bleach|harpic|surf)\b/i.test(combined);

    const prediction = isMed ? 'medicine' : (isOther ? 'other' : 'food');
    return {
      prediction,
      confidence: 0.82,
      probabilities: { [prediction]: 0.82 },
      source: 'Local Client-Side Engine (Offline Fallback)',
      model_version: 'bitebeforeexpiry-client-fallback-v1',
      dataset_version: 'local-taxonomy-v1',
      needs_confirmation: isMed,
      is_fallback: true
    };
  },

  /**
   * Predict ingredient categorization, allergen triggers, and explainability
   */
  async predictIngredients({ ingredients = [], rawText = '' }) {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/predict/ingredients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, raw_text: rawText })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.info('[ML Client] Microservice unavailable, using local ingredient intelligence fallback.');
    }

    // Local Fallback
    const list = Array.isArray(ingredients) ? ingredients : [ingredients];
    const categorized = list.map(ing => ({
      ingredient: ing,
      normalized: String(ing).toLowerCase().trim(),
      category: /milk|butter|cheese|curd/i.test(ing) ? 'Dairy' : (/flour|wheat|oat|grain/i.test(ing) ? 'Grain' : 'General Ingredient'),
      allergen: /peanut|groundnut/i.test(ing) ? 'Peanuts' : (/milk|dairy|lactose/i.test(ing) ? 'Milk & Dairy' : null)
    }));

    const allergenAlerts = categorized.filter(c => c.allergen).map(c => c.allergen);

    return {
      extracted_ingredients: list,
      categorized_ingredients: categorized,
      allergen_alerts: allergenAlerts,
      explanations: {},
      model_version: 'bitebeforeexpiry-ingredient-client-v1',
      dataset_version: 'local-taxonomy-v1',
      source: 'Local Client-Side Engine (Offline Fallback)',
      confidence: 0.80,
      needs_confirmation: allergenAlerts.length > 0,
      is_fallback: true
    };
  },

  /**
   * Predict and validate expiry & manufacturing dates from OCR
   */
  async predictExpiry({ rawOcrText = '', category = 'other', mfgDate = null }) {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/predict/expiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_ocr_text: rawOcrText, category, mfg_date: mfgDate })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.info('[ML Client] Microservice unavailable, using local date parser fallback.');
    }

    // Local Fallback Parser
    let parsedExpiry = null;
    const isoMatch = rawOcrText.match(/\b(20\d\d)[\/\-\.]([0-1]?[0-9])[\/\-\.]([0-3]?[0-9])\b/);
    if (isoMatch) {
      parsedExpiry = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
    }

    const isValid = Boolean(parsedExpiry && (!mfgDate || parsedExpiry >= mfgDate));
    return {
      expiry_date: parsedExpiry,
      mfg_date: mfgDate,
      is_valid: isValid,
      confidence: parsedExpiry ? 0.85 : 0.20,
      validation_notes: parsedExpiry ? [] : ['No unambiguous date found.'],
      model_version: 'bitebeforeexpiry-expiry-client-v1',
      source: 'Local Client-Side Engine (Offline Fallback)',
      needs_confirmation: !isValid || !parsedExpiry,
      is_fallback: true
    };
  },

  /**
   * Semantic vector search across product and ingredient knowledge layer
   */
  async semanticSearch({ query = '', topK = 5 }) {
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/predict/semantic-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_k: topK })
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.info('[ML Client] Microservice unavailable for semantic search, returning empty fallback.');
    }

    return {
      query,
      top_k: topK,
      results: [],
      model_version: 'vector-semantic-client-fallback',
      is_fallback: true
    };
  },

  /**
   * Unified Product Analysis Pipeline
   */
  async analyzeProduct({
    name = '',
    barcode = null,
    rawOcrText = '',
    ingredients = [],
    userAllergies = [],
    userId = null,
    scanId = null
  }) {
    let result = null;
    try {
      const res = await fetchWithTimeout(`${this.baseUrl}/analyze/product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: name,
          name,
          barcode,
          raw_ocr_text: rawOcrText,
          rawText: rawOcrText,
          ingredients,
          user_allergies: userAllergies
        })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (err) {
      console.info('[ML Client] Unified remote analysis failed, dispatching to local fallback pipeline.');
    }

    if (!result) {
      // Local Heuristic Fallback
      const localIntel = await generateProductIntelligence({
        barcodeData: barcode ? { barcode, name } : null,
        ocrData: { rawOcrText, ingredientsOriginal: ingredients },
        userProfile: { allergies: userAllergies }
      });

      result = {
        product_type: localIntel.product_type || 'grocery',
        category_prediction: {
          prediction: localIntel.product_type || 'grocery',
          confidence: 0.85,
          needs_confirmation: false,
          model_version: 'bitebeforeexpiry-client-v1'
        },
        ingredient_analysis: {
          extracted_ingredients: ingredients,
          allergen_alerts: localIntel.allergy_alert && localIntel.allergy_alert !== 'CLEAR' ? [localIntel.allergy_alert] : [],
          model_version: 'bitebeforeexpiry-ingredient-client-v1'
        },
        expiry_validation: {
          expiry_date: null,
          is_valid: true,
          confidence: 0.70,
          needs_confirmation: true,
          model_version: 'bitebeforeexpiry-expiry-client-v1'
        },
        user_allergy_conflicts: localIntel.allergy_alert && localIntel.allergy_alert !== 'CLEAR' ? [localIntel.allergy_alert] : [],
        has_allergy_risk: Boolean(localIntel.allergy_alert && localIntel.allergy_alert !== 'CLEAR'),
        semantic_matches: [],
        safety_disclaimer: localIntel.safety_disclaimer,
        model_version: {
          classifier: 'bitebeforeexpiry-client-fallback-v1',
          ingredient: 'bitebeforeexpiry-ingredient-client-v1',
          expiry: 'bitebeforeexpiry-expiry-client-v1'
        },
        overall_confidence: 0.80,
        needs_confirmation: true,
        is_fallback: true
      };
    }

    // Automatically audit & persist prediction to Supabase / local storage if userId provided
    if (userId && scanId) {
      try {
        await dbService.saveMlPrediction({
          userScanId: scanId,
          userId,
          modelName: 'UnifiedProductAnalyzer',
          modelVersion: typeof result.model_version === 'object' ? JSON.stringify(result.model_version) : String(result.model_version),
          datasetVersion: 'food-knowledge-v1',
          predictionType: 'unified_product_analysis',
          prediction: result,
          confidence: result.overall_confidence || 0.80,
          needsConfirmation: result.needs_confirmation
        });
      } catch (saveErr) {
        console.warn('[ML Client] Could not persist ML prediction to audit log:', saveErr);
      }
    }

    return result;
  }
};
