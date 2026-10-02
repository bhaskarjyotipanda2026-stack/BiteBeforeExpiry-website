import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Flashlight, RefreshCw, Upload, Sparkles, CheckCircle2, 
  AlertCircle, FileText, Loader2, Info, ArrowRight, Check
} from 'lucide-react';
import { performOcr } from '../../services/ocrService';
import { parsePackageData } from '../../services/parserService';
import { useApp } from '../../context/AppContext';

// Hackathon quick-demo presets for instant label testing
const QUICK_DEMO_LABELS = [
  {
    name: 'Parle-G Glucose Biscuits',
    subtitle: 'MFG + Best Before 6 Months + Batch + Ingredients',
    sampleText: `PARLE-G GLUCOSE BISCUITS\nMFG: 01/09/2026\nBEST BEFORE 6 MONTHS FROM PACKAGING\nBATCH NO: PG-8821B\nINGREDIENTS: Wheat Flour, Sugar, Edible Vegetable Oil, Invert Sugar Syrup, Milk Solids, Salt, Leavening Agents\nNUTRITION PER 100g: Energy 454 kcal, Protein 6.7g, Carbohydrates 77.1g, Total Fat 13g, Sugar 26.5g`,
    previewImg: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=60'
  },
  {
    name: 'Amul Taaza Homogenised Toned Milk',
    subtitle: 'Explicit EXP Date + Batch + Cold Storage Guidance',
    sampleText: `AMUL TAAZA HOMOGENISED TONED MILK\nMFG DATE: 10/05/2026\nEXPIRY: 10/11/2026\nBATCH: AM-9021\nINGREDIENTS: Toned Milk, Vitamin A, Vitamin D\nNUTRITION: Energy 58 kcal, Protein 3.0g, Carbohydrates 4.7g, Total Fat 3.0g, Calcium 120mg\nSTORAGE: Store in cool dry place. Once opened, consume within 2 days.`,
    previewImg: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=60'
  },
  {
    name: 'Dolo 650 Tablets (Paracetamol)',
    subtitle: 'Pharma Packaging with Batch & Expiry Stamp',
    sampleText: `DOLO 650 TABLETS\nEach uncoated tablet contains: Paracetamol IP 650mg\nMFG: 15/04/2025\nEXP: 31/03/2028\nB.NO: DL-4029\nCOMPOSITION: Paracetamol IP 650mg, Excipients q.s.\nDOSAGE: As directed by the physician. Do not exceed 4000mg in 24 hours.`,
    previewImg: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=60'
  }
];

