import { createWorker } from 'tesseract.js';

/**
 * Runs OCR on an image (File, Blob, or base64 URL)
 * Uses client-side Tesseract.js by default.
 * If Google Vision API key is provided and valid, it calls Google Cloud Vision API.
 */
export async function performOcr(imageSource, options = {}) {
  const { onProgress, googleVisionApiKey } = options;

  // 1. If user provided a real Google Cloud Vision API Key
  if (googleVisionApiKey && googleVisionApiKey.trim() !== '' && !googleVisionApiKey.includes('{{API_KEY_HERE}}')) {
    try {
      if (onProgress) onProgress({ status: 'Connecting to Google Cloud Vision API...', progress: 0.2 });
      
      const base64Data = await getBase64FromSource(imageSource);
      const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleanBase64 },
              features: [{ type: 'TEXT_DETECTION' }]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.statusText}`);
      }

      const data = await response.json();
      const fullText = data.responses?.[0]?.fullTextAnnotation?.text || '';
      if (onProgress) onProgress({ status: 'Google Vision OCR Complete', progress: 1.0 });
      return { text: fullText, source: 'google_vision' };
    } catch (err) {
      console.warn('Google Vision OCR failed, falling back to local Tesseract.js:', err);
      // Fall through to Tesseract.js
    }
  }

  // 2. Client-side Tesseract.js (Zero-config, offline capable with reliable CDN)
  let worker = null;
  try {
    if (onProgress) onProgress({ status: 'Preprocessing image for character detection...', progress: 0.1 });
    
    // Preprocess image (resize to optimal dimensions & boost text contrast)
    const optimizedImage = await preprocessImageForOcr(imageSource);

    if (onProgress) onProgress({ status: 'Initializing OCR engine...', progress: 0.2 });

    // Initialize worker with high-reliability CDN endpoints
    worker = await createWorker('eng', 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1/tesseract-core-simd-lstm.wasm.js',
      langPath: 'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0',
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress({
            status: `Reading package label (${Math.round((m.progress || 0) * 100)}%)...`,
            progress: 0.3 + (m.progress || 0) * 0.65
          });
        }
      }
    });

    if (onProgress) onProgress({ status: 'Analyzing characters & contrast...', progress: 0.35 });
    
    const ret = await worker.recognize(optimizedImage);
    const extractedText = ret.data?.text || '';
    
    if (onProgress) onProgress({ status: 'Text extraction complete!', progress: 1.0 });
    
    await worker.terminate();
    return { text: extractedText, source: 'tesseract_client' };
  } catch (err) {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
    console.error('Tesseract.js OCR error:', err);
    throw err;
  }
}

/**
 * Preprocesses image for maximum optical character recognition accuracy
 * Resizes huge camera photos and enhances text contrast for dot-matrix stamped dates
 */
async function preprocessImageForOcr(source) {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return source;

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      if (typeof source === 'string') image.src = source;
      else if (source instanceof Blob || source instanceof File) image.src = URL.createObjectURL(source);
      else reject(new Error('Invalid image source'));
    });

    const maxDim = 1400;
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;

    ctx.drawImage(img, 0, 0, width, height);

    // Grayscale and contrast stretch to make stamped expiry dates pop out clearly
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const contrasted = gray > 140 ? Math.min(255, gray * 1.15) : Math.max(0, gray * 0.85);
      data[i] = contrasted;
      data[i + 1] = contrasted;
      data[i + 2] = contrasted;
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.warn('Image preprocessing skipped, using raw image:', err);
    return source;
  }
}

// Helper to convert File/Blob/URL to base64
function getBase64FromSource(source) {
  return new Promise((resolve, reject) => {
    if (typeof source === 'string' && source.startsWith('data:')) {
      return resolve(source);
    }
    if (source instanceof Blob || source instanceof File) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(source);
      return;
    }
    // If it's a remote/public URL, fetch it and convert
    fetch(source)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}
