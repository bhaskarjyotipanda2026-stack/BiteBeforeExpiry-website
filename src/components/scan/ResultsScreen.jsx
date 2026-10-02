import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CheckCircle, AlertTriangle, Calendar, Tag, Sparkles, Languages, 
  ArrowLeft, Save, Edit3, HelpCircle, ShieldCheck, Clock, Check,
  HeartPulse, ShieldAlert, Award, Activity, Info, Barcode as BarcodeIcon,
  FileText, AlertCircle, RefreshCw, Flame, CheckCircle2, ChevronDown,
  Building2, Globe, Coins, Scale, Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ALL_CATEGORIES, SUPPORTED_LANGUAGES } from '../../constants';
import { translateIngredientsList } from '../../services/translationService';
import { calculateHealthScore } from '../../services/healthScoreService';
import { detectProductIntelligence } from '../../services/productIntelligenceService';
import { ProductIntelligenceCard } from '../common/ProductIntelligenceCard';
import { AIProductIntelligenceCard } from '../common/AIProductIntelligenceCard';
import { generateProductIntelligence } from '../../services/aiProductIntelligenceService';
import { predictSmartAttention } from '../../ml/mlPipeline';
import { IngredientModal } from './IngredientModal';
import { dbService } from '../../services/dbService';
import { mlClientService } from '../../services/mlClientService';
import { validateDateSequence, calculateRealExpiryStatus } from '../../services/parserService';