export function OcrLabelScannerModal({ isOpen, onClose, onLabelParsed, initialBarcodeData = null }) {
  const { settings, showToast } = useApp();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [cameraFacing, setCameraFacing] = useState('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // OCR processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);

  // Start Camera Feed
  const startCamera = async () => {
    setCameraError(null);
    setPreviewImage(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: cameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access unavailable or permission denied. You can upload a photo of the package label or select a sample label below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setPreviewImage(null);
      setIsProcessing(false);
    }
    return () => stopCamera();
  }, [isOpen, cameraFacing]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const next = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: next }] });
        setTorchOn(next);
      } catch (e) {
        console.warn('Torch toggle error:', e);
      }
    }
  };

  const switchCamera = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture current video frame and run OCR
  const capturePhotoFromVideo = () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    stopCamera();
    setPreviewImage(dataUrl);
    processImageOcr(dataUrl);
  };

  // Handle image upload from device/gallery
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      stopCamera();
      setPreviewImage(reader.result);
      processImageOcr(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR pipeline on image dataUrl
  const processImageOcr = async (imageSource) => {
    setIsProcessing(true);
    setOcrProgress(15);
    setOcrStatus('Initializing OCR engine...');

    try {
      const googleKey = settings.apiKeys?.googleVisionApiKey;
      const res = await performOcr(imageSource, {
        googleVisionApiKey: googleKey,
        onProgress: (p) => {
          setOcrStatus(p.status || 'Scanning label text...');
          setOcrProgress(Math.round(20 + (p.progress || 0) * 70));
        }
      });

      const extractedText = (res.text || '').trim();

      if (!extractedText || extractedText.length < 5) {
        setIsProcessing(false);
        showToast('No readable text detected on this label. Please retake with better lighting.', 'warning');
        return;
      }

      setOcrStatus('Parsing dates, batch & ingredients...');
      setOcrProgress(95);

      const parsed = parsePackageData('', extractedText);

      setOcrProgress(100);
      setOcrStatus('Label parsed successfully!');

      setTimeout(() => {
        onLabelParsed({
          ...parsed,
          labelImage: imageSource,
          rawOcrText: extractedText
        });
      }, 500);

    } catch (err) {
      console.error('OCR processing error:', err);
      setIsProcessing(false);
      showToast('OCR analysis encountered an issue. You can retry or enter details manually.', 'error');
    }
  };

  // Instant 1-click test preset
  const handleSelectPreset = (preset) => {
    stopCamera();
    setIsProcessing(true);
    setOcrProgress(50);
    setOcrStatus(`Loading ${preset.name}...`);

    setTimeout(() => {
      const parsed = parsePackageData('', preset.sampleText);
      setOcrProgress(100);
      setOcrStatus('Complete!');
      setTimeout(() => {
        onLabelParsed({
          ...parsed,
          name: parsed.name && parsed.name !== 'Scanned Grocery' ? parsed.name : preset.name,
          labelImage: preset.previewImg,
          rawOcrText: preset.sampleText
        });
      }, 400);
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white">
                  OCR Label Scanner
                </span>
                {initialBarcodeData && (
                  <span className="text-[10px] font-bold text-emerald-100 bg-black/20 px-2 py-0.5 rounded-md">
                    Linking with: {initialBarcodeData.name || 'Scanned Barcode'}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Scan Package Label with OCR
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barcode Context Banner (if user already scanned barcode) */}
        {initialBarcodeData && (
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="text-base">🏷️</span>
              <span className="text-slate-800 dark:text-slate-200">
                Barcode Product: <strong>{initialBarcodeData.name}</strong> ({initialBarcodeData.brand || initialBarcodeData.category || 'General'})
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
              Scanning package for MFG, EXP & Batch
            </span>
          </div>
        )}

        {/* Viewfinder / Preview Camera Area */}
        <div className="relative bg-black flex-1 min-h-[260px] sm:min-h-[340px] max-h-[420px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-md text-white">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-bold mb-4">{cameraError}</p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black flex items-center justify-center space-x-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Label Photo</span>
                </button>
              </div>
            </div>
          ) : previewImage ? (
            /* Preview of captured image */
            <div className="relative w-full h-full flex items-center justify-center">
              <img src={previewImage} alt="Captured label" className="w-full h-full object-contain" />
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 animate-fade-in p-6 text-center">
                  <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mb-3" />
                  <span className="text-base font-black text-white">{ocrStatus}</span>
                  <div className="w-64 max-w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 mt-2 font-mono">{ocrProgress}%</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Reticle for Label / Expiry Section */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-72 sm:w-96 h-48 sm:h-56 rounded-2xl border-2 border-dashed border-emerald-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex flex-col items-center justify-center text-center p-4">
                  
                  {/* Corner Targets */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

                  <div className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-xs font-bold text-white shadow-lg border border-white/20">
                    Align Expiry (EXP), MFG Date, Batch & Ingredients
                  </div>
                </div>
              </div>

              {/* Camera Controls Overlay */}
              <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                {hasTorch && (
                  <button
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-full backdrop-blur-md transition-colors ${
                      torchOn ? 'bg-amber-400 text-slate-950' : 'bg-black/50 text-white hover:bg-black/70'
                    }`}
                    title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={switchCamera}
                  className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                  title="Switch Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
                  title="Upload Image"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>

              {/* Big Shutter Button */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-4 z-10 px-4">
                <button
                  onClick={capturePhotoFromVideo}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-sm shadow-xl shadow-black/40 flex items-center space-x-2.5 transform hover:scale-105 active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5 text-white" />
                  <span>Take Photo & Read Label</span>
                </button>
              </div>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        {/* Bottom Section: Upload from Device & Hackathon Test Presets */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-3.5 overflow-y-auto">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-xs"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Upload Label Image from Gallery</span>
            </button>

            {previewImage && !isProcessing && (
              <button
                onClick={startCamera}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>
            )}
          </div>

          {/* 1-Click Fast Test Label Presets */}
          <div>
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-400 mb-2">
              <span className="flex items-center space-x-1">
                <span>⚡ Instant OCR Test Label Presets:</span>
              </span>
              <span className="text-[10px] text-slate-400">Click to simulate label capture</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {QUICK_DEMO_LABELS.map((preset, idx) => (
                <button
                  key={idx}
                  id={`btn-sample-ocr-${idx}`}
                  data-testid="ocr-preset-btn"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-left transition-all shadow-xs group"
                >
                  <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                    {preset.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {preset.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
