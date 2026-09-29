/**
 * Parser service to extract Expiry Date, Manufacturing Date, Batch Number,
 * Product Name, Item Type, and Ingredients from OCR text.
 */

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
};

// Normalize dates into ISO YYYY-MM-DD
function normalizeDate(raw) {
  if (!raw) return null;
  const str = raw.trim();

  // 1. Pattern: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (check first so YYYY is not confused with MM-YY)
  const isoMatch = str.match(/\b(20\d\d)[\/\-\.]([0-1]?[0-9])[\/\-\.]([0-3]?[0-9])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // 2. Pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/\b([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.](20\d\d|\d\d)\b/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, '0');
    let month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = '20' + year;
    // Swap if month > 12 and day <= 12
    if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }
    return `${year}-${month}-${day}`;
  }

  // 3. Pattern: 24 OCT 2026 or 24-OCT-2026 or OCT 2026 or 15/DEC/2026
  const textMonthMatch = str.match(/\b(?:([0-3]?[0-9])[\s\-\/\.]?)?([A-Za-z]{3,9})[\s\-\/\.](20\d\d|\d\d)\b/i);
  if (textMonthMatch) {
    const day = textMonthMatch[1] ? textMonthMatch[1].padStart(2, '0') : '28';
    const mStr = textMonthMatch[2].toLowerCase();
    let year = textMonthMatch[3];
    if (year.length === 2) year = '20' + year;

    for (const [key, num] of Object.entries(MONTH_MAP)) {
      if (mStr.startsWith(key)) {
        return `${year}-${num}-${day}`;
      }
    }
  }

  // 4. Pattern: MM/YYYY or MM-YYYY or MM/YY
  const myMatch = str.match(/\b([0-1]?[0-9])[\/\-\.](20\d\d|\d\d)\b/);
  if (myMatch) {
    let month = myMatch[1].padStart(2, '0');
    let year = myMatch[2];
    if (year.length === 2) year = '20' + year;
    if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
      // Return last day of month
      const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extracts expiry date from text
 */
export function extractExpiryDate(text) {
  if (!text) return null;

  // Specific lookups for expiry keywords
  const expKeywords = [
    /(?:exp(?:iry)?\.?\s*(?:date)?|use\s*by|best\s*before|consume\s*before|bbd?|val(?:idity)?)[:\s\-]*([0-9a-zA-Z\/\.\-\s]{4,20})/i,
    /(?:expires|expiry)[:\s\-]*([0-9a-zA-Z\/\.\-\s]{4,20})/i
  ];

  for (const regex of expKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = normalizeDate(match[1]);
      if (parsed) return parsed;
    }
  }

  // Fallback: search lines containing EXP
  const lines = text.split('\n');
  for (const line of lines) {
    if (/\b(?:exp|best\s*before|use\s*by)\b/i.test(line)) {
      const parsed = normalizeDate(line);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Extracts manufacturing date from text
 */
export function extractMfgDate(text) {
  if (!text) return null;

  const mfgKeywords = [
    /(?:mfg|mfd|manufactured|packed\s*on|pkd|date\s*of\s*mfg)[:\s\-]*([0-9a-zA-Z\/\.\-\s]{4,20})/i
  ];

  for (const regex of mfgKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = normalizeDate(match[1]);
      if (parsed) return parsed;
    }
  }

  // Fallback: search lines containing MFG or PKD
  const lines = text.split('\n');
  for (const line of lines) {
    if (/\b(?:mfg|mfd|pkd|packed)\b/i.test(line)) {
      const parsed = normalizeDate(line);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Extracts ingredients list
 */
export function extractIngredients(text) {
  if (!text) return [];

  // Match Ingredients or Composition section
  const sectionRegex = /(?:ingredients|composition|contains|each\s+.*?contains)[:\s]+([\s\S]+?)(?=(?:storage|mfg|manufactured|net\s*wt|lic|batch|b\.no|marketed|dosage|warning|directions|$))/i;
  const match = text.match(sectionRegex);

  let rawSection = '';
  if (match && match[1]) {
    rawSection = match[1];
  } else {
    // If not found with section regex, check if there's a line starting with ingredients
    const lines = text.split('\n');
    const ingIndex = lines.findIndex(l => /ingredients|composition|contains/i.test(l));
    if (ingIndex !== -1) {
      rawSection = lines.slice(ingIndex, ingIndex + 4).join(' ');
      rawSection = rawSection.replace(/^(?:ingredients|composition|contains)[:\s]*/i, '');
    }
  }

  if (!rawSection || rawSection.trim().length === 0) {
    return [];
  }

  // Split by commas, semicolons, bullets, or newlines
  const items = rawSection
    .replace(/\r?\n/g, ' ')
    .split(/[,;•|]/)
    .map(s => s.trim().replace(/^[\*\-\.\s]+/, ''))
    .filter(s => s.length > 2 && s.length < 80 && !/^[\d\.\s%]+$/.test(s));

  // Remove duplicates and return clean list
  const seen = new Set();
  const cleanList = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      cleanList.push(item);
    }
  }

  return cleanList.slice(0, 15);
}

/**
 * Infers product type (grocery or medicine)
 */
export function inferProductType(text) {
  if (!text) return 'grocery';
  const medicineKeywords = [
    'tablet', 'capsule', 'syrup', 'suspension', 'ointment', 'dosage',
    'mg', 'ip', 'usp', 'bp', 'rx', 'paracetamol', 'amoxicillin', 'physician',
    'prescription', 'pharma', 'analgesic', 'antibiotic'
  ];

  const lower = text.toLowerCase();
  for (const kw of medicineKeywords) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(lower)) return 'medicine';
  }
  return 'grocery';
}

/**
 * Extracts product name candidate from text
 */
export function extractProductName(text, fallback = 'Scanned Product') {
  if (!text) return fallback;
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3 && !/^(ingredients|mfg|exp|batch|net|store|keep|b\.no)/i.test(l));

  if (lines.length > 0) {
    // Return first clean uppercase or title-like line
    return lines[0].substring(0, 45);
  }
  return fallback;
}

/**
 * Full parsing pipeline given front and back text
 */
export function parsePackageData(frontText = '', backText = '') {
  const combinedText = `${frontText}\n${backText}`;

  const expiryDate = extractExpiryDate(combinedText);
  const mfgDate = extractMfgDate(combinedText);
  const ingredientsOriginal = extractIngredients(combinedText);
  const type = inferProductType(combinedText);
  const name = extractProductName(frontText || backText, type === 'medicine' ? 'Scanned Medicine' : 'Scanned Grocery');

  return {
    name,
    type,
    expiryDate,
    mfgDate,
    ingredientsOriginal,
    rawOcrText: combinedText.trim(),
    hasExpiryFound: !!expiryDate
  };
}