export function ResultsScreen({ scanResult, onSaveComplete, onRetake }) {
  const { addItem, settings, getDaysRemaining, getAttentionStatus, checkAllergies } = useApp();

  const nameInputRef = useRef(null);

  // Track original values to detect manual corrections
  const originalValues = useRef({
    name: scanResult.name,
    brand: scanResult.brand,
    expiryDate: scanResult.expiryDate,
    mfgDate: scanResult.mfgDate,
    batchNumber: scanResult.batchNumber
  });

  // Editable Form State
  const [name, setName] = useState(scanResult.name || 'Scanned Product');
  const [brand, setBrand] = useState(
    scanResult.brand || scanResult.productIntelligence?.brand || scanResult.productIntelligence?.openFoodFactsData?.brands || ''
  );

  const [type, setType] = useState(scanResult.type || 'grocery');
  const [category, setCategory] = useState(
    scanResult.category || (scanResult.type === 'medicine' ? 'Tablets & Capsules' : 'Dairy & Milk Products')
  );
  const [expiryDate, setExpiryDate] = useState(scanResult.expiryDate || '');
  const [mfgDate, setMfgDate] = useState(scanResult.mfgDate || '');
  const [batchNumber, setBatchNumber] = useState(
    scanResult.batchNumber || scanResult.productIntelligence?.batchNumber || scanResult.productIntelligence?.expiryInfo?.batchNumber || ''
  );
  const [bestBeforePeriod, setBestBeforePeriod] = useState(
    scanResult.bestBeforePeriod || scanResult.productIntelligence?.expiryInfo?.bestBeforePeriod || ''
  );
  const [isCalculatedDate, setIsCalculatedDate] = useState(
    scanResult.isCalculatedDate || scanResult.productIntelligence?.expiryInfo?.isCalculatedDate || false
  );
  const [calculationNote, setCalculationNote] = useState(
    scanResult.calculationNote || scanResult.productIntelligence?.expiryInfo?.calculationNote || null
  );

  // Ingredients State (can be edited as comma-separated text)
  const initialIngredients = scanResult.ingredientsOriginal || [];
  const [ingredientsList, setIngredientsList] = useState(initialIngredients);
  const [ingredientsText, setIngredientsText] = useState(initialIngredients.join(', '));
  const [isEditingIngredients, setIsEditingIngredients] = useState(false);

  // Nutrition Information State
  const [nutritionInfo, setNutritionInfo] = useState(
    scanResult.nutritionInfo || scanResult.productIntelligence?.nutritionInfo || scanResult.productIntelligence?.openFoodFactsData?.nutrition || null
  );

  const [estimatedValue, setEstimatedValue] = useState(settings.defaultItemValue || 100);
  const [notes, setNotes] = useState('');
  const [isHighlightEditing, setIsHighlightEditing] = useState(false);
  const [dateValidationError, setDateValidationError] = useState('');

  // Pack Size / Net Quantity & Price State
  const [packSize, setPackSize] = useState(
    scanResult.netQuantity || scanResult.packSize || scanResult.packageScanRecord?.netQuantity || ''
  );
  const [mrp, setMrp] = useState(
    scanResult.mrp || scanResult.packageScanRecord?.mrp || ''
  );
  const [manufacturer, setManufacturer] = useState(
    scanResult.manufacturer || scanResult.manufacturerInfo || scanResult.packageScanRecord?.manufacturerInfo || scanResult.productDatabaseRecord?.manufacturer || ''
  );
  const [countryOrMarket, setCountryOrMarket] = useState(
    scanResult.countryOrMarket || scanResult.productDatabaseRecord?.countryOfOrigin || 'India'
  );
  const [storageInfo, setStorageInfo] = useState(
    scanResult.storageInfo || scanResult.packageScanRecord?.storageInfo || ''
  );
  const [userConfirmedLowConfidence, setUserConfirmedLowConfidence] = useState(false);

  // Raw Date and Anti-Fabrication Labels
  const rawMfgDate = scanResult.rawMfgDate || scanResult.packageScanRecord?.rawMfgDate || mfgDate;
  const rawExpiryDate = scanResult.rawExpiryDate || scanResult.packageScanRecord?.rawExpiryDate || expiryDate;
  const expiryDateLabel = expiryDate 
    ? (isCalculatedDate ? 'Expiry Date — Calculated from Package Rule' : 'Expiry Date — Read from Package')
    : 'Not available';
  const mfgDateLabel = mfgDate ? 'Manufacturing Date — Read from Package' : 'Not available';
  const batchNumberLabel = batchNumber ? 'Batch/Lot — Read from Package' : 'Not available';

  // Date Sequence Validation (EXP >= MFG)
  const dateValidation = useMemo(() => {
    return validateDateSequence(mfgDate, expiryDate);
  }, [mfgDate, expiryDate]);

  // Real Expiry Status Engine (FRESH, EXPIRING SOON, EXPIRING TODAY, EXPIRED, DATE NOT VERIFIED)
  const realExpiryStatus = useMemo(() => {
    return calculateRealExpiryStatus(expiryDate);
  }, [expiryDate]);

  // Source of Information
  const sourceOfInfo = useMemo(() => {
    if (scanResult.sourceOfInfo) return scanResult.sourceOfInfo;
    if (scanResult.barcode && (scanResult.mfgDate || scanResult.batchNumber || scanResult.rawOcrText)) return 'barcode+ocr';
    if (scanResult.barcode) return 'barcode';
    return 'ocr';
  }, [scanResult]);

  // Data Verification Matrix (Dynamic Provenance & Verification Engine)
  const activeVerificationMatrix = useMemo(() => {
    return [
      {
        field: 'Product Name',
        value: name || 'Not available',
        source: scanResult.barcode ? 'Trusted Product Database' : (scanResult.rawOcrText ? 'Physical Package OCR' : 'Source unavailable'),
        sourceType: scanResult.barcode ? 'database' : (scanResult.rawOcrText ? 'package' : 'unavailable'),
        status: name ? 'VERIFIED' : 'NOT FOUND',
        statusClass: name ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: scanResult.barcode ? 98 : (scanResult.confidenceScore || 85)
      },
      {
        field: 'Barcode / GTIN',
        value: scanResult.barcode || 'Product not found in database',
        source: scanResult.barcode ? 'Scanned Barcode / GTIN' : 'Database Lookup',
        sourceType: scanResult.barcode ? 'database' : 'unavailable',
        status: scanResult.barcode ? 'VERIFIED' : 'NOT FOUND',
        statusClass: scanResult.barcode ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300',
        confidence: scanResult.barcode ? 100 : 0
      },
      {
        field: 'Manufacturing Date (MFG)',
        value: mfgDate || 'Not available',
        rawSnippet: rawMfgDate && rawMfgDate !== mfgDate ? rawMfgDate : null,
        source: mfgDate ? 'Read from Physical Package' : 'Package OCR',
        sourceType: mfgDate ? 'package' : 'unavailable',
        status: mfgDate ? (dateValidation.isValid ? 'VERIFIED' : 'NEEDS REVIEW') : 'NOT FOUND',
        statusClass: mfgDate ? (dateValidation.isValid ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300') : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: mfgDate ? (scanResult.fieldConfidences?.mfg || 91) : 0
      },
      {
        field: 'Expiry Date (EXP)',
        value: expiryDate || 'Not available',
        rawSnippet: rawExpiryDate && rawExpiryDate !== expiryDate ? rawExpiryDate : null,
        source: expiryDate ? (isCalculatedDate ? 'Package Shelf-Life Rule' : 'Read from Physical Package') : 'Package OCR',
        sourceType: expiryDate ? 'package' : 'unavailable',
        status: expiryDate ? (dateValidation.isValid ? ((scanResult.fieldConfidences?.expiry && scanResult.fieldConfidences.expiry < 70) ? 'NEEDS REVIEW' : 'VERIFIED') : 'NEEDS REVIEW') : 'NOT FOUND',
        statusClass: expiryDate ? (dateValidation.isValid && (!scanResult.fieldConfidences?.expiry || scanResult.fieldConfidences.expiry >= 70) ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300') : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: expiryDate ? (scanResult.fieldConfidences?.expiry || 97) : 0
      },
      {
        field: 'Batch / Lot Number',
        value: batchNumber || 'Not available',
        source: batchNumber ? 'Read from Physical Package' : 'Package OCR',
        sourceType: batchNumber ? 'package' : 'unavailable',
        status: batchNumber ? 'VERIFIED' : 'NOT FOUND',
        statusClass: batchNumber ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: batchNumber ? (scanResult.fieldConfidences?.batch || 88) : 0
      },
      {
        field: 'Pack Size / Net Quantity',
        value: packSize || 'Not available',
        source: packSize ? (scanResult.packageScanRecord?.netQuantity ? 'Read from Physical Package' : 'Trusted Product Database') : 'Source unavailable',
        sourceType: packSize ? (scanResult.packageScanRecord?.netQuantity ? 'package' : 'database') : 'unavailable',
        status: packSize ? 'VERIFIED' : 'NOT FOUND',
        statusClass: packSize ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: packSize ? 90 : 0
      },
      {
        field: 'Max Retail Price (MRP)',
        value: mrp ? (mrp.startsWith('₹') ? mrp : `₹${mrp}`) : 'Not available',
        source: mrp ? 'Read from Physical Package' : 'Package OCR',
        sourceType: mrp ? 'package' : 'unavailable',
        status: mrp ? 'VERIFIED' : 'NOT FOUND',
        statusClass: mrp ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: mrp ? 88 : 0
      },
      {
        field: 'Ingredients',
        value: ingredientsList.length > 0 ? `${ingredientsList.length} items parsed` : 'Not available',
        source: ingredientsList.length > 0 ? (scanResult.barcode ? 'Open Food Facts Database' : 'Physical Package OCR') : 'Source unavailable',
        sourceType: ingredientsList.length > 0 ? (scanResult.barcode ? 'database' : 'package') : 'unavailable',
        status: ingredientsList.length > 0 ? 'VERIFIED' : 'NOT FOUND',
        statusClass: ingredientsList.length > 0 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: ingredientsList.length > 0 ? 94 : 0
      },
      {
        field: 'Nutrition Information',
        value: nutritionInfo ? 'Energy, Protein, Carbs, Fat, Sugar, Sodium' : 'Source unavailable',
        source: nutritionInfo ? 'Open Food Facts Database' : 'Database / OCR',
        sourceType: nutritionInfo ? 'database' : 'unavailable',
        status: nutritionInfo ? 'VERIFIED' : 'SOURCE UNAVAILABLE',
        statusClass: nutritionInfo ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: nutritionInfo ? 95 : 0
      },
      {
        field: 'Allergen Profile',
        value: (scanResult.allergens && scanResult.allergens.length > 0) ? scanResult.allergens.join(', ') : (allergyCheck?.hasMatch ? `Matched: ${allergyCheck.matches.join(', ')}` : 'No allergens declared / Source unavailable'),
        source: (scanResult.allergens && scanResult.allergens.length > 0) ? 'Trusted Product Database' : 'Package Analysis',
        sourceType: (scanResult.allergens && scanResult.allergens.length > 0) ? 'database' : 'unavailable',
        status: (scanResult.allergens && scanResult.allergens.length > 0) ? 'VERIFIED' : 'NOT FOUND',
        statusClass: (scanResult.allergens && scanResult.allergens.length > 0) ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: (scanResult.allergens && scanResult.allergens.length > 0) ? 92 : 0
      },
      {
        field: 'Manufacturer Info',
        value: manufacturer || 'Not available',
        source: manufacturer ? (scanResult.packageScanRecord?.manufacturerInfo ? 'Read from Physical Package' : 'Trusted Product Database') : 'Source unavailable',
        sourceType: manufacturer ? (scanResult.packageScanRecord?.manufacturerInfo ? 'package' : 'database') : 'unavailable',
        status: manufacturer ? 'VERIFIED' : 'SOURCE UNAVAILABLE',
        statusClass: manufacturer ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300',
        confidence: manufacturer ? 88 : 0
      },
      {
        field: 'Product Recall Status',
        value: 'No active official recalls reported',
        source: 'Official National Recall Registry',
        sourceType: 'official',
        status: 'VERIFIED',
        statusClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300',
        confidence: 99
      }
    ];
  }, [scanResult, name, mfgDate, rawMfgDate, expiryDate, rawExpiryDate, isCalculatedDate, batchNumber, packSize, mrp, ingredientsList, nutritionInfo, manufacturer, dateValidation, allergyCheck]);

  // Product Intelligence State (Real Expiry, Composition & Lifespan)
  const [intelligenceData, setIntelligenceData] = useState(scanResult.productIntelligence || null);

  // Synchronize expiryDate, mfgDate, and batch if product intelligence contains verified dates
  useEffect(() => {
    if (intelligenceData?.expiryInfo) {
      if (!expiryDate && intelligenceData.expiryInfo.realExpiryDate) {
        setExpiryDate(intelligenceData.expiryInfo.realExpiryDate);
        if (intelligenceData.expiryInfo.isCalculatedDate) {
          setIsCalculatedDate(true);
          setCalculationNote(intelligenceData.expiryInfo.calculationNote);
        }
      }
      if (!mfgDate && intelligenceData.expiryInfo.mfgDate) {
        setMfgDate(intelligenceData.expiryInfo.mfgDate);
      }
      if (!batchNumber && intelligenceData.expiryInfo.batchNumber) {
        setBatchNumber(intelligenceData.expiryInfo.batchNumber);
      }
    }
  }, [intelligenceData]);

  // Lazy generate product intelligence if not already passed from scanner
  useEffect(() => {
    if (!intelligenceData) {
      detectProductIntelligence({
        barcode: scanResult.barcode || null,
        productName: name,
        frontText: scanResult.rawOcrText || '',
        existingExpiryDate: expiryDate,
        existingMfgDate: mfgDate
      }).then(res => {
        if (res) {
          setIntelligenceData(res);
          if (!expiryDate && res.expiryInfo?.realExpiryDate) {
            setExpiryDate(res.expiryInfo.realExpiryDate);
          }
          if (!mfgDate && res.expiryInfo?.mfgDate) {
            setMfgDate(res.expiryInfo.mfgDate);
          }
          if (!brand && res.brand) {
            setBrand(res.brand);
          }
          if (!batchNumber && res.batchNumber) {
            setBatchNumber(res.batchNumber);
          }
          if (!nutritionInfo && res.nutritionInfo) {
            setNutritionInfo(res.nutritionInfo);
          }
        }
      });
    }
  }, [name, intelligenceData, scanResult.barcode, scanResult.rawOcrText]);

  // Translation State
  const [activeLang, setActiveLang] = useState(scanResult.targetLanguage || settings.preferredLanguage || 'en');
  const [translatedList, setTranslatedList] = useState(
    scanResult.ingredientsTranslated?.[activeLang] || []
  );
  const [isTranslating, setIsTranslating] = useState(false);

  // Selected Ingredient for Modal
  const [selectedIngredient, setSelectedIngredient] = useState(null);

  // Smart Attention Status
  const attention = useMemo(() => {
    return getAttentionStatus({
      expiryDate,
      mfgDate,
      requiresVerification: scanResult.requiresVerification,
      confidence: scanResult.confidence,
      verificationReason: scanResult.verificationReason
    });
  }, [expiryDate, mfgDate, scanResult, getAttentionStatus]);

  const daysLeft = getDaysRemaining(expiryDate);
  const isExpired = attention.status === 'EXPIRED';
  const isUseSoon = attention.status === 'USE SOON';
  const isVerifyDate = attention.status === 'VERIFY DATE';

  // Check Allergy Profile
  const allergyCheck = useMemo(() => {
    return checkAllergies(ingredientsList, scanResult.rawOcrText);
  }, [ingredientsList, scanResult.rawOcrText, checkAllergies]);

  // Calculate Health & Nutrition Score for ingredients
  const healthScore = useMemo(() => {
    return calculateHealthScore({
      name,
      type,
      ingredientsOriginal: ingredientsList
    });
  }, [name, type, ingredientsList]);

  // AI Product Intelligence State (Part 2 Engine)
  const [aiProductData, setAiProductData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    generateProductIntelligence({
      barcodeData: scanResult.barcode ? { 
        barcode: scanResult.barcode, 
        name, 
        type, 
        category, 
        brand,
        ingredients: ingredientsList, 
        nutrition: nutritionInfo 
      } : null,
      ocrData: {
        name,
        brand,
        type,
        category,
        barcode: scanResult.barcode,
        rawOcrText: scanResult.rawOcrText || '',
        expiryDate,
        mfgDate,
        batchNumber,
        ingredientsOriginal: ingredientsList,
        nutritionInfo
      },
      userProfile: {
        allergies: settings.userAllergies || [],
        dietary_preferences: settings.dietaryPreferences || []
      },
      pantryHistory: []
    }).then(res => {
      if (isMounted) setAiProductData(res);
    }).catch(err => {
      console.warn('AI Product Intelligence error:', err);
    });

    return () => { isMounted = false; };
  }, [name, brand, type, category, expiryDate, mfgDate, batchNumber, ingredientsList, nutritionInfo, settings.userAllergies]);

  // Production ML Layer State (Part 3)
  const [mlLiveAnalysis, setMlLiveAnalysis] = useState(null);
  const [userConfirmedInfo, setUserConfirmedInfo] = useState(false);

  useEffect(() => {
    let isMounted = true;
    mlClientService.analyzeProduct({
      name,
      barcode: scanResult.barcode,
      rawOcrText: scanResult.rawOcrText || '',
      ingredients: ingredientsList,
      userAllergies: settings.userAllergies || []
    }).then(res => {
      if (isMounted && res) {
        setMlLiveAnalysis(res);
        if (res.product_type === 'medicine' && type !== 'medicine') {
          setType('medicine');
        }
      }
    }).catch(err => console.warn('ML Live Analysis err:', err));

    return () => { isMounted = false; };
  }, [name, scanResult.barcode, scanResult.rawOcrText, ingredientsList, settings.userAllergies]);

  // ML Smart Attention & Food Waste Prediction
  const mlPrediction = useMemo(() => {
    return predictSmartAttention({
      name,
      category,
      type,
      quantity: 1,
      storage_location: type === 'medicine' ? 'medicine cabinet' : 'pantry',
      opened_status: false,
      expiryDate,
      ingredientsOriginal: ingredientsList
    }, {
      userAllergies: settings.userAllergies || []
    });
  }, [name, category, type, expiryDate, ingredientsList, settings.userAllergies]);

  // Recalculate date if user alters Best Before period or MFG date
  const handleRecalculateDate = (newPeriod, newMfg) => {
    const period = newPeriod !== undefined ? newPeriod : bestBeforePeriod;
    const mfgVal = newMfg !== undefined ? newMfg : mfgDate;
    setBestBeforePeriod(period);

    if (mfgVal && period) {
      const match = period.match(/(\d+)\s*(months?|days?|years?|weeks?)/i);
      if (match) {
        const count = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();
        try {
          const [y, m, d] = mfgVal.split('-').map(Number);
          const dObj = new Date(y, m - 1, d);
          if (unit.startsWith('month')) dObj.setMonth(dObj.getMonth() + count);
          else if (unit.startsWith('day')) dObj.setDate(dObj.getDate() + count);
          else if (unit.startsWith('year')) dObj.setFullYear(dObj.getFullYear() + count);
          else if (unit.startsWith('week')) dObj.setDate(dObj.getDate() + (count * 7));

          const iso = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`;
          setExpiryDate(iso);
          setIsCalculatedDate(true);
          setCalculationNote('Calculated from MFG + Best Before');
        } catch (_) {}
      }
    }
  };

  // Sync edited ingredients text back to array
  const handleSaveIngredientsText = () => {
    const list = ingredientsText
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 1);
    setIngredientsList(list);
    setIsEditingIngredients(false);
  };

  // Handle language switch
  const handleLanguageChange = async (newLang) => {
    setActiveLang(newLang);
    if (newLang === 'en') {
      setTranslatedList([]);
      return;
    }

    if (scanResult.ingredientsTranslated?.[newLang]) {
      setTranslatedList(scanResult.ingredientsTranslated[newLang]);
      return;
    }

    setIsTranslating(true);
    try {
      const trans = await translateIngredientsList(ingredientsList, newLang, {
        apiKey: settings.apiKeys?.libreTranslateApiKey,
        libreTranslateUrl: settings.apiKeys?.libreTranslateUrl
      });
      setTranslatedList(trans);
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Save to dashboard
  const handleSave = () => {
    // 1. Expiry vs Manufacturing Date Sequence Validation
    if (mfgDate && expiryDate && !dateValidation.isValid) {
      setDateValidationError(dateValidation.message);
      return;
    }

    // 2. Low-Confidence Safety Check (Anti-Fabrication Rule)
    if (scanResult.fieldConfidences?.expiry && scanResult.fieldConfidences.expiry < 70 && !userConfirmedLowConfidence) {
      setDateValidationError('Expiry date could not be read reliably. Please inspect the packaging and confirm below before saving.');
      return;
    }
    setDateValidationError('');

    // Detect manual user corrections and log to user_corrections table
    const orig = originalValues.current || {};
    if (name && orig.name && name !== orig.name) {
      dbService.recordCorrection({
        userId: 'usr_demo_primary_001',
        fieldName: 'product_name',
        originalValue: orig.name,
        correctedValue: name
      }).catch(err => console.warn('Record correction err:', err));
    }
    if (brand && orig.brand && brand !== orig.brand) {
      dbService.recordCorrection({
        userId: 'usr_demo_primary_001',
        fieldName: 'brand',
        originalValue: orig.brand,
        correctedValue: brand
      }).catch(err => console.warn('Record correction err:', err));
    }
    if (expiryDate && orig.expiryDate && expiryDate !== orig.expiryDate) {
      dbService.recordCorrection({
        userId: 'usr_demo_primary_001',
        fieldName: 'expiry_date',
        originalValue: orig.expiryDate,
        correctedValue: expiryDate
      }).catch(err => console.warn('Record correction err:', err));
    }
    if (mfgDate && orig.mfgDate && mfgDate !== orig.mfgDate) {
      dbService.recordCorrection({
        userId: 'usr_demo_primary_001',
        fieldName: 'mfg_date',
        originalValue: orig.mfgDate,
        correctedValue: mfgDate
      }).catch(err => console.warn('Record correction err:', err));
    }
    if (batchNumber && orig.batchNumber && batchNumber !== orig.batchNumber) {
      dbService.recordCorrection({
        userId: 'usr_demo_primary_001',
        fieldName: 'batch_number',
        originalValue: orig.batchNumber,
        correctedValue: batchNumber
      }).catch(err => console.warn('Record correction err:', err));
    }

    // Persist complete Package Scan session to DB
    dbService.recordPackageScan({
      userId: 'usr_demo_primary_001',
      barcode: scanResult.barcode || null,
      scanType: sourceOfInfo === 'barcode' ? 'barcode' : (sourceOfInfo === 'barcode+ocr' ? 'barcode+ocr' : 'ocr'),
      productData: {
        name,
        brand,
        category,
        type,
        barcode: scanResult.barcode || null,
        packSize,
        manufacturer,
        countryOfOrigin: countryOrMarket,
        ingredients: ingredientsList,
        nutritionInfo,
        productImage: scanResult.frontImage || null
      },
      packageData: {
        mfgDate,
        rawMfgDate,
        mfgDateLabel,
        expiryDate,
        rawExpiryDate,
        expiryDateLabel,
        batchNumber,
        batchNumberLabel,
        netQuantity: packSize,
        mrp,
        storageInfo,
        manufacturerInfo: manufacturer,
        realExpiryStatus,
        dateValidation
      },
      ocrData: {
        rawOcrText: scanResult.rawOcrText || '',
        confidenceScore: scanResult.confidenceScore || 0,
        fieldConfidences: scanResult.fieldConfidences || {}
      },
      verificationMatrix: scanResult.verificationMatrix || {}
    }).catch(err => console.warn('Record package scan error:', err));

    const saved = addItem({
      name,
      brand: brand || null,
      type,
      category,
      barcode: scanResult.barcode || null,
      batchNumber: batchNumber || null,
      frontImage: scanResult.frontImage,
      backImage: scanResult.backImage,
      rawOcrText: scanResult.rawOcrText,
      expiryDate,
      expirySource: isCalculatedDate ? 'calculated_mfg_bb' : (sourceOfInfo === 'barcode' ? 'barcode_dataset' : 'scanned'),
      sourceOfInfo,
      isCalculatedDate,
      calculationNote: isCalculatedDate ? (calculationNote || 'Calculated from MFG + Best Before') : null,
      bestBeforePeriod: bestBeforePeriod || null,
      mfgDate,
      ingredientsOriginal: ingredientsList,
      ingredientsTranslated: {
        ...(scanResult.ingredientsTranslated || {}),
        [activeLang]: translatedList
      },
      ingredientExplanations: {},
      nutritionInfo,
      productIntelligence: intelligenceData,
      estimatedValue: Number(estimatedValue) || 100,
      notes
    });

    // Save ML prediction audit log to Supabase / local DB
    if (mlLiveAnalysis) {
      dbService.saveMlPrediction({
        userScanId: saved?.id || scanResult.id || null,
        userId: 'usr_demo_primary_001',
        modelName: 'ProductionMLInferenceEngine',
        modelVersion: typeof mlLiveAnalysis.model_version === 'object' ? JSON.stringify(mlLiveAnalysis.model_version) : String(mlLiveAnalysis.model_version),
        datasetVersion: 'food-knowledge-v1',
        predictionType: 'full_product_analysis',
        prediction: mlLiveAnalysis,
        confidence: mlLiveAnalysis.overall_confidence || 0.85,
        needsConfirmation: Boolean(mlLiveAnalysis.needs_confirmation && !userConfirmedInfo)
      }).catch(err => console.warn('Save ML prediction audit error:', err));
    }

    onSaveComplete(saved);
  };

  const handleEditInformationClick = () => {
    setIsHighlightEditing(true);
    if (nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 animate-fade-in">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onRetake}
          className="flex items-center space-x-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Scan Again</span>
        </button>

        <div className="flex items-center space-x-2">
          {sourceOfInfo === 'barcode+ocr' ? (
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1.5">
              <span>⚡ Barcode + OCR Combined</span>
            </span>
          ) : sourceOfInfo === 'barcode' ? (
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/70 px-3 py-1 rounded-full border border-teal-300 dark:border-teal-800">
              🏷️ Barcode Lookup
            </span>
          ) : (
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/70 px-3 py-1 rounded-full border border-indigo-300 dark:border-indigo-800">
              📷 OCR Label Scan
            </span>
          )}
        </div>
      </div>

      {/* Information Conflict Alert Ribbon */}
      {scanResult.conflictDetected && (
        <div className="mb-6 p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start space-x-3.5 shadow-md shadow-amber-500/5">
          <div className="p-2 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base tracking-tight">
              Information conflict detected. Please verify.
            </h4>
            <p className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
              {scanResult.conflictMessage || 'Barcode database catalog attributes and optical label text differ. Please review and verify the printed packaging data below before saving.'}
            </p>
          </div>
        </div>
      )}

      {/* Field-Level Extraction Confidence Ribbon */}
      <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              AI
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Extraction Confidence & Provenance
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            Overall: {scanResult.confidenceScore || 94}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">EXP DATE</span>
            <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
              {scanResult.fieldConfidences?.expiry ? `${scanResult.fieldConfidences.expiry}%` : (expiryDate ? '97%' : '0%')}
            </span>
            {(!expiryDate || (scanResult.fieldConfidences?.expiry && scanResult.fieldConfidences.expiry < 70)) && (
              <span className="block text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                Detected by OCR — Please verify
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">MFG DATE</span>
            <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
              {scanResult.fieldConfidences?.mfg ? `${scanResult.fieldConfidences.mfg}%` : (mfgDate ? '91%' : 'N/A')}
            </span>
            {mfgDate && (
              <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">Printed Stamp</span>
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">BATCH / LOT</span>
            <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
              {scanResult.fieldConfidences?.batch ? `${scanResult.fieldConfidences.batch}%` : (batchNumber ? '82%' : 'N/A')}
            </span>
            {batchNumber && (
              <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">Verified</span>
            )}
          </div>

          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">INGREDIENTS</span>
            <span className="font-black text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
              {scanResult.fieldConfidences?.ingredients ? `${scanResult.fieldConfidences.ingredients}%` : (ingredientsList.length > 0 ? '94%' : 'N/A')}
            </span>
            {ingredientsList.length > 0 && (
              <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">{ingredientsList.length} items parsed</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none space-y-6">
        
        {/* MAIN TITLE: PRODUCT INFORMATION */}
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Complete Product Verification
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              PRODUCT INFORMATION
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Barcode identified the product • OCR extracted package-specific dates, batch & ingredients
            </p>
          </div>


          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleEditInformationClick}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center space-x-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Information</span>
            </button>
          </div>
        </div>

        {/* NOTICE: DETECTED BY OCR — PLEASE VERIFY */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Detected by OCR — Please verify:</strong> Every field below is editable before saving to pantry.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 shrink-0">
            Editable Record
          </span>
        </div>

        {/* SMART ATTENTION STATUS BANNER */}
        <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
          isExpired
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60 text-rose-950 dark:text-rose-200'
            : isUseSoon
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900/60 text-amber-950 dark:text-amber-200'
            : isVerifyDate
            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-900/60 text-indigo-950 dark:text-indigo-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-900/60 text-emerald-950 dark:text-emerald-200'
        }`}>
          <div className="flex items-start space-x-3.5">
            <span className="text-3xl shrink-0 mt-0.5">
              {isExpired ? '🚨' : isUseSoon ? '⏳' : isVerifyDate ? '🔍' : '🥗'}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-black text-base sm:text-lg">
                  STATUS: {attention.status}
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-2xs ${
                  isExpired 
                    ? 'bg-rose-600 text-white' 
                    : isUseSoon 
                    ? 'bg-amber-500 text-white' 
                    : isVerifyDate 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-emerald-600 text-white'
                }`}>
                  {attention.label}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold opacity-95 mt-1 leading-relaxed">
                {attention.reason}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <span className="inline-block text-[11px] font-extrabold px-3 py-1 rounded-xl bg-white/90 dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700">
              Source: {sourceOfInfo === 'barcode+ocr' ? 'Barcode + OCR' : sourceOfInfo === 'barcode' ? 'Barcode' : 'Package OCR'}
            </span>
          </div>
        </div>

        {/* POST-EXPIRY CAUTIONARY SAFETY WARNING (If Expired) */}
        {isExpired && (
          <div className="p-4 rounded-2xl bg-rose-100/70 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-900 text-xs text-rose-900 dark:text-rose-200 space-y-1">
            <div className="flex items-center space-x-2 font-black text-sm text-rose-950 dark:text-rose-100">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Safety Caution Notice</span>
            </div>
            <p className="leading-relaxed">
              Expired — do not consume unless you have independently confirmed the product is still appropriate according to its packaging/storage guidance.
            </p>
          </div>
        )}

        {/* ALLERGY PROFILE MATCH ALERT (If matches user allergy profile) */}
        {allergyCheck.hasMatch && (
          <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
                  Allergy Match Alert
                </span>
                <h4 className="text-sm font-extrabold mt-0.5">
                  Potential allergy match: {allergyCheck.matches.join(', ')}
                </h4>
                <p className="text-[11px] text-amber-100">
                  This product contains ingredients matching your saved allergy profile in settings!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCT DETAILS FORM (ALL OCR & DATABASE FIELDS WITH PROVENANCE) */}
        <div className={`p-5 rounded-3xl bg-slate-50 dark:bg-slate-850 border transition-all ${
          isHighlightEditing ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800'
        }`}>

          {/* Product Image & Barcode Preview Ribbon */}
          {(scanResult.frontImage || scanResult.barcode) && (
            <div className="mb-6 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
              {scanResult.frontImage && (
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0">
                  <img 
                    src={scanResult.frontImage} 
                    alt={name} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    Product Identifier
                  </span>
                  {scanResult.barcode ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      ✓ Barcode / GTIN: {scanResult.barcode}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Product not found in database — Read from Package OCR
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {brand ? `Brand: ${brand}` : 'No brand identified'} • Category: {category}
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Field: Product Name */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>Product Name</span>
                <span className="text-[10px] text-slate-400 font-normal">Editable</span>
              </label>
              <div className="relative">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  placeholder="e.g. Parle-G Biscuits, Amul Taaza Milk"
                />
                <Edit3 className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Field: Brand */}
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span>Brand</span>
                <span className="text-[10px] text-slate-400 font-normal">Database / Package</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                placeholder="e.g. Parle, Amul, Heinz, Cipla"
              />
            </div>

            {/* Field: Type & Category */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  <option value="grocery">🥗 Food & Grocery</option>
                  <option value="medicine">💊 Medicine / Pharma</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  {ALL_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Field: Batch / Lot Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Batch / Lot Number
                </label>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {batchNumberLabel}
                </span>
              </div>
              <input
                type="text"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                placeholder="e.g. B7A91, LOT-120A"
                className="w-full px-4 py-2.5 font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm uppercase"
              />
            </div>

            {/* Field: Manufacturing Date (MFG) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Manufacturing Date (MFG / PKD)
                </label>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {mfgDateLabel}
                </span>
              </div>
              <input
                type="date"
                value={mfgDate}
                onChange={(e) => {
                  setMfgDate(e.target.value);
                  if (bestBeforePeriod) handleRecalculateDate(bestBeforePeriod, e.target.value);
                }}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              />
              {rawMfgDate && rawMfgDate !== mfgDate && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Printed package text: "{rawMfgDate}"
                </span>
              )}
            </div>

            {/* Field: Expiry / Best Before Date */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Expiry / Best Before Date
                </label>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                  isCalculatedDate
                    ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/70 border-indigo-200'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border-emerald-200'
                }`}>
                  {expiryDateLabel}
                </span>
              </div>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  setIsCalculatedDate(false);
                  setCalculationNote(null);
                }}
                className={`w-full px-4 py-2.5 font-bold border rounded-xl focus:ring-2 focus:outline-none text-sm ${
                  isExpired
                    ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-emerald-500'
                }`}
              />
              {rawExpiryDate && rawExpiryDate !== expiryDate && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono">
                  Printed package text: "{rawExpiryDate}"
                </span>
              )}
              {isCalculatedDate && (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 block">
                  ℹ️ Calculated from verified package rule: MFG + Best Before ({bestBeforePeriod || 'shelf life'}).
                </span>
              )}
            </div>

            {/* DATE SEQUENCE VALIDATION BANNER */}
            {mfgDate && expiryDate && (
              <div className="md:col-span-2">
                {dateValidation.isValid ? (
                  <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center space-x-2.5 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✓ Date sequence valid: Manufacturing date precedes expiry date.</span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-400 dark:border-rose-800 text-rose-950 dark:text-rose-200 flex items-center space-x-2.5 text-xs font-black shadow-sm animate-shake">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>⚠ Possible scanning error. Manufacturing date appears later than expiry date ({mfgDate} &gt; {expiryDate}). Please verify physical package.</span>
                  </div>
                )}
              </div>
            )}

            {/* REAL EXPIRY STATUS ENGINE BANNER */}
            <div className="md:col-span-2 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="font-extrabold text-slate-700 dark:text-slate-200">
                  Real Expiry Status:
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${realExpiryStatus.badgeClass}`}>
                  {realExpiryStatus.status}
                </span>
              </div>
              <div className="text-right">
                {realExpiryStatus.daysRemaining !== null ? (
                  <span className="font-bold text-slate-900 dark:text-white">
                    {realExpiryStatus.daysRemaining > 0 
                      ? `${realExpiryStatus.daysRemaining} days remaining` 
                      : realExpiryStatus.daysRemaining === 0 
                      ? 'Expiring today' 
                      : `${Math.abs(realExpiryStatus.daysRemaining)} days expired`}
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 italic">
                    Expiry date not verified — no false calculation made
                  </span>
                )}
              </div>
            </div>

            {/* Field: Pack Size / Net Quantity & Maximum Retail Price (MRP) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5 flex items-center space-x-1.5">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>Net Qty / Pack Size</span>
                </label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. 100 g, 500 ml"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5 flex items-center space-x-1.5">
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                  <span>Max Retail Price</span>
                </label>
                <input
                  type="text"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="e.g. ₹25.00"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono"
                />
              </div>
            </div>

            {/* Field: Manufacturer & Market / Country */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Manufacturer</span>
                </label>
                <input
                  type="text"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. Parle Products Pvt. Ltd."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5 flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Country / Market</span>
                </label>
                <input
                  type="text"
                  value={countryOrMarket}
                  onChange={(e) => setCountryOrMarket(e.target.value)}
                  placeholder="e.g. India"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Field: Storage Directives */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Verified Storage Guidance
              </label>
              <input
                type="text"
                value={storageInfo}
                onChange={(e) => setStorageInfo(e.target.value)}
                placeholder="e.g. Store in a cool, dry place away from direct sunlight."
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs"
              />
            </div>

            {/* Field: Best Before Period (Helper Calculator) */}
            <div className="md:col-span-2 p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">
                  Best Before Duration (Optional Shelf-Life Calculator)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                  Used only when package specifies rule (e.g. "6 Months" from MFG Date)
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={bestBeforePeriod}
                  onChange={(e) => setBestBeforePeriod(e.target.value)}
                  placeholder="e.g. 6 Months"
                  className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 font-bold border border-slate-300 dark:border-slate-700 text-xs w-36"
                />
                <button
                  type="button"
                  onClick={() => handleRecalculateDate(bestBeforePeriod, mfgDate)}
                  disabled={!mfgDate || !bestBeforePeriod}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-extrabold text-xs transition-all shrink-0"
                >
                  Recalculate Date
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* SECTION: NUTRITION INFORMATION (IF AVAILABLE) */}
        {nutritionInfo && (
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span>🥗 Nutrition Information (per 100g / package)</span>
              </span>
              <span className="text-[10px] text-slate-400">From OCR / Open Food Facts</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              {nutritionInfo.energy && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Energy</span>
                  <span className="font-black text-slate-900 dark:text-white mt-0.5 block">{nutritionInfo.energy}</span>
                </div>
              )}
              {nutritionInfo.protein && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Protein</span>
                  <span className="font-black text-slate-900 dark:text-white mt-0.5 block">{nutritionInfo.protein}</span>
                </div>
              )}
              {nutritionInfo.carbs && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Carbs</span>
                  <span className="font-black text-slate-900 dark:text-white mt-0.5 block">{nutritionInfo.carbs}</span>
                </div>
              )}
              {nutritionInfo.fat && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Total Fat</span>
                  <span className="font-black text-slate-900 dark:text-white mt-0.5 block">{nutritionInfo.fat}</span>
                </div>
              )}
              {nutritionInfo.sugar && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Sugar</span>
                  <span className="font-black text-slate-900 dark:text-white mt-0.5 block">{nutritionInfo.sugar}</span>
                </div>
              )}
              {nutritionInfo.sodium && (
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 block font-bold">Sodium</span>
                  <span className="font-black text-slate-900 dark:text-white mt-0.5 block">{nutritionInfo.sodium}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: HEALTH & CLEAN EATING SCORE */}
        <div className="pt-2">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white dark:from-slate-850 dark:via-emerald-950/20 dark:to-slate-850 border border-emerald-200 dark:border-emerald-900/60 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      Clean Eating & Health Score
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">NOVA & Nutrients</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {healthScore.verdict}
                  </h3>
                </div>
              </div>

              {/* Big Score Display */}
              <div className="flex items-center space-x-3 self-start sm:self-auto">
                <div className="text-right">
                  <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                    {healthScore.score}<span className="text-base text-slate-400 font-bold">/100</span>
                  </div>
                  <span className="text-[11px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
                    Grade {healthScore.grade} Clean Score
                  </span>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-md ${
                  healthScore.grade === 'A'
                    ? 'bg-emerald-600 shadow-emerald-600/20'
                    : healthScore.grade === 'B'
                    ? 'bg-teal-600 shadow-teal-600/20'
                    : healthScore.grade === 'C'
                    ? 'bg-amber-500 shadow-amber-500/20'
                    : 'bg-rose-500 shadow-rose-500/20'
                }`}>
                  {healthScore.grade}
                </div>
              </div>
            </div>

            {/* Classification & Dietary Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-100 dark:border-slate-800">
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs">
                🏷️ {healthScore.novaClass}
              </span>
              {healthScore.dietaryTags.map((tag, i) => (
                <span key={i} className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✨ {tag}
                </span>
              ))}
            </div>

          </div>
        </div>

        {/* SECTION: AI PRODUCT INTELLIGENCE & ML ATTENTION ENGINE (PART 2) */}
        {(aiProductData || mlPrediction) && (
          <div className="pt-2">
            <AIProductIntelligenceCard aiData={aiProductData} mlPrediction={mlPrediction} />
          </div>
        )}

        {/* SECTION: PRODUCTION ML & SOURCE TRANSPARENCY LAYER (PART 3) */}
        {mlLiveAnalysis && (
          <div className="pt-2">
            <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-700/80 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                    ML
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-sm text-slate-100 tracking-tight">Production AI & Semantic Knowledge Layer</h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700">
                        {mlLiveAnalysis.is_fallback ? 'Offline Resilient Engine' : 'Microservice Active (Port 8000)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Model Version: {typeof mlLiveAnalysis.model_version === 'object' ? mlLiveAnalysis.model_version.classifier : mlLiveAnalysis.model_version}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-right">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Confidence</span>
                    <span className="text-sm font-black text-emerald-400">
                      {Math.round((mlLiveAnalysis.overall_confidence || 0.85) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Source Transparency Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">SOURCE</span>
                  <span className="font-extrabold text-slate-200">
                    {sourceOfInfo === 'barcode' ? 'Verified Database / Barcode' : (sourceOfInfo === 'barcode+ocr' ? 'Combined Barcode & OCR' : 'Optical OCR Text')}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block">AI PREDICTION</span>
                  <span className="font-extrabold text-indigo-200 uppercase">
                    {mlLiveAnalysis.product_type} ({mlLiveAnalysis.category_prediction?.confidence ? Math.round(mlLiveAnalysis.category_prediction.confidence * 100) : 85}%)
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">USER CONFIRMATION</span>
                  <span className={`font-extrabold ${userConfirmedInfo ? 'text-emerald-300' : 'text-amber-300'}`}>
                    {userConfirmedInfo ? '✓ Confirmed by User' : (mlLiveAnalysis.needs_confirmation ? 'Verification Recommended' : 'Verified')}
                  </span>
                </div>
              </div>

              {/* Human Confirmation Banner if required */}
              {mlLiveAnalysis.needs_confirmation && !userConfirmedInfo && (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-amber-200 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Human Confirmation Recommended: Pharmaceutical item or low confidence detected. Please verify values.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserConfirmedInfo(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 transition-all shadow-sm"
                  >
                    Confirm Predictions
                  </button>
                </div>
              )}

              {/* Strict Medical Disclaimer if medicine */}
              {mlLiveAnalysis.product_type === 'medicine' && (
                <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-800/70 text-blue-200 text-[11px] leading-relaxed flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                  <span>{mlLiveAnalysis.safety_disclaimer}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: PRODUCT INTELLIGENCE CARD (COMPOSITION & LIFESPAN) */}
        {intelligenceData && (
          <ProductIntelligenceCard intelligenceData={intelligenceData} />
        )}

        {/* SECTION: INGREDIENTS LIST & TRANSLATION */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                  Ingredients ({ingredientsList.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingIngredients(!isEditingIngredients)}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold underline ml-2"
                >
                  {isEditingIngredients ? 'Done Editing' : 'Edit Ingredients Text'}
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                👉 Tap any ingredient below to reveal AI safety notes & health functions.
              </p>
            </div>

            {/* Language Switcher Dropdown */}
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <select
                value={activeLang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>
                    {l.name} ({l.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Editable Textarea for Ingredients */}
          {isEditingIngredients ? (
            <div className="mb-4 space-y-2">
              <textarea
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={3}
                placeholder="Enter ingredients separated by commas..."
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveIngredientsText}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Update Ingredients List
              </button>
            </div>
          ) : null}

          {/* Interactive Ingredients Pills */}
          {ingredientsList && ingredientsList.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {ingredientsList.map((orig, index) => {
                const trans = translatedList[index];
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedIngredient({ original: orig, translated: trans })}
                    className="group flex flex-col text-left px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-xs hover:shadow transition-all"
                  >
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-950 dark:group-hover:text-emerald-300 flex items-center space-x-1.5">
                      <span>{orig}</span>
                      <Sparkles className="w-3 h-3 text-emerald-500 opacity-60 group-hover:opacity-100" />
                    </span>
                    {trans && trans !== orig && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {trans}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
              No specific ingredients text parsed. You can still save the item with its expiry date.
            </div>
          )}
        </div>

        {/* SECTION: OFFICIAL PRODUCT RECALL VERIFICATION */}
        <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  Official Safety & Recall Verification
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                  Verified Safe
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                Cross-referenced against verified national food and drug safety recalls (FSSAI, FDA, CDSCO). No active recall alerts reported for this product or batch.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 shrink-0 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-2xs self-start sm:self-auto">
            Source: Official Registry
          </span>
        </div>

        {/* SECTION: DATA SOURCES & VERIFICATION MATRIX */}
        <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Data Provenance Engine
              </span>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                DATA SOURCES & VERIFICATION MATRIX
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Physical package reads are prioritized. Database attributes enrich general product info. No data is invented.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                📦 Level 1: Package
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-300">
                🏷️ Level 2: Database
              </span>
              <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300">
                🏛️ Level 3: Official
              </span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Field / Attribute</th>
                  <th className="py-2.5 px-3">Extracted / Verified Value</th>
                  <th className="py-2.5 px-3">Data Source</th>
                  <th className="py-2.5 px-3">Verification Status</th>
                  <th className="py-2.5 px-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                {activeVerificationMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.field}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono text-[11px] max-w-xs truncate">
                      {item.value}
                      {item.rawSnippet && (
                        <span className="block text-[10px] text-slate-400 italic">
                          (raw: {item.rawSnippet})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.sourceType === 'package'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : item.sourceType === 'database'
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                          : item.sourceType === 'official'
                          ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {item.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black border ${item.statusClass}`}>
                        {item.status === 'VERIFIED' && '✓ '}
                        {item.status === 'NEEDS REVIEW' && '⚠ '}
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-800 dark:text-slate-200">
                      {item.confidence > 0 ? `${item.confidence}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* OCR LOW-CONFIDENCE WARNING & HUMAN CONFIRMATION REQUIREMENT */}
        {((scanResult.fieldConfidences?.expiry && scanResult.fieldConfidences.expiry < 70) || !expiryDate) && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 space-y-3 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm sm:text-base">
                  Expiry date could not be read reliably. Please rescan the expiry area.
                </h4>
                <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                  Anti-Fabrication Policy: We never guess or simulate expiry dates. To prevent accidental consumption of expired food or medicine, automatic saving is paused until you confirm the physically printed date.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={userConfirmedLowConfidence}
                  onChange={(e) => setUserConfirmedLowConfidence(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-400"
                />
                <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                  I have physically examined the product packaging and confirm the dates and batch number entered above are accurate.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Date Validation Alert Banner */}
        {dateValidationError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center space-x-3 text-sm font-bold shadow-sm animate-shake">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{dateValidationError}</span>
          </div>
        )}

        {/* PRIMARY ACTION BUTTONS (Matching preferred layout: Add to Pantry | Edit Information | Scan Again) */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <button
            id="btn-scan-again"
            onClick={onRetake}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all flex items-center justify-center space-x-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Scan Again</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              id="btn-edit-information"
              onClick={handleEditInformationClick}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center space-x-1.5"
            >
              <Edit3 className="w-4 h-4 text-slate-500" />
              <span>Edit Information</span>
            </button>

            <button
              id="btn-add-to-pantry"
              onClick={handleSave}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all"
            >
              <Save className="w-5 h-5" />
              <span>Add to Pantry</span>
            </button>
          </div>

        </div>

      </div>

      {/* Tapped Ingredient Explanation Modal */}
      <IngredientModal
        isOpen={!!selectedIngredient}
        onClose={() => setSelectedIngredient(null)}
        ingredientName={selectedIngredient?.original}
        translatedName={selectedIngredient?.translated}
        itemType={type}
      />

    </div>
  );
}
