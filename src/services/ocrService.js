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

  // 2. Client-side Tesseract.js (Zero-config, offline capable)
  let worker = null;
  try {
    if (onProgress) onProgress({ status: 'Initializing OCR engine...', progress: 0.1 });
    
    worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress({
            status: `Reading package label (${Math.round((m.progress || 0) * 100)}%)...`,
            progress: 0.2 + (m.progress || 0) * 0.75
          });
        }
      }
    });

    if (onProgress) onProgress({ status: 'Analyzing characters & contrast...', progress: 0.25 });
    
    const ret = await worker.recognize(imageSource);
    const extractedText = ret.data.text || '';
    
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
