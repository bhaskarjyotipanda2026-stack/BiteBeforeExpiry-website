/**
 * Barcode & OCR Scanner Service
 * Multi-layer barcode recognition supporting:
 * 1. Native window.BarcodeDetector (fast hardware acceleration)
 * 2. ZXing Browser MultiFormatReader (universal client-side barcode decoding)
 * 3. OCR Digit Pattern Extractor (for barcode numbers printed on packaging)
 */

import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

let zxingReader = null;

function getZxingReader() {
  if (!zxingReader) {
    zxingReader = new BrowserMultiFormatReader();
  }
  return zxingReader;
}

/**
 * Checks if the browser natively supports BarcodeDetector API
 */
export async function isNativeBarcodeDetectorSupported() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return false;
  }
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    return formats && formats.length > 0;
  } catch (_) {
    return false;
  }
}

/**
 * Scan barcode from an HTML Video element frame (live camera feed)
 */
export async function scanBarcodeFromVideo(videoElement) {
  if (!videoElement || videoElement.readyState < 2) return null;

  // 1. Try Native BarcodeDetector first (fastest, lowest CPU)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix']
      });
      const barcodes = await detector.detect(videoElement);
      if (barcodes && barcodes.length > 0) {
        const primary = barcodes[0];
        playScannerBeep();
        return {
          rawValue: primary.rawValue,
          format: primary.format,
          cornerPoints: primary.cornerPoints,
          source: 'native_barcode_detector'
        };
      }
    } catch (err) {
      // Continue to ZXing fallback
    }
  }

  // 2. Fallback to ZXing MultiFormatReader
  try {
    const reader = getZxingReader();
    // Use an offscreen canvas to capture video frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const result = reader.decodeFromCanvas(canvas);
      if (result) {
        playScannerBeep();
        return {
          rawValue: result.getText ? result.getText() : result.text,
          format: result.getBarcodeFormat ? result.getBarcodeFormat().toString() : 'BARCODE',
          source: 'zxing_engine'
        };
      }
    }
  } catch (err) {
    if (!(err instanceof NotFoundException)) {
      // NotFoundException is standard during scanning frames without barcode
    }
  }

  return null;
}

/**
 * Scan barcode from an Image Source (File, Blob, base64 URL, or Image element)
 */
export async function scanBarcodeFromImageSource(imageSource) {
  if (!imageSource) return null;

  // Load image element
  const img = await loadImageElement(imageSource);

  // 1. Try Native BarcodeDetector
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const detector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix']
      });
      const barcodes = await detector.detect(img);
      if (barcodes && barcodes.length > 0) {
        playScannerBeep();
        return {
          rawValue: barcodes[0].rawValue,
          format: barcodes[0].format,
          source: 'native_barcode_detector'
        };
      }
    } catch (err) {
      // Fall through to ZXing
    }
  }

  // 2. Fallback to ZXing
  try {
    const reader = getZxingReader();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width || 640;
    canvas.height = img.naturalHeight || img.height || 480;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const result = reader.decodeFromCanvas(canvas);
      if (result) {
        playScannerBeep();
        return {
          rawValue: result.getText ? result.getText() : result.text,
          format: result.getBarcodeFormat ? result.getBarcodeFormat().toString() : 'BARCODE',
          source: 'zxing_engine'
        };
      }
    }
  } catch (err) {
    if (!(err instanceof NotFoundException)) {
      console.warn('ZXing image decode error:', err);
    }
  }

  return null;
}

/**
 * Extract barcode candidates from raw OCR text
 * (Useful when OCR captures the numeric digits printed beneath the barcode bars)
 */
