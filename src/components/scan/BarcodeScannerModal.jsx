import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, Flashlight, RefreshCw, Upload, Sparkles, CheckCircle2, 
  AlertCircle, Pill, Utensils, Zap, HelpCircle, Loader2, Barcode as BarcodeIcon
} from 'lucide-react';
import { scanBarcodeFromVideo, scanBarcodeFromImageSource, playScannerBeep } from '../../services/barcodeScannerService';

const SAMPLE_REAL_BARCODES = [
  // Food & Ingredients
  { code: '3017620422003', name: 'Nutella Hazelnut Spread', category: 'grocery', icon: '🍫', db: 'Open Food Facts', dates: 'Exp: 14 Jul 2025 • Mfg: 15 Jul 2024' },
  { code: '0013000006030', name: 'Heinz Tomato Ketchup', category: 'grocery', icon: '🥫', db: 'Open Food Facts', dates: 'Exp: 10 Aug 2025 • Mfg: 10 May 2024' },
  { code: '0030000010204', name: 'Quaker Whole Rolled Oats', category: 'grocery', icon: '🥣', db: 'Open Food Facts', dates: 'Exp: 31 May 2025 • Mfg: 01 Jun 2024' },
  { code: '8076809513753', name: 'Barilla Penne Rigate', category: 'grocery', icon: '🍝', db: 'Open Food Facts', dates: 'Exp: 09 Mar 2026 • Mfg: 10 Mar 2024' },
  // Medicines & Pharmaceuticals
  { code: '8901117012345', name: 'Dolo 650 (Paracetamol)', category: 'medicine', icon: '💊', db: 'Micro Labs Pharma', dates: 'Exp: 31 Mar 2027 • Mfg: 10 Apr 2024' },
  { code: '300450449107', name: 'Tylenol Extra Strength 500mg', category: 'medicine', icon: '💊', db: 'U.S. FDA Drug DB', dates: 'Exp: 31 Jan 2027 • Mfg: 15 Feb 2024' },
  { code: '8901117098765', name: 'Augmentin 625 Duo (Amoxicillin)', category: 'medicine', icon: '💉', db: 'GSK Pharma DB', dates: 'Exp: 31 Jul 2026 • Mfg: 01 Aug 2024' },
  { code: '8901234567890', name: 'Crocin Advance (Paracetamol)', category: 'medicine', icon: '💊', db: 'GSK Pharma DB', dates: 'Exp: 30 Apr 2026 • Mfg: 12 May 2024' },
  { code: '305730164402', name: 'Advil Liqui-Gels (Ibuprofen)', category: 'medicine', icon: '💊', db: 'U.S. FDA Drug DB', dates: 'Exp: 31 May 2026 • Mfg: 20 Jun 2024' },
  { code: '8901030000049', name: 'Ciplox Eye Drops (Ciprofloxacin)', category: 'medicine', icon: '👁️', db: 'Cipla Pharma DB', dates: 'Exp: 31 Aug 2026 • Mfg: 01 Sep 2024' }
];

