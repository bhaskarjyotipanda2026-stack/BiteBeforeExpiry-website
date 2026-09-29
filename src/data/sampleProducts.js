// Sample products with realistic labels, packaging visuals, and OCR text for quick 1-click testing

// Helper to make clean SVG placeholder mock packaging
function makeProductSvg(title, subtitle, badgeColor, type) {
  const icon = type === 'medicine' ? '💊' : '🥛';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#e2e8f0" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)" rx="24"/>
    <rect x="20" y="20" width="360" height="360" fill="none" stroke="${badgeColor}" stroke-width="3" stroke-dasharray="8 6" rx="16"/>
    <circle cx="200" cy="140" r="64" fill="${badgeColor}15" />
    <text x="200" y="160" font-size="56" text-anchor="middle">${icon}</text>
    <text x="200" y="240" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#1e293b" text-anchor="middle">${title}</text>
    <text x="200" y="270" font-family="system-ui, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">${subtitle}</text>
    <rect x="110" y="300" width="180" height="32" rx="16" fill="${badgeColor}" />
    <text x="200" y="322" font-family="system-ui, sans-serif" font-size="13" font-weight="600" fill="#ffffff" text-anchor="middle">OFFICIAL PACKAGE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Calculate dynamic ISO dates relative to today
const now = new Date();
const addDays = (d) => {
  const target = new Date(now);
  target.setDate(target.getDate() + d);
  return target.toISOString().split('T')[0];
};

export const SAMPLE_PRODUCTS = [
  {
    id: 'sample-milk-01',
    name: 'Amul Taaza Homogenised Toned Milk',
    type: 'grocery',
    category: 'Dairy & Milk Products',
    frontImage: makeProductSvg('Amul Taaza Milk', '1 Litre • Tetra Pak', '#10b981', 'grocery'),
    backImage: makeProductSvg('Amul Taaza Label', 'MFG: 2026-09-20 • EXP: In 3 Days', '#10b981', 'grocery'),
    rawOcrText: `AMUL TAAZA HOMOGENISED TONED MILK\nMFG: ${addDays(-15)}\nBEST BEFORE: ${addDays(3)}\nBATCH NO: L40922\nINGREDIENTS: Pasteurized Toned Milk, Milk Solids, Vitamin A, Vitamin D.\nNet Quantity: 1000ml\nStore in cool dry place.`,
    expiryDate: addDays(3),
    expirySource: 'scanned',
    mfgDate: addDays(-15),
    ingredientsOriginal: ['Pasteurized Toned Milk', 'Milk Solids', 'Vitamin A', 'Vitamin D'],
    ingredientsTranslated: {
      hi: ['पाश्चुरीकृत टोंड दूध', 'दूध के ठोस पदार्थ', 'विटामिन ए', 'विटामिन डी'],
      te: ['పాశ్చరైజ్డ్ టోన్డ్ మిల్క్', 'పాల ఘనపదార్థాలు', 'విటమిన్ ఎ', 'విటమిన్ డి']
    },
    ingredientExplanations: {},
    status: 'active',
    dateAdded: addDays(-1),
    estimatedValue: 75,
    notes: 'Keep refrigerated once seal is opened'
  },
  {
    id: 'sample-paracetamol-02',
    name: 'Dolo 650 Fast Pain Relief Tablets',
    type: 'medicine',
    category: 'Tablets & Capsules',
    frontImage: makeProductSvg('Dolo 650 Tablets', 'Strip of 15 Tablets', '#059669', 'medicine'),
    backImage: makeProductSvg('Dolo 650 Label Side', 'EXP: Next Year • Batch #DL789', '#059669', 'medicine'),
    rawOcrText: `MICRO LABS LIMITED\nDOLO 650 TABLETS\nCOMPOSITION: Each uncoated tablet contains Paracetamol IP 650mg, Microcrystalline Cellulose, Magnesium Stearate.\nMFG. DATE: ${addDays(-120)}\nEXPIRY DATE: ${addDays(240)}\nB.NO: DL8922A\nDosage: As directed by the physician. Caution: Taking more than daily dose may cause serious liver damage.`,
    expiryDate: addDays(240),
    expirySource: 'scanned',
    mfgDate: addDays(-120),
    ingredientsOriginal: ['Paracetamol IP 650mg', 'Microcrystalline Cellulose', 'Magnesium Stearate'],
    ingredientsTranslated: {
      hi: ['पैरासिटामोल 650 मि.ग्रा.', 'माइक्रोक्रिस्टलाइन सेल्यूलोज', 'मैग्नीशियम स्टीयरेट'],
      te: ['పారాసిటమాల్ 650మి.గ్రా.', 'మైక్రోక్రిస్టలైన్ సెల్యులోజ్', 'మెగ్నీషియం స్టీయరేట్']
    },
    ingredientExplanations: {},
    status: 'active',
    dateAdded: addDays(-3),
    estimatedValue: 34,
    notes: 'Store below 30°C. Protect from direct sunlight.'
  },
  {
    id: 'sample-bread-03',
    name: 'Harvest Gold 100% Whole Wheat Bread',
    type: 'grocery',
    category: 'Bakery & Bread',
    frontImage: makeProductSvg('Harvest Gold Bread', '400g • Brown Sliced Bread', '#f59e0b', 'grocery'),
    backImage: makeProductSvg('Harvest Gold Back', 'EXP: Tomorrow • Consume Promptly', '#f59e0b', 'grocery'),
    rawOcrText: `HARVEST GOLD 100% WHOLE WHEAT\nPACKED ON: ${addDays(-4)}\nUSE BY: ${addDays(1)}\nLOT: HG-8841\nINGREDIENTS: Wheat Flour (Atta), Sugar, Iodized Salt, Yeast, Edible Vegetable Oil, Citric Acid, Preservative (282).\nNet Wt: 400g.`,
    expiryDate: addDays(1),
    expirySource: 'scanned',
    mfgDate: addDays(-4),
    ingredientsOriginal: ['Wheat Flour', 'Sugar', 'Iodized Salt', 'Citric Acid', 'Edible Vegetable Oil'],
    ingredientsTranslated: {},
    ingredientExplanations: {},
    status: 'active',
    dateAdded: addDays(-2),
    estimatedValue: 50,
    notes: 'Use soon for breakfast toast or freeze.'
  },
  {
    id: 'sample-amoxicillin-04',
    name: 'Amoxil 250mg Oral Suspension',
    type: 'medicine',
    category: 'Syrups & Suspensions',
    frontImage: makeProductSvg('Amoxil Oral Suspension', 'Reconstituted 60ml Bottle', '#ef4444', 'medicine'),
    backImage: makeProductSvg('Amoxil Back Label', 'EXP: Expired 2 Days Ago', '#ef4444', 'medicine'),
    rawOcrText: `AMOXYCILLIN FOR ORAL SUSPENSION USP\nCOMPOSITION: Each 5ml contains Amoxicillin Trihydrate equivalent to 250mg Amoxicillin.\nMFG: ${addDays(-30)}\nEXP: ${addDays(-2)}\nDiscard reconstituted suspension after 14 days.\nWARNING: Penicillin derivative. Do not use if allergic.`,
    expiryDate: addDays(-2),
    expirySource: 'scanned',
    mfgDate: addDays(-30),
    ingredientsOriginal: ['Amoxicillin Trihydrate', 'Sodium Benzoate', 'Xanthan Gum'],
    ingredientsTranslated: {},
    ingredientExplanations: {},
    status: 'expired',
    dateAdded: addDays(-7),
    estimatedValue: 160,
    notes: 'EXPIRED! Safely discard at designated pharmacy disposal.'
  },
  {
    id: 'sample-paneer-05',
    name: 'Fresh Dairy Farm Paneer (Cottage Cheese)',
    type: 'grocery',
    category: 'Dairy & Milk Products',
    frontImage: makeProductSvg('Farm Fresh Paneer', 'Fresh Local Dairy • Unpackaged', '#3b82f6', 'grocery'),
    backImage: null,
    rawOcrText: null,
    expiryDate: addDays(4),
    expirySource: 'ai_estimated',
    mfgDate: addDays(0),
    ingredientsOriginal: ['Fresh Cow Milk', 'Citric Acid', 'Water'],
    ingredientsTranslated: {},
    ingredientExplanations: {},
    status: 'active',
    dateAdded: addDays(0),
    estimatedValue: 120,
    notes: 'AI Shelf Life Estimate: Fresh paneer typically lasts 4-5 days refrigerated.'
  }
];
