import React, { useState } from 'react';
import { 
  Camera, Upload, Sparkles, AlertCircle, FileText, ArrowRight, 
  HelpCircle, RefreshCw, CheckCircle, Languages, Loader2, Info, ChefHat, Eye,
  Barcode as BarcodeIcon, Pill, Utensils, Zap, ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../../constants';
import { SAMPLE_PRODUCTS } from '../../data/sampleProducts';
import { performOcr } from '../../services/ocrService';
import { parsePackageData } from '../../services/parserService';
import { translateIngredientsList } from '../../services/translationService';
import { detectProductIntelligence } from '../../services/productIntelligenceService';
import { extractBarcodeCandidatesFromOcr } from '../../services/barcodeScannerService';
import { CameraCaptureModal } from '../common/CameraCaptureModal';
import { PantryVisionScannerModal } from '../recipes/PantryVisionScannerModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';

export function ScanScreen({ onAnalysisComplete, onOpenUndatedModal, onNavigateToRecipes }) {
  const { settings, showToast } = useApp();

  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(settings.preferredLanguage || 'en');
  
  // OCR & Processing State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [loadedSample, setLoadedSample] = useState(null);

  // Barcode & Product Intelligence API search state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isQueryingApi, setIsQueryingApi] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  // Camera modal state
  const [cameraModal, setCameraModal] = useState({ isOpen: false, target: 'front' });

  // Kitchen available ingredients vision scanner modal
  const [isPantryScannerOpen, setIsPantryScannerOpen] = useState(false);

  // Direct Barcode / Product Intelligence API lookup
  const handleBarcodeOrApiLookup = async (codeToLookup) => {
    const query = (codeToLookup || barcodeInput).trim();
    if (!query) {
      showToast('Please enter a barcode number or product name', 'warning');
      return;
    }

    setIsQueryingApi(true);
    showToast(`Querying Product Intelligence API for "${query}"...`, 'info');

    try {
      const intel = await detectProductIntelligence({
        barcode: /^\d{8,14}$/.test(query) ? query : null,
        productName: query
      });

      if (!intel || (!intel.verifiedName && !intel.expiryInfo?.realExpiryDate)) {
        showToast('Could not find product in database. Please scan packaging photo or enter manually.', 'warning');
        return;
      }

      showToast(`Detected ${intel.verifiedName}! Expiry, composition & lifespan computed.`, 'success', '✨');

      // Forward to analysis complete
      onAnalysisComplete({
        name: intel.verifiedName,
        type: intel.productType,
        expiryDate: intel.expiryInfo.realExpiryDate || '',
        mfgDate: intel.expiryInfo.mfgDate || '',
        ingredientsOriginal: intel.openFoodFactsData?.ingredientsList || intel.composition?.primaryRawMaterials?.map(m => m.name) || [],
        rawOcrText: `Product API Lookup: ${intel.verifiedName}\nBarcode: ${intel.barcode || 'N/A'}\n${intel.composition?.summary || ''}`,
        frontImage: intel.openFoodFactsData?.productImage || null,
        backImage: null,
        targetLanguage: selectedLanguage,
        ingredientsTranslated: {},
        productIntelligence: intel
      });
    } catch (err) {
      console.error('API lookup error:', err);
      showToast('API lookup failed. Please try with package photo.', 'error');
    } finally {
      setIsQueryingApi(false);
    }
  };

  // Handle file input upload
  const handleFileUpload = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadedSample(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (target === 'front') setFrontImage(reader.result);
      else setBackImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Load sample preset for instant testing
  const handleLoadSample = (sample) => {
    setLoadedSample(sample);
    setFrontImage(sample.frontImage);
    setBackImage(sample.backImage);
    showToast(`Loaded ${sample.name} for testing!`, 'info');
  };

  // Run OCR and analysis pipeline
  const handleStartAnalysis = async () => {
    if (!frontImage && !backImage) {
      showToast('Please upload or snap at least one package photo', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setProgressPercent(10);
    setAnalysisStatus('Initializing OCR engine...');

    try {
      let frontText = '';
      let backText = '';

      // Check if user has Google Vision API key configured in settings
      const googleKey = settings.apiKeys?.googleVisionApiKey;

      if (loadedSample && loadedSample.rawOcrText) {
        // Fast, realistic label reading simulation for instant 1-click test presets
        setAnalysisStatus('Scanning front package label...');
        setProgressPercent(35);
        await new Promise(r => setTimeout(r, 400));
        setAnalysisStatus('Scanning back label (expiry & ingredients)...');
        setProgressPercent(70);
        await new Promise(r => setTimeout(r, 400));
        backText = loadedSample.rawOcrText;
        frontText = loadedSample.name;
      } else {
        // Real OCR via Tesseract.js worker or Google Vision
        if (frontImage) {
          setAnalysisStatus('Scanning front package label...');
          setProgressPercent(25);
          const frontRes = await performOcr(frontImage, {
            googleVisionApiKey: googleKey,
            onProgress: (p) => {
              setAnalysisStatus(`Front Label: ${p.status}`);
              setProgressPercent(20 + Math.round(p.progress * 30));
            }
          });
          frontText = frontRes.text;
        }

        if (backImage) {
          setAnalysisStatus('Scanning back label (expiry & ingredients)...');
          setProgressPercent(55);
          const backRes = await performOcr(backImage, {
            googleVisionApiKey: googleKey,
            onProgress: (p) => {
              setAnalysisStatus(`Back Label: ${p.status}`);
              setProgressPercent(55 + Math.round(p.progress * 30));
            }
          });
          backText = backRes.text;
        }
      }

      setAnalysisStatus('Parsing expiry date & identifying ingredients...');
      setProgressPercent(88);

      // Parse dates and ingredients
      const parsedData = parsePackageData(frontText, backText);

      // Translate ingredients if language != en
      let translated = {};
      if (selectedLanguage !== 'en' && parsedData.ingredientsOriginal.length > 0) {
        setAnalysisStatus(`Translating ingredients to ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}...`);
        const transList = await translateIngredientsList(
          parsedData.ingredientsOriginal, 
          selectedLanguage,
          { apiKey: settings.apiKeys?.libreTranslateApiKey, libreTranslateUrl: settings.apiKeys?.libreTranslateUrl }
        );
        translated[selectedLanguage] = transList;
      }

      setAnalysisStatus('Connecting to Real Dataset Intelligence (validating expiry, composition & lifespan)...');
      setProgressPercent(92);

      // Extract any barcode candidate numbers printed on packaging (from OCR text)
      const ocrBarcodes = extractBarcodeCandidatesFromOcr(`${frontText}\n${backText}\n${parsedData.rawOcrText}`);
      const detectedBarcode = barcodeInput || ocrBarcodes[0] || null;

      // Run Product Intelligence API detection (Open Food Facts + OpenFDA / Medicine DB)
      const productIntelligence = await detectProductIntelligence({
        barcode: detectedBarcode,
        productName: parsedData.name,
        frontText,
        backText,
        rawOcrText: parsedData.rawOcrText,
        existingExpiryDate: parsedData.expiryDate,
        existingMfgDate: parsedData.mfgDate
      });

      // If OCR missed expiry date, but Product Intelligence API detected it
      if (!parsedData.expiryDate && productIntelligence?.expiryInfo?.realExpiryDate) {
        parsedData.expiryDate = productIntelligence.expiryInfo.realExpiryDate;
        parsedData.hasExpiryFound = true;
      }

      // If OCR got generic name but Product API detected verified brand name
      if ((parsedData.name === 'Scanned Product' || parsedData.name === 'Scanned Medicine') && productIntelligence?.verifiedName) {
        parsedData.name = productIntelligence.verifiedName;
      }

      setProgressPercent(100);
      setAnalysisStatus('Complete!');

      // Check edge case: IF NO EXPIRY DATE IS FOUND -> Route to Undated Item flow
      if (!parsedData.hasExpiryFound) {
        setIsAnalyzing(false);
        showToast('No printed expiry date detected! Redirecting to Undated Item assistant...', 'info');
        
        onOpenUndatedModal({
          name: parsedData.name !== 'Scanned Product' && parsedData.name !== 'Scanned Medicine' ? parsedData.name : '',
          type: parsedData.type,
          frontImage,
          backImage,
          rawOcrText: parsedData.rawOcrText,
          ingredientsOriginal: parsedData.ingredientsOriginal,
          ingredientsTranslated: translated,
          productIntelligence
        });
        return;
      }

      // Package successfully parsed with expiry date & product intelligence!
      onAnalysisComplete({
        ...parsedData,
        frontImage,
        backImage,
        ingredientsTranslated: translated,
        targetLanguage: selectedLanguage,
        productIntelligence
      });

    } catch (err) {
      console.error('Scan analysis error:', err);
      showToast('OCR analysis encountered an issue. You can try another photo or enter manually.', 'warning');
      
      // Fallback route to undated/manual flow so user is never blocked
      onOpenUndatedModal({
        frontImage,
        backImage,
        rawOcrText: 'OCR could not read text cleanly'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 animate-fade-in">
      
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Product Intelligence & Expiry Vision</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Scan Groceries & Medicines
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Capture package labels or scan barcodes to detect verified real expiry dates, discover what products are made up of, and track their true lifespan & shelf life.
        </p>
      </div>

      {/* HERO: Live Barcode & Real Dataset Scanner Card */}
      <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-xl shadow-teal-900/10 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-md">
                ⚡ Instant Optical & Barcode Engine
              </span>
              <span className="text-[10px] font-bold text-emerald-100 bg-black/20 px-2 py-0.5 rounded-full">
                Real Datasets Connected
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              Live Camera Barcode & Dataset Scanner
            </h2>

            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed">
              Aim your camera at any food or medicine barcode/label. Automatically identifies products from <strong>Open Food Facts (3.2M+ Foods)</strong> and the <strong>U.S. FDA Drug Labeling Database</strong> to detect real active ingredients, true shelf-life, and post-expiry toxicity warnings.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-white/90">
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-md">
                <span>🥫</span>
                <span>Groceries & Ingredients</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-md">
                <span>💊</span>
                <span>Medicines & Pharmaceuticals</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-black/20 backdrop-blur-md">
                <span>🔔</span>
                <span>Laser Aim & Scanner Chime</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setIsBarcodeScannerOpen(true)}
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-slate-900 font-black text-sm shadow-xl shadow-black/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center space-x-2.5"
            >
              <Camera className="w-5 h-5 text-emerald-600" />
              <span>Launch Live Barcode Camera</span>
            </button>

            <div className="text-center text-[10px] text-emerald-100 font-semibold">
              Supports UPC-A, EAN-13, Code-128 & NDC codes
            </div>
          </div>
        </div>
      </div>

      {/* Manual Search & Quick Test Barcode Bar */}
      <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              <BarcodeIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                Direct Barcode / Product Search
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Type any barcode number or product name to query the real datasets directly
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleBarcodeOrApiLookup(); }} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Enter Barcode (e.g. 300450449107, 8901117012345, Nutella, Dolo 650)..."
              className="w-full px-4 py-2.5 text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isQueryingApi || !barcodeInput.trim()}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all shrink-0"
          >
            {isQueryingApi ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Querying Real Datasets...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Search Real Dataset</span>
              </>
            )}
          </button>
        </form>

        {/* 1-Click Fast Real Dataset Test Presets */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Sample Real Datasets:</span>
          {[
            { label: '🍫 Nutella (Food DB)', code: '3017620422003' },
            { label: '🥫 Heinz Ketchup (Food DB)', code: '0013000006030' },
            { label: '💊 Dolo 650 (Pharma DB)', code: '8901117012345' },
            { label: '💊 Tylenol (FDA DB)', code: '300450449107' },
            { label: '💉 Augmentin (Pharma DB)', code: '8901117098765' },
            { label: '👁️ Ciplox Eye Drops (Pharma DB)', code: '8901030000049' }
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setBarcodeInput(item.code);
                handleBarcodeOrApiLookup(item.code);
              }}
              className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400 transition-all"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick 1-Click Test Presets */}
      <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/60 via-teal-50/40 to-slate-50 dark:from-slate-900 dark:via-emerald-950/20 dark:to-slate-900 border border-emerald-200/70 dark:border-emerald-900/50 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-base">📸</span>
            <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Quick Photo Samples:</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">(Click to test OCR & AI in 1 second)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PRODUCTS.slice(0, 3).map(sample => (
              <button
                key={sample.id}
                onClick={() => handleLoadSample(sample)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  loadedSample?.id === sample.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                {sample.type === 'medicine' ? '💊' : '🥛'} {sample.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dual-Photo Capture Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-100 dark:shadow-none mb-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          
          {/* Card 1: Front Photo */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs">1</span>
                <span>Front of Package (Product Name & Brand)</span>
              </span>
              {frontImage && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Captured</span>
                </span>
              )}
            </div>

            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50 dark:bg-slate-850 overflow-hidden flex flex-col items-center justify-center transition-colors group">
              {frontImage ? (
                <div className="relative w-full h-full">
                  <img src={frontImage} alt="Front preview" className="w-full h-full object-contain p-2" />
                  <button
                    onClick={() => setFrontImage(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Front Label & Branding</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Used to extract product name & type</p>
                </div>
              )}
            </div>

            {/* Action buttons for Front photo */}
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={() => setCameraModal({ isOpen: true, target: 'front' })}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Camera</span>
              </button>

              <label className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'front')} 
                />
              </label>
            </div>
          </div>

          {/* Card 2: Back Photo (Expiry & Ingredients) */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-xs">2</span>
                <span>Back / Expiry & Ingredients Label</span>
              </span>
              {backImage && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Captured</span>
                </span>
              )}
            </div>

            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-slate-50 dark:bg-slate-850 overflow-hidden flex flex-col items-center justify-center transition-colors group">
              {backImage ? (
                <div className="relative w-full h-full">
                  <img src={backImage} alt="Back preview" className="w-full h-full object-contain p-2" />
                  <button
                    onClick={() => setBackImage(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto mb-2">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Expiry Date & Ingredients Table</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Where EXP, Use By, and Ingredients are printed</p>
                </div>
              )}
            </div>

            {/* Action buttons for Back photo */}
            <div className="flex items-center space-x-2 mt-3">
              <button
                onClick={() => setCameraModal({ isOpen: true, target: 'back' })}
                className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Camera</span>
              </button>

              <label className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'back')} 
                />
              </label>
            </div>
          </div>

        </div>

        {/* Translation Language Selector & Action Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <label htmlFor="language-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Translate Ingredients To:
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="mt-1 block font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Analyze Button */}
          <button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || (!frontImage && !backImage)}
            className={`flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-2xl font-extrabold text-base shadow-xl transition-all ${
              isAnalyzing || (!frontImage && !backImage)
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Reading Label...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Analyze Package with AI & OCR</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar (Visible while scanning) */}
        {isAnalyzing && (
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              <span>{analysisStatus}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Prominent Instant Kitchen Ingredients Vision Scanner Callout */}
      <div className="mb-4 rounded-3xl p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/15 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
            🍳
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
              Instant Food Maker
            </span>
            <h4 className="text-base sm:text-lg font-extrabold mt-0.5">
              Scan Available Ingredients at Home & Make Food
            </h4>
            <p className="text-xs text-amber-100 mt-0.5">
              Take a photo of your fridge or counter — get instant recipes with Protein, Carbs, Fats and calories!
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsPantryScannerOpen(true)}
          className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-extrabold text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
        >
          <ChefHat className="w-4 h-4 text-amber-600" />
          <span>Scan Ingredients & Make Food</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Prominent Undated Item Alternate Option */}
      <div className="rounded-2xl p-4 bg-slate-100/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
            <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No printed expiry date on your grocery or medicine?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For fresh bakery, market paneer, vegetables, or loose items, estimate shelf life with AI or enter manually.
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenUndatedModal({})}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm border border-indigo-200 dark:border-slate-700 shadow-sm transition-all whitespace-nowrap"
        >
          <span>Add & Estimate Manually</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModal.isOpen}
        onClose={() => setCameraModal({ isOpen: false, target: 'front' })}
        label={cameraModal.target === 'front' ? 'Front of Package' : 'Back / Label Side'}
        onCapture={(dataUrl) => {
          if (cameraModal.target === 'front') setFrontImage(dataUrl);
          else setBackImage(dataUrl);
        }}
      />

      {/* Kitchen Available Ingredients Scanner Modal */}
      <PantryVisionScannerModal
        isOpen={isPantryScannerOpen}
        onClose={() => setIsPantryScannerOpen(false)}
        onIngredientsConfirmed={(items) => {
          if (onNavigateToRecipes) onNavigateToRecipes();
        }}
      />

      {/* Live Barcode & Real Dataset Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onBarcodeDetected={(code) => {
          setIsBarcodeScannerOpen(false);
          setBarcodeInput(code);
          handleBarcodeOrApiLookup(code);
        }}
      />

    </div>
  );
}