export function extractBarcodeCandidatesFromOcr(ocrText) {
  if (!ocrText || typeof ocrText !== 'string') return [];

  const candidates = [];
  // Look for 8 to 14 consecutive digits or spaced digits like "8 901030 892341"
  const cleanLine = ocrText.replace(/\r/g, '\n');
  const lines = cleanLine.split('\n');

  for (const line of lines) {
    // 1. Pure contiguous digits 8-14 chars
    const matchContiguous = line.match(/\b\d{8,14}\b/g);
    if (matchContiguous) {
      candidates.push(...matchContiguous);
    }

    // 2. Barcode with spaces like "0 12345 67890 5" or "8 901234 567890"
    const spacedPattern = /\b\d\s+\d{4,6}\s+\d{4,6}(\s+\d)?\b/g;
    const spacedMatches = line.match(spacedPattern);
    if (spacedMatches) {
      spacedMatches.forEach(m => {
        const compacted = m.replace(/\s+/g, '');
        if (compacted.length >= 8 && compacted.length <= 14) {
          candidates.push(compacted);
        }
      });
    }
  }

  // Deduplicate and filter out common false positives (like timestamps, year dates 2024, etc.)
  const unique = Array.from(new Set(candidates)).filter(num => {
    // Exclude simple years like 2024, 2025, 2026
    if (/^(202[0-9]|19[0-9]{2})$/.test(num)) return false;
    return true;
  });

  return unique;
}

/**
 * Parses GS1 Barcode identifiers (AI 17 for Expiry Date, AI 11 for Mfg Date, AI 10 for Batch)
 * Format in GS1-128 / DataMatrix:
 * - AI (17) YYMMDD -> Expiry Date
 * - AI (11) YYMMDD -> Mfg Date
 * - AI (10) LOT/BATCH -> Batch number
 */
export function parseGs1Barcode(rawBarcode) {
  if (!rawBarcode || typeof rawBarcode !== 'string') return {};
  const clean = rawBarcode.trim();

  const result = {
    gtin: null,
    expiryDate: null,
    mfgDate: null,
    batchNumber: null
  };

  // 1. Bracketed format: (01)08901117012345(17)270331(11)240410(10)DL4029
  const expMatchBracket = clean.match(/\(17\)\s*(\d{6})/);
  if (expMatchBracket) {
    const yy = parseInt(expMatchBracket[1].substring(0, 2), 10);
    const mm = expMatchBracket[1].substring(2, 4);
    const dd = expMatchBracket[1].substring(4, 6);
    const fullYear = yy >= 20 ? 2000 + yy : 1900 + yy;
    result.expiryDate = `${fullYear}-${mm}-${dd}`;
  }

  const mfgMatchBracket = clean.match(/\(11\)\s*(\d{6})/);
  if (mfgMatchBracket) {
    const yy = parseInt(mfgMatchBracket[1].substring(0, 2), 10);
    const mm = mfgMatchBracket[1].substring(2, 4);
    const dd = mfgMatchBracket[1].substring(4, 6);
    const fullYear = yy >= 20 ? 2000 + yy : 1900 + yy;
    result.mfgDate = `${fullYear}-${mm}-${dd}`;
  }

  const batchMatchBracket = clean.match(/\(10\)\s*([A-Za-z0-9_-]+)/);
  if (batchMatchBracket) {
    result.batchNumber = batchMatchBracket[1];
  }

  // 2. Unbracketed GS1 string format starting with 01 + 14 digits + 17 + 6 digits
  const unbracketedMatch = clean.match(/01(\d{14})17(\d{6})(?:10([A-Za-z0-9]+))?/);
  if (unbracketedMatch) {
    result.gtin = unbracketedMatch[1];
    const expStr = unbracketedMatch[2];
    const yy = parseInt(expStr.substring(0, 2), 10);
    const mm = expStr.substring(2, 4);
    const dd = expStr.substring(4, 6);
    const fullYear = yy >= 20 ? 2000 + yy : 1900 + yy;
    result.expiryDate = `${fullYear}-${mm}-${dd}`;
    if (unbracketedMatch[3]) {
      result.batchNumber = unbracketedMatch[3];
    }
  }

  return result;
}

/**
 * Plays a pleasant optical scanner "beep" chime via Web Audio API
 */
export function playScannerBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Classic barcode scanner frequency ~1850Hz
    osc.frequency.setValueAtTime(1850, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2200, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.13);

    // Haptic vibration on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }
  } catch (_) {
    // Audio context may be restricted before user gesture
  }
}

/**
 * Helper to load an image source into HTMLImageElement
 */
function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof Blob || source instanceof File) {
      img.src = URL.createObjectURL(source);
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}