export function BarcodeScannerModal({ isOpen, onClose, onBarcodeDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const fileInputRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'grocery', 'medicine'
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' or 'user'
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedCode, setDetectedCode] = useState(null);
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);
    setDetectedCode(null);

    // Stop any existing tracks
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

      // Check flashlight/torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      }

      // Start continuous barcode scanning loop (approx ~6 frames per second for smooth battery efficiency)
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = setInterval(async () => {
        if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
          try {
            const result = await scanBarcodeFromVideo(videoRef.current);
            if (result && result.rawValue) {
              handleBarcodeSuccess(result.rawValue, result.format);
            }
          } catch (_) {
            // Frame skip
          }
        }
      }, 160);

    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access unavailable or blocked. You can upload a photo or pick a sample barcode below.');
      setIsScanning(false);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Failed to toggle torch:', e);
      }
    }
  };

  // Switch between back and front camera
  const switchCamera = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Stop camera on unmount or close
  const stopCamera = () => {
    clearInterval(scanIntervalRef.current);
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
    }
    return () => stopCamera();
  }, [isOpen, cameraFacing]);

  // When barcode is detected
  const handleBarcodeSuccess = (code, format = 'EAN/UPC') => {
    if (detectedCode) return; // prevent duplicate fire
    stopCamera();
    setDetectedCode(code);
    playScannerBeep();

    setTimeout(() => {
      onBarcodeDetected(code, activeCategory);
    }, 600);
  };

  // Handle image upload with barcode
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await scanBarcodeFromImageSource(file);
      if (result && result.rawValue) {
        handleBarcodeSuccess(result.rawValue, result.format);
      } else {
        alert('No barcode detected in this image. Try taking a closer, well-lit photo or enter the barcode numbers below.');
      }
    } catch (err) {
      console.error('File scan error:', err);
      alert('Could not decode barcode from this file.');
    }
  };

  // Filter samples based on category toggle
  const filteredSamples = SAMPLE_REAL_BARCODES.filter(s => {
    if (activeCategory === 'all') return true;
    return s.category === activeCategory;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <BarcodeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white">
                  Real Dataset Scanner
                </span>
                <span className="text-[10px] font-bold text-emerald-100 hidden sm:inline">
                  • Open Food Facts & U.S. FDA Drug DB
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Live Barcode & OCR Scanner
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

        {/* Category Switcher */}
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
            <span>Target Mode:</span>
          </div>

          <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                activeCategory === 'all'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Auto-Detect</span>
            </button>

            <button
              onClick={() => setActiveCategory('grocery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                activeCategory === 'grocery'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Food & Ingredients</span>
            </button>

            <button
              onClick={() => setActiveCategory('medicine')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                activeCategory === 'medicine'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medicines & Drugs</span>
            </button>
          </div>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-black flex-1 min-h-[260px] sm:min-h-[320px] max-h-[420px] flex items-center justify-center overflow-hidden">
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
                  <span>Upload Photo</span>
                </button>
              </div>
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

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                <div className="relative w-64 sm:w-80 h-40 sm:h-48 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                  
                  {/* Laser Scan Line Animation */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse"
                    style={{
                      animation: 'scanLaser 2s ease-in-out infinite alternate'
                    }}
                  />

                  {/* Corner Targets */}
                  <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Aiming Label */}
                  <div className="absolute -bottom-8 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-extrabold text-white text-center shadow-lg border border-white/20">
                    Align Barcode or Medicine Strip within Box
                  </div>
                </div>
              </div>

              {/* Success Overlay */}
              {detectedCode && (
                <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 animate-fade-in">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2 animate-bounce" />
                  <span className="text-xs uppercase font-black tracking-widest text-emerald-300">
                    Barcode Detected!
                  </span>
                  <span className="text-2xl font-black text-white font-mono mt-1">
                    {detectedCode}
                  </span>
                  <div className="flex items-center space-x-2 text-xs text-emerald-200 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Querying real {activeCategory === 'medicine' ? 'FDA Drug' : 'Open Food Facts'} dataset...</span>
                  </div>
                </div>
              )}

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

        {/* Bottom Section: Manual Entry & Quick Test Samples */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-4 overflow-y-auto">
          
          {/* Manual Barcode / Name Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Or type Barcode (e.g. 300450449107, 8901117012345, Nutella)..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualCodeInput.trim()) {
                    handleBarcodeSuccess(manualCodeInput.trim());
                  }
                }}
                className="w-full px-4 py-2.5 pl-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            </div>

            <button
              onClick={() => {
                if (manualCodeInput.trim()) {
                  handleBarcodeSuccess(manualCodeInput.trim());
                }
              }}
              disabled={!manualCodeInput.trim()}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>Look Up Real Dataset</span>
            </button>
          </div>

          {/* Quick-Test Real Barcodes Carousel */}
          <div>
            <div className="flex items-center justify-between text-xs font-extrabold text-slate-600 dark:text-slate-400 mb-2">
              <span className="flex items-center space-x-1">
                <span>⚡ Instant Real Dataset Test Barcodes:</span>
              </span>
              <span className="text-[10px] text-slate-400">Click to test live API</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredSamples.map((sample, idx) => (
                <button
                  key={idx}
                  id={`btn-sample-barcode-${sample.code}`}
                  data-testid="barcode-sample-btn"
                  onClick={() => handleBarcodeSuccess(sample.code)}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 text-left transition-all group flex items-start space-x-2 shadow-xs"
                >
                  <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                    {sample.icon}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate block">
                      {sample.name}
                    </span>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {sample.code}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                        {sample.db}
                      </span>
                    </div>
                    {sample.dates && (
                      <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center space-x-1">
                        <span>🗓️</span>
                        <span>{sample.dates}</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 8px; }
          100% { top: calc(100% - 10px); }
        }
      `}</style>
    </div>
  );
}
