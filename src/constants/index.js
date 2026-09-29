export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'es', name: 'Spanish', native: 'Español' },
];

export const GROCERY_CATEGORIES = [
  'Dairy & Milk Products',
  'Bakery & Bread',
  'Vegetables & Fruits',
  'Grains, Rice & Flours',
  'Meat, Eggs & Seafood',
  'Snacks & Beverages',
  'Condiments & Spices',
  'Canned & Packaged Foods',
  'Other Grocery'
];

export const MEDICINE_CATEGORIES = [
  'Tablets & Capsules',
  'Syrups & Suspensions',
  'Antibiotics & Prescriptions',
  'Eye & Ear Drops',
  'Ointments & Creams',
  'Inhalers & Respiratory',
  'Vitamins & Supplements',
  'Other Medicine'
];

export const ALL_CATEGORIES = [...GROCERY_CATEGORIES, ...MEDICINE_CATEGORIES];

export const BADGES_DEFINITION = [
  {
    id: 'first_scan',
    name: 'First Scan',
    description: 'Tracked your very first package or medicine',
    icon: '🌟',
    check: (stats) => stats.itemsTracked >= 1,
    target: 1,
    current: (stats) => Math.min(stats.itemsTracked, 1)
  },
  {
    id: 'ten_items',
    name: '10 Items Tracked',
    description: 'Safely cataloged 10 pantry or medical items',
    icon: '📦',
    check: (stats) => stats.itemsTracked >= 10,
    target: 10,
    current: (stats) => Math.min(stats.itemsTracked, 10)
  },
  {
    id: 'three_day_streak',
    name: '3-Day Streak',
    description: 'Logged items 3 consecutive days in a row',
    icon: '🔥',
    check: (stats) => stats.longestStreak >= 3 || stats.currentStreak >= 3,
    target: 3,
    current: (stats) => Math.min(Math.max(stats.currentStreak, stats.longestStreak), 3)
  },
  {
    id: 'seven_day_streak',
    name: '7-Day Streak',
    description: 'Zero waste vigilance for a full week',
    icon: '⚡',
    check: (stats) => stats.longestStreak >= 7 || stats.currentStreak >= 7,
    target: 7,
    current: (stats) => Math.min(Math.max(stats.currentStreak, stats.longestStreak), 7)
  },
  {
    id: 'zero_waste_hero',
    name: 'Zero Waste Week',
    description: 'Used 5 items before their expiry deadline',
    icon: '🏆',
    check: (stats) => stats.itemsUsedBeforeExpiry >= 5,
    target: 5,
    current: (stats) => Math.min(stats.itemsUsedBeforeExpiry, 5)
  },
  {
    id: 'medicine_sentinel',
    name: 'Medicine Sentinel',
    description: 'Logged 3 or more prescription or OTC medicines',
    icon: '💊',
    check: (stats, items) => items.filter(i => i.type === 'medicine').length >= 3,
    target: 3,
    current: (stats, items) => Math.min(items.filter(i => i.type === 'medicine').length, 3)
  },
  {
    id: 'ai_explorer',
    name: 'AI Explorer',
    description: 'Used AI shelf-life estimator for an undated product',
    icon: '🤖',
    check: (stats, items) => items.some(i => i.expirySource === 'ai_estimated'),
    target: 1,
    current: (stats, items) => items.some(i => i.expirySource === 'ai_estimated') ? 1 : 0
  },
  {
    id: 'money_saver',
    name: 'Impact Saver',
    description: 'Saved ₹500 / $50 worth of items from being wasted',
    icon: '💰',
    check: (stats) => stats.estimatedMoneySaved >= 500,
    target: 500,
    current: (stats) => Math.min(stats.estimatedMoneySaved, 500)
  }
];

export const DEFAULT_SETTINGS = {
  notificationLeadDays: 3,
  notificationBarEnabled: true,
  categoryOverrides: {
    'medicine': 7,
    'grocery': 3
  },
  preferredLanguage: 'en',
  currencySymbol: '₹',
  defaultItemValue: 120, // average item price
  alarmSoundDefault: 'siren',
  autoAlarmEnabled: true,
  defaultWarningSign: 'flashing-siren',
  apiKeys: {
    openaiApiKey: '{{API_KEY_HERE}}',
    claudeApiKey: '{{API_KEY_HERE}}',
    googleVisionApiKey: '{{API_KEY_HERE}}',
    libreTranslateUrl: 'https://libretranslate.de'
  },
  useSimulatedAiFallback: true
};
