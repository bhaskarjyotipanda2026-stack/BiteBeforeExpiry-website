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
export function normalizeDate(raw) {
  if (!raw) return null;
  const str = raw.trim();

  // 1. Pattern: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const isoMatch = str.match(/\b(20\d\d)[\/\-\.]([0-1]?[0-9])[\/\-\.]([0-3]?[0-9])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }

  // 2. Pattern: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD/MM/YY or DD-MM-YY or DD.MM.YY
  const dmyMatch = str.match(/\b([0-3]?[0-9])[\/\-\.]([0-1]?[0-9])[\/\-\.](20\d\d|\d\d)\b/);
  if (dmyMatch) {
    let day = dmyMatch[1].padStart(2, '0');
    let month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = '20' + year;
    // Swap if month > 12 and day <= 12 (handle potential MM/DD/YYYY)
    if (parseInt(month, 10) > 12 && parseInt(day, 10) <= 12) {
      const temp = day;
      day = month;
      month = temp;
    }
    if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12 && parseInt(day, 10) >= 1 && parseInt(day, 10) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // 3. Pattern: 24 OCT 2026 or 24-OCT-2026 or OCT 2026 or 15/DEC/2026 or 01-SEP-26
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

  // 4. Pattern: MM/YYYY or MM-YYYY or MM.YYYY or MM/YY or MM-YY
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
 * Extracts all valid dates found in a block of text
 */
export function extractAllDates(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const found = new Set();

  // Search each line for dates
  for (const line of lines) {
    const d = normalizeDate(line);
    if (d) found.add(d);
  }

  return Array.from(found);
}

/**
 * Extracts expiry date from text
 */
export function extractExpiryDate(text) {
  if (!text) return null;

  // Specific lookups for expiry keywords
  const expKeywords = [
    /(?:exp(?:iry)?\.?\s*(?:date)?|use\s*by|best\s*before|consume\s*before|bbd?|val(?:idity)?|exd)[:\s\-]*([0-9a-zA-Z\/\.\-]{4,14})\b/i,
    /(?:expires|expiry)[:\s\-]*([0-9a-zA-Z\/\.\-]{4,14})\b/i
  ];

  for (const regex of expKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const parsed = normalizeDate(match[1]);
      if (parsed) return parsed;
    }
  }

  // Fallback: search lines containing EXP or Best Before
  const lines = text.split('\n');
  for (const line of lines) {
    if (/\b(?:exp|best\s*before|use\s*by|consume\s*before|exd)\b/i.test(line)) {
      const parsed = normalizeDate(line);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Extracts raw printed expiry date string directly from packaging text
 */
export function extractRawExpiryDateString(text) {
  if (!text) return null;
  const expKeywords = [
    /(?:exp(?:iry)?\.?\s*(?:date)?|use\s*by|best\s*before|consume\s*before|bbd?|val(?:idity)?|exd)[:\s\-]*([0-9a-zA-Z\/\.\-]{4,14})\b/i,
    /(?:expires|expiry)[:\s\-]*([0-9a-zA-Z\/\.\-]{4,14})\b/i
  ];
  for (const regex of expKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (normalizeDate(candidate)) return candidate;
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
    /(?:mfg|mfd|manufactured|packed\s*on|pkd|date\s*of\s*mfg|mfg\s*date|date\s*of\s*manufacture)[:\s\-]*([0-9a-zA-Z\/\.\-]{4,14})\b/i
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
    if (/\b(?:mfg|mfd|pkd|packed|manufactured)\b/i.test(line)) {
      const parsed = normalizeDate(line);
      if (parsed) return parsed;
    }
  }

  return null;
}

/**
 * Extracts raw printed manufacturing date string directly from packaging text
 */
export function extractRawMfgDateString(text) {
  if (!text) return null;
  const mfgKeywords = [
    /(?:mfg|mfd|manufactured|packed\s*on|pkd|date\s*of\s*mfg|mfg\s*date|date\s*of\s*manufacture)[:\s\-]*([0-9a-zA-Z\/\.\-]{4,14})\b/i
  ];
  for (const regex of mfgKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (normalizeDate(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * Calculates Best Before date from MFG date and "Best Before X months / days"
 */
export function calculateBestBeforeFromMfg(mfgDate, text) {
  if (!mfgDate || !text) return null;

  const patterns = [
    /best\s*before\s*[:\-]?\s*(\d+)\s*(months?|days?|years?|weeks?)/i,
    /use\s*within\s*[:\-]?\s*(\d+)\s*(months?|days?|years?|weeks?)/i,
    /(\d+)\s*(months?|days?|years?|weeks?)\s*(?:from\s*(?:date\s*of\s*)?(?:mfg|pkd|manufacture|packaging|packing))/i,
    /consume\s*within\s*[:\-]?\s*(\d+)\s*(months?|days?|years?|weeks?)/i
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1] && match[2]) {
      const count = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      try {
        const [y, m, d] = mfgDate.split('-').map(Number);
        const calcDate = new Date(y, m - 1, d);

        if (unit.startsWith('month')) {
          calcDate.setMonth(calcDate.getMonth() + count);
        } else if (unit.startsWith('day')) {
          calcDate.setDate(calcDate.getDate() + count);
        } else if (unit.startsWith('year')) {
          calcDate.setFullYear(calcDate.getFullYear() + count);
        } else if (unit.startsWith('week')) {
          calcDate.setDate(calcDate.getDate() + (count * 7));
        }

        const yearStr = calcDate.getFullYear();
        const monthStr = String(calcDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(calcDate.getDate()).padStart(2, '0');
        const iso = `${yearStr}-${monthStr}-${dayStr}`;

        return {
          calculatedExpiryDate: iso,
          bestBeforePeriod: `${count} ${unit}`,
          calculationNote: `Calculated from MFG (${mfgDate}) + Best Before ${count} ${unit} rule printed on packaging`
        };
      } catch (err) {
        console.warn('Date calculation error:', err);
      }
    }
  }

  return null;
}

/**
 * Extracts Batch or Lot number from text
 */
export function extractBatchNumber(text) {
  if (!text) return null;

  const batchKeywords = [
    /(?:batch(?:\s*no\.?|\s*number|\s*code)?|lot(?:\s*no\.?|\s*number|\s*code)?|b\.no\.?|b\/no\.?|batch|lot)[:\s\-#]*([A-Za-z0-9\-_]{2,20})\b/i,
    /\b(?:b\.?\s*no\.?\s*[:\-]?\s*)([A-Za-z0-9\-_]{2,20})\b/i
  ];

  for (const regex of batchKeywords) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Ensure candidate isn't just an expiry date or year
      if (!/^(202[0-9]|19[0-9]{2})$/.test(candidate) && candidate.length >= 2) {
        return candidate.toUpperCase();
      }
    }
  }

  return null;
}

/**
 * Extracts Net Quantity / Pack Size from package text
 */
export function extractNetQuantity(text) {
  if (!text) return null;
  const qtyPatterns = [
    /(?:net\s*(?:quantity|qty|wt\.?|weight|vol\.?|volume)|pack\s*size|contents?)[:\s\-]*([0-9\.]+\s*(?:g|kg|ml|l|ltr|litres?|tablets?|capsules?|sachets?|pieces?|pcs|oz|fl\s*oz))\b/i,
    /\b([0-9\.]+\s*(?:g|kg|ml|l|ltr|tablets?|capsules?|sachets?))\b/i
  ];
  for (const regex of qtyPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extracts Maximum Retail Price (MRP) from package text
 */
export function extractMrp(text) {
  if (!text) return null;
  const mrpPatterns = [
    /(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price|mrp\s*rs\.?)[:\s\-]*([₹Rs\.]*\s*[0-9]+(?:\.[0-9]{2})?)/i,
    /(?:rs\.?|₹)\s*([0-9]+(?:\.[0-9]{2})?)/i
  ];
  for (const regex of mrpPatterns) {
    const match = text.match(regex);
    if (match && (match[1] || match[0])) {
      const candidate = (match[1] || match[0]).trim();
      return candidate.startsWith('₹') || candidate.toLowerCase().startsWith('rs') ? candidate : `₹ ${candidate}`;
    }
  }
  return null;
}

/**
 * Extracts Manufacturer name & address from package text
 */
export function extractManufacturerInfo(text) {
  if (!text) return null;
  const mfgInfoPatterns = [
    /(?:manufactured\s*by|mfd\s*by|mkt\s*by|marketed\s*by|packed\s*by|mfg\s*by)[:\s\-]*([^\r\n,;]{3,50})/i
  ];
  for (const regex of mfgInfoPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Extracts Market / Country of Origin from package text
 */
export function extractMarketCountry(text) {
  if (!text) return null;
  if (/\b(?:made\s*in\s*india|product\s*of\s*india|india)\b/i.test(text)) return 'India';
  if (/\b(?:made\s*in\s*usa|product\s*of\s*usa|united\s*states)\b/i.test(text)) return 'United States';
  if (/\b(?:made\s*in\s*uk|product\s*of\s*uk|united\s*kingdom)\b/i.test(text)) return 'United Kingdom';
  if (/\b(?:made\s*in\s*germany|germany)\b/i.test(text)) return 'Germany';
  return null;
}

/**
 * Validates date sequence between Manufacturing Date and Expiry Date
 * Returns error if MFG date is after Expiry date
 */
export function validateDateSequence(mfgDate, expiryDate) {
  if (!mfgDate || !expiryDate) {
    return {
      isValid: true,
      status: 'VERIFIED',
      message: 'Date recorded'
    };
  }
  try {
    const mfg = new Date(mfgDate);
    const exp = new Date(expiryDate);
    if (!isNaN(mfg.getTime()) && !isNaN(exp.getTime())) {
      if (exp < mfg) {
        return {
          isValid: false,
          status: 'NEEDS REVIEW',
          message: 'Possible scanning error. Manufacturing date appears later than expiry date.'
        };
      }
    }
  } catch (_) {}
  return {
    isValid: true,
    status: 'VERIFIED',
    message: '✓ Date sequence valid'
  };
}

/**
 * Real Expiry Status Engine: computes status strictly from verified expiry date
 * Statuses: FRESH, EXPIRING SOON, EXPIRING TODAY, EXPIRED, DATE NOT VERIFIED
 */
export function calculateRealExpiryStatus(expiryDate) {
  if (!expiryDate) {
    return {
      status: 'DATE NOT VERIFIED',
      label: 'Date Not Verified',
      badgeClass: 'bg-slate-500 text-white',
      daysRemaining: null,
      displayText: 'Date Not Verified'
    };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  if (isNaN(exp.getTime())) {
    return {
      status: 'DATE NOT VERIFIED',
      label: 'Date Not Verified',
      badgeClass: 'bg-slate-500 text-white',
      daysRemaining: null,
      displayText: 'Date Not Verified'
    };
  }
  const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      status: 'EXPIRED',
      label: 'Expired',
      badgeClass: 'bg-rose-600 text-white',
      daysRemaining: diffDays,
      displayText: `${Math.abs(diffDays)} days expired`
    };
  } else if (diffDays === 0) {
    return {
      status: 'EXPIRING TODAY',
      label: 'Expiring Today',
      badgeClass: 'bg-rose-600 text-white',
      daysRemaining: 0,
      displayText: 'Expires Today'
    };
  } else if (diffDays <= 30) {
    return {
      status: 'EXPIRING SOON',
      label: 'Expiring Soon',
      badgeClass: 'bg-amber-500 text-white',
      daysRemaining: diffDays,
      displayText: `${diffDays} days remaining`
    };
  } else {
    return {
      status: 'FRESH',
      label: 'Fresh',
      badgeClass: 'bg-emerald-600 text-white',
      daysRemaining: diffDays,
      displayText: `${diffDays} days remaining`
    };
  }
}


/**
 * Extracts Brand Name from OCR text
 */
export function extractBrand(text) {
  if (!text) return null;

  // 1. Check popular known brands directly
  const commonBrands = [
    'Parle', 'Amul', 'Britannia', 'Nestle', 'Cadbury', 'Quaker', 'Heinz', 'Kellogg', 'Dabur',
    'Haldiram', 'ITC', 'Sunfeast', 'Lays', 'Kurkure', 'Mother Dairy', 'Tata', 'Patanjali',
    'Micro Labs', 'Sun Pharma', 'Cipla', 'GSK', 'Pfizer', 'Abbott', 'Dolo', 'Crocin'
  ];

  for (const b of commonBrands) {
    const regex = new RegExp(`\\b${b}\\b`, 'i');
    if (regex.test(text)) {
      return b;
    }
  }

  // 2. Extract brand from explicit label fields (single line only)
  const brandPatterns = [
    /(?:brand|marketed\s*by|mkt\s*by|manufactured\s*by|mfg\s*by)[:\s\-]*([^\r\n,;]{2,35})/i
  ];

  for (const regex of brandPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (candidate.length >= 2 && candidate.length <= 35) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Extracts Nutrition Information from package text
 */
export function extractNutritionInfo(text) {
  if (!text) return null;

  const nutrition = {};
  let foundAny = false;

  // Energy / Calories
  const energyMatch = text.match(/(?:energy|calories?)[:\s\-]*([0-9\.]+\s*(?:kcal|cal|kj)?)/i);
  if (energyMatch) {
    nutrition.energy = energyMatch[1].trim();
    foundAny = true;
  }

  // Protein
  const proteinMatch = text.match(/(?:protein)[:\s\-]*([0-9\.]+\s*g?)/i);
  if (proteinMatch) {
    nutrition.protein = proteinMatch[1].trim();
    foundAny = true;
  }

  // Carbohydrates
  const carbsMatch = text.match(/(?:carbohydrates?|total\s*carbs?|carbs)[:\s\-]*([0-9\.]+\s*g?)/i);
  if (carbsMatch) {
    nutrition.carbs = carbsMatch[1].trim();
    foundAny = true;
  }

  // Total Fat
  const fatMatch = text.match(/(?:total\s*fat|fat)[:\s\-]*([0-9\.]+\s*g?)/i);
  if (fatMatch) {
    nutrition.fat = fatMatch[1].trim();
    foundAny = true;
  }

  // Sugar
  const sugarMatch = text.match(/(?:sugar|sugars|total\s*sugars?)[:\s\-]*([0-9\.]+\s*g?)/i);
  if (sugarMatch) {
    nutrition.sugar = sugarMatch[1].trim();
    foundAny = true;
  }

  // Sodium
  const sodiumMatch = text.match(/(?:sodium)[:\s\-]*([0-9\.]+\s*(?:mg|g)?)/i);
  if (sodiumMatch) {
    nutrition.sodium = sodiumMatch[1].trim();
    foundAny = true;
  }

  return foundAny ? nutrition : null;
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
 * Text Cleaning: Normalizes common OCR artifacts, excessive whitespace, and casing
 */
export function cleanOcrText(rawText) {
  if (!rawText) return '';
  return rawText
    .replace(/\r\n/g, '\n')
    // Fix common OCR zero vs letter O confusion in dates
    .replace(/\b([0-3]?[0-9])[\/\-\.]([oO][0-9]|[0-9][oO])[\/\-\.](20[0-9]{2})\b/g, (m, d, mo, y) => {
      const fixedMo = mo.replace(/o/gi, '0');
      return `${d}-${fixedMo}-${y}`;
    })
    // Remove repeated non-alphanumeric noise
    .replace(/[^\S\r\n]{2,}/g, ' ')
    .trim();
}

/**
 * Extracts storage information from package text
 */
export function extractStorageInfo(text) {
  if (!text) return null;
  const storagePatterns = [
    /(?:keep\s*refrigerated[^\n\.;]*)/i,
    /(?:keep\s*in\s*a\s*cool(?:,|\s*and)\s*dry\s*place[^\n\.;]*)/i,
    /(?:refrigerate\s*after\s*opening[^\n\.;]*)/i,
    /(?:storage(?:\s*instructions)?|store(?:\s*under|\s*at|\s*in)?|keep\s*(?:in|cool|dry))[:\s\-]+([^\n\.;]+)/i
  ];

  for (const regex of storagePatterns) {
    const match = text.match(regex);
    if (match) {
      return (match[0] || match[1]).trim();
    }
  }
  return null;
}

/**
 * Extracts product safety warnings & allergen statements from text
 */
export function extractWarnings(text) {
  if (!text) return [];
  const warnings = [];

  const warningPatterns = [
    /(?:warning|caution|precautions?)[:\s\-]+([^\n\.;]+)/i,
    /(?:keep\s*out\s*of\s*reach\s*of\s*children)/i,
    /(?:not\s*for\s*medicinal\s*use)/i,
    /(?:contains|allergen\s*warning)[:\s\-]+([^\n\.;]+)/i
  ];

  for (const regex of warningPatterns) {
    const match = text.match(regex);
    if (match) {
      const val = (match[1] || match[0]).trim();
      if (!warnings.includes(val)) warnings.push(val);
    }
  }
  return warnings;
}

/**
 * Computes individual field confidences (0-100%) and overall score
 */
export function calculateFieldConfidences({
  expiryDate,
  isCalculatedDate,
  hasMultipleDates,
  mfgDate,
  batchNumber,
  ingredientsOriginal,
  brand,
  combinedText
}) {
  const confidences = {
    expiry: 0,
    mfg: 0,
    batch: 0,
    ingredients: 0,
    brand: 0
  };

  const alerts = {};

  // 1. Expiry Date Confidence
  if (expiryDate) {
    if (isCalculatedDate) {
      confidences.expiry = 78;
    } else if (hasMultipleDates) {
      confidences.expiry = 55;
      alerts.expiry = 'Multiple dates found — Please verify printed expiry';
    } else if (/(?:exp|use\s*by|best\s*before)[:\s\-]*[0-9a-zA-Z]/i.test(combinedText)) {
      confidences.expiry = 97;
    } else {
      confidences.expiry = 88;
    }
  } else {
    confidences.expiry = 0;
    alerts.expiry = 'Detected by OCR — Please verify (No date found)';
  }

  // 2. Manufacturing Date Confidence
  if (mfgDate) {
    if (/(?:mfg|mfd|pkd|packed|manufactured)[:\s\-]*[0-9a-zA-Z]/i.test(combinedText)) {
      confidences.mfg = 94;
    } else {
      confidences.mfg = 82;
    }
  } else {
    confidences.mfg = 0;
  }

  // 3. Batch Number Confidence
  if (batchNumber) {
    if (/(?:batch|lot|b\.no)[:\s\-#]*[A-Za-z0-9]/i.test(combinedText)) {
      confidences.batch = 91;
    } else {
      confidences.batch = 80;
    }
  } else {
    confidences.batch = 0;
  }

  // 4. Ingredients Confidence
  if (ingredientsOriginal && ingredientsOriginal.length > 0) {
    if (/(?:ingredients|composition|contains)[:\s]+/i.test(combinedText)) {
      confidences.ingredients = 95;
    } else {
      confidences.ingredients = 75;
    }
  } else {
    confidences.ingredients = 0;
  }

  // 5. Brand Confidence
  if (brand) {
    confidences.brand = 92;
  } else {
    confidences.brand = 0;
  }

  // Overall Confidence Score (Weighted)
  let overall = 0;
  let weights = 0;
  if (expiryDate) { overall += confidences.expiry * 0.40; weights += 0.40; }
  if (mfgDate) { overall += confidences.mfg * 0.15; weights += 0.15; }
  if (batchNumber) { overall += confidences.batch * 0.15; weights += 0.15; }
  if (ingredientsOriginal?.length > 0) { overall += confidences.ingredients * 0.20; weights += 0.20; }
  if (brand) { overall += confidences.brand * 0.10; weights += 0.10; }

  const confidenceScore = weights > 0 ? Math.round(overall / weights) : 0;

  return {
    confidenceScore,
    fieldConfidences: confidences,
    fieldConfidenceAlerts: alerts
  };
}

/**
 * Full parsing pipeline given front and back text
 */
export function parsePackageData(frontText = '', backText = '') {
  const rawCombined = `${frontText}\n${backText}`;
  const combinedText = cleanOcrText(rawCombined);

  // 1. Direct printed Expiry Date extraction
  let expiryDate = extractExpiryDate(combinedText);
  let rawExpiryDate = extractRawExpiryDateString(combinedText);
  let isCalculatedDate = false;
  let calculationNote = null;
  let bestBeforePeriod = null;

  // 2. Manufacturing Date extraction
  const mfgDate = extractMfgDate(combinedText);
  const rawMfgDate = extractRawMfgDateString(combinedText);

  // 3. Date Calculation: If actual EXP not printed, but MFG + Best Before X months is printed
  if (!expiryDate && mfgDate) {
    const calcResult = calculateBestBeforeFromMfg(mfgDate, combinedText);
    if (calcResult) {
      expiryDate = calcResult.calculatedExpiryDate;
      isCalculatedDate = true;
      calculationNote = calcResult.calculationNote;
      bestBeforePeriod = calcResult.bestBeforePeriod;
      rawExpiryDate = `${bestBeforePeriod} from ${rawMfgDate || mfgDate}`;
    }
  }

  // 4. Batch / Lot Number extraction
  const batchNumber = extractBatchNumber(combinedText);

  // 5. Brand extraction
  const brand = extractBrand(combinedText);

  // 6. Net Quantity & MRP extraction
  const netQuantity = extractNetQuantity(combinedText);
  const mrp = extractMrp(combinedText);

  // 7. Manufacturer & Country / Market extraction
  const manufacturerInfo = extractManufacturerInfo(combinedText);
  const countryOrMarket = extractMarketCountry(combinedText);

  // 8. Nutrition Information extraction
  const nutritionInfo = extractNutritionInfo(combinedText);

  // 9. Ingredients extraction
  const ingredientsOriginal = extractIngredients(combinedText);

  // 10. Storage information & Warnings
  const storageInfo = extractStorageInfo(combinedText);
  const warnings = extractWarnings(combinedText);

  // 11. Type and Name inference
  const type = inferProductType(combinedText);
  const name = extractProductName(frontText || backText, type === 'medicine' ? 'Scanned Medicine' : 'Scanned Grocery');

  // 12. Multiple dates detection & confidence assessment
  const allDates = extractAllDates(combinedText);
  const hasMultipleDates = allDates.length > 2 && !expiryDate;

  // 13. Date sequence validation (EXP >= MFG)
  const dateValidation = validateDateSequence(mfgDate, expiryDate);

  // 14. Real Expiry Status calculation
  const realExpiryStatus = calculateRealExpiryStatus(expiryDate);

  // Field level confidences
  const { confidenceScore, fieldConfidences, fieldConfidenceAlerts } = calculateFieldConfidences({
    expiryDate,
    isCalculatedDate,
    hasMultipleDates,
    mfgDate,
    batchNumber,
    ingredientsOriginal,
    brand,
    combinedText
  });

  let confidence = 'high';
  let requiresVerification = false;
  let verificationReason = '';

  if (!expiryDate) {
    confidence = 'none';
    requiresVerification = true;
    verificationReason = 'Expiry date not detected on label.';
  } else if (!dateValidation.isValid) {
    confidence = 'low';
    requiresVerification = true;
    verificationReason = dateValidation.message;
  } else if (hasMultipleDates) {
    confidence = 'low';
    requiresVerification = true;
    verificationReason = 'Multiple candidate dates detected on package — please verify.';
  } else if (isCalculatedDate) {
    confidence = 'medium';
  } else if (confidenceScore < 70) {
    confidence = 'low';
    requiresVerification = true;
    verificationReason = 'Expiry date could not be read reliably. Please rescan the expiry area.';
  }

  // Explicit anti-fabrication labels
  const expiryDateLabel = expiryDate 
    ? (isCalculatedDate ? 'Expiry Date — Calculated from Package Rule' : 'Expiry Date — Read from Package')
    : 'Not available';
  const mfgDateLabel = mfgDate ? 'Manufacturing Date — Read from Package' : 'Not available';
  const batchNumberLabel = batchNumber ? 'Batch/Lot — Read from Package' : 'Not available';

  // Field verification statuses
  const fieldVerificationStatuses = {
    productName: name && name !== 'Scanned Product' && name !== 'Scanned Grocery' && name !== 'Scanned Medicine' ? 'HIGH CONFIDENCE' : 'NEEDS REVIEW',
    brand: brand ? 'VERIFIED' : 'NOT FOUND',
    expiryDate: expiryDate ? (confidenceScore >= 70 && dateValidation.isValid ? 'VERIFIED' : 'NEEDS REVIEW') : 'NOT FOUND',
    mfgDate: mfgDate ? 'VERIFIED' : 'NOT FOUND',
    batchNumber: batchNumber ? 'VERIFIED' : 'NOT FOUND',
    netQuantity: netQuantity ? 'VERIFIED' : 'NOT FOUND',
    mrp: mrp ? 'VERIFIED' : 'NOT FOUND',
    ingredients: ingredientsOriginal.length > 0 ? 'VERIFIED' : 'NOT FOUND',
    nutritionInfo: nutritionInfo ? 'VERIFIED' : 'SOURCE UNAVAILABLE',
    storageInfo: storageInfo ? 'VERIFIED' : 'SOURCE UNAVAILABLE',
    manufacturerInfo: manufacturerInfo ? 'VERIFIED' : 'SOURCE UNAVAILABLE',
    countryOrMarket: countryOrMarket ? 'VERIFIED' : 'SOURCE UNAVAILABLE'
  };

  return {
    name,
    brand,
    type,
    expiryDate,
    rawExpiryDate,
    expiryDateLabel,
    mfgDate,
    rawMfgDate,
    mfgDateLabel,
    isCalculatedDate,
    calculationNote,
    bestBeforePeriod,
    batchNumber,
    batchNumberLabel,
    netQuantity,
    mrp,
    manufacturerInfo,
    countryOrMarket,
    dateValidation,
    realExpiryStatus,
    nutritionInfo,
    ingredientsOriginal,
    storageInfo,
    warnings,
    rawOcrText: combinedText.trim(),
    hasExpiryFound: !!expiryDate,
    confidence,
    confidenceScore,
    fieldConfidences,
    fieldConfidenceAlerts,
    fieldVerificationStatuses,
    requiresVerification,
    verificationReason,
    source: 'ocr',
    provenance: {
      name: 'ocr',
      brand: brand ? 'ocr' : 'none',
      expiryDate: isCalculatedDate ? 'calculated' : (expiryDate ? 'ocr' : 'none'),
      mfgDate: mfgDate ? 'ocr' : 'none',
      batchNumber: batchNumber ? 'ocr' : 'none',
      netQuantity: netQuantity ? 'ocr' : 'none',
      mrp: mrp ? 'ocr' : 'none',
      ingredients: ingredientsOriginal?.length > 0 ? 'ocr' : 'none',
      storageInfo: storageInfo ? 'ocr' : 'none',
      manufacturerInfo: manufacturerInfo ? 'ocr' : 'none'
    }
  };
}

