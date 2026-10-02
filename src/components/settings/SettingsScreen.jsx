import React, { useState, useEffect } from 'react';
import { 
  Settings, Bell, Clock, ShieldCheck, Key, RefreshCw, 
  Trash2, Languages, DollarSign, Sparkles, Check, Info, AlertTriangle,
  User, Database, ShieldAlert, LogOut
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { SUPPORTED_LANGUAGES, DEFAULT_SETTINGS, COMMON_ALLERGENS } from '../../constants';
import { ALARM_SOUND_TYPES, WARNING_SIGN_OPTIONS, previewAlarmSound } from '../../services/alarmSoundService';

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Halal',
  'Kosher',
  'Low Sodium',
  'Diabetic Friendly'
];

export function SettingsScreen() {
  const { settings, setSettings, showToast, resetToSampleData } = useApp();
  const { user, profile, updateProfile, logout, isSupabaseConnected } = useAuth();

  // Profile Form state
  const [userName, setUserName] = useState(user?.name || 'Smart Pantry User');
  const [dietaryPrefs, setDietaryPrefs] = useState(profile?.dietary_preferences || ['Vegetarian']);

  // Local form state
  const [leadDays, setLeadDays] = useState(settings.notificationLeadDays || 3);
  const [barEnabled, setBarEnabled] = useState(settings.notificationBarEnabled !== false);
  const [alarmSound, setAlarmSound] = useState(settings.alarmSoundDefault || 'siren');
  const [warningSign, setWarningSign] = useState(settings.defaultWarningSign || 'flashing-siren');
  const [autoAlarm, setAutoAlarm] = useState(settings.autoAlarmEnabled !== false);
  const [medicineOverride, setMedicineOverride] = useState(settings.categoryOverrides?.medicine || 7);
  const [groceryOverride, setGroceryOverride] = useState(settings.categoryOverrides?.grocery || 3);
  const [prefLang, setPrefLang] = useState(settings.preferredLanguage || 'en');
  const [currency, setCurrency] = useState(settings.currencySymbol || '₹');
  const [defaultValue, setDefaultValue] = useState(settings.defaultItemValue || 120);
  const [allergyProfile, setAllergyProfile] = useState(settings.allergyProfile || []);


  // API Keys state with {{API_KEY_HERE}} defaults
  const [openaiKey, setOpenaiKey] = useState(settings.apiKeys?.openaiApiKey || '{{API_KEY_HERE}}');
  const [claudeKey, setClaudeKey] = useState(settings.apiKeys?.claudeApiKey || '{{API_KEY_HERE}}');
  const [visionKey, setVisionKey] = useState(settings.apiKeys?.googleVisionApiKey || '{{API_KEY_HERE}}');
  const [translateUrl, setTranslateUrl] = useState(settings.apiKeys?.libreTranslateUrl || 'https://libretranslate.de');
  const [useFallback, setUseFallback] = useState(settings.useSimulatedAiFallback !== false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleAllergen = (allergen) => {
    const next = allergyProfile.includes(allergen) 
      ? allergyProfile.filter(a => a !== allergen) 
      : [...allergyProfile, allergen];
    setAllergyProfile(next);
    setSettings(prev => ({
      ...prev,
      allergyProfile: next
    }));
    showToast(`Updated allergy profile: ${next.length} active`, 'info');
  };

  // Save settings immediately
  const handleSave = async (e) => {
    e.preventDefault();


    const updated = {
      ...settings,
      notificationLeadDays: Number(leadDays),
      notificationBarEnabled: barEnabled,
      categoryOverrides: {
        medicine: Number(medicineOverride),
        grocery: Number(groceryOverride)
      },
      alarmSoundDefault: alarmSound,
      defaultWarningSign: warningSign,
      autoAlarmEnabled: autoAlarm,
      preferredLanguage: prefLang,
      currencySymbol: currency,
      defaultItemValue: Number(defaultValue),
      allergyProfile: allergyProfile,
      apiKeys: {
        openaiApiKey: openaiKey,
        claudeApiKey: claudeKey,
        googleVisionApiKey: visionKey,
        libreTranslateUrl: translateUrl
      },
      useSimulatedAiFallback: useFallback
    };

    setSettings(updated);

    // Save to Database User Profile table
    try {
      await updateProfile({
        allergies: allergyProfile,
        dietary_preferences: dietaryPrefs,
        preferred_language: prefLang,
        notification_preferences: {
          lead_days: Number(leadDays),
          banner_enabled: barEnabled,
          category_overrides: {
            medicine: Number(medicineOverride),
            grocery: Number(groceryOverride)
          }
        }
      });
    } catch (err) {
      console.warn('DB profile update err:', err);
    }

    setSavedSuccess(true);
    showToast('Settings & User Profile saved to Database!', 'success');
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const toggleDiet = (diet) => {
    setDietaryPrefs(prev => prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
      
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
          <Settings className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          <span>Profile & App Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure personal dietary preferences, allergy triggers, expiry lead times, and database synchronization.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Section 0: Real Database & User Profile */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  User Account & Database Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Data foundation synced with PostgreSQL and protected by Row-Level Security
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSupabaseConnected ? 'Supabase Live' : 'Offline-First DB'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Profile Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Account Email
              </label>
              <input
                type="email"
                disabled
                value={user?.email || 'demo@bitebeforeexpiry.com'}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              Dietary Preferences
            </label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map((diet) => {
                const isSelected = dietaryPrefs.includes(diet);
                return (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => toggleDiet(diet)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {diet} {isSelected && '✓'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Section 1: Notification Settings (Lead Times & Banner Toggle) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Notification & Expiry Reminders
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Controls the urgency threshold and top notification banner
              </p>
            </div>
          </div>


          {/* 1. Global Lead Time Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              Default Notification Lead Time
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[1, 2, 3, 5, 7].map(days => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setLeadDays(days)}
                  className={`py-3 px-3 rounded-2xl text-center border-2 transition-all font-bold text-sm ${
                    leadDays === days
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                  }`}
                >
                  <div className="text-base sm:text-lg font-black">{days} {days === 1 ? 'Day' : 'Days'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {days === 3 ? 'Default Recommended' : 'Before expiry'}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Items with fewer days than this will be marked in <strong>Yellow (Urgent)</strong> on the dashboard and trigger top banner alerts.
            </p>
          </div>

          {/* 2. Notification Bar Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                Top Persistent Notification Banner
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Displays a prominent warning banner at the top of the app when items reach their expiry lead time.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={barEnabled}
                onChange={(e) => setBarEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* 3. Category Lead Time Overrides (Stretch Goal Feature) */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 flex items-center space-x-1.5">
              <span>Per-Category Lead Time Overrides</span>
              <span className="text-[10px] font-normal text-slate-400">(Advanced)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Medicine Override */}
              <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-teal-950 dark:text-teal-200 flex items-center space-x-1.5">
                    <span>💊 Medicines Lead Time</span>
                  </span>
                  <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-md">
                    {medicineOverride} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="14"
                  value={medicineOverride}
                  onChange={(e) => setMedicineOverride(e.target.value)}
                  className="w-full accent-teal-600 cursor-pointer"
                />
                <span className="text-[11px] text-teal-800 dark:text-teal-300 mt-1 block">
                  More advance notice is helpful for prescription refills & clinical safety.
                </span>
              </div>

              {/* Grocery Override */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200 flex items-center space-x-1.5">
                    <span>🥗 Groceries Lead Time</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                    {groceryOverride} Days
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={groceryOverride}
                  onChange={(e) => setGroceryOverride(e.target.value)}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-1 block">
                  Standard perishables like milk, paneer, and bread typically need 2–4 days.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Section 1.5: Audible Expiry Alarms & Warning Signs */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 flex items-center justify-center font-bold text-xl">
              🚨
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Audible Expiry Alarms & Visual Warning Signs
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose synthesizer alarm tones & warning sign beacons for products nearing expiration
              </p>
            </div>
          </div>

          {/* Auto Alarm Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="pr-4">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white block">
                Auto-Alert with Audible Expiry Alarm
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automatically ring the alarm chime when opening the app if any tracked groceries or medicines are expiring today or expired.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={autoAlarm}
                onChange={(e) => setAutoAlarm(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Alarm Ringtone Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Default Alarm Sound Tone:
              </label>
              <span className="text-[11px] text-slate-400">Click 🔊 Test to listen</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALARM_SOUND_TYPES.map(snd => (
                <div
                  key={snd.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    alarmSound === snd.id
                      ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/20 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setAlarmSound(snd.id)}
                    className="flex items-center space-x-2.5 text-left flex-1"
                  >
                    <span className="text-xl">{snd.icon}</span>
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                        {snd.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        {snd.description}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => previewAlarmSound(snd.id)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 dark:hover:bg-rose-950 text-slate-700 dark:text-slate-200 hover:text-rose-700 text-xs font-bold transition-colors ml-2 shrink-0"
                    title="Preview alarm sound"
                  >
                    🔊 Test
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Default Warning Sign Style */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              Default Warning Sign Option (Flashing Beacons on Items):
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {WARNING_SIGN_OPTIONS.map(sign => (
                <button
                  type="button"
                  key={sign.id}
                  onClick={() => setWarningSign(sign.id)}
                  className={`p-3 rounded-2xl border text-left transition-all flex items-center space-x-2.5 ${
                    warningSign === sign.id
                      ? 'bg-rose-500 text-white border-rose-500 shadow-md ring-2 ring-rose-400/30 scale-102'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                  }`}
                >
                  <span className="text-xl">{sign.icon}</span>
                  <div className="truncate">
                    <span className="font-extrabold text-xs block truncate">{sign.name}</span>
                    <span className={`text-[10px] block truncate ${warningSign === sign.id ? 'text-rose-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {sign.badge}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Section 2: Regional Preferences (Language & Currency) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Language & Regional Display
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preferred translation language and currency format
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Default Ingredient Language
              </label>
              <select
                value={prefLang}
                onChange={(e) => setPrefLang(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                {SUPPORTED_LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.native})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Currency Symbol
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="₹">₹ (INR - Indian Rupee)</option>
                <option value="$">$ (USD - US Dollar)</option>
                <option value="€">€ (EUR - Euro)</option>
                <option value="£">£ (GBP - British Pound)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Default Item Estimated Price
              </label>
              <input
                type="number"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 2.5: Saved Allergy & Dietary Profile */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none space-y-4">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xl">
              🛡️
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Personal Allergy & Intolerance Profile
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  OCR Scanner Integration
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select ingredients you or your family are allergic to. OCR and barcode scanning will automatically highlight matching allergen risks.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2.5">
              Select Your Allergens:
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGENS.map((allergen) => {
                const isSelected = allergyProfile.includes(allergen);
                return (
                  <button
                    type="button"
                    key={allergen}
                    onClick={() => toggleAllergen(allergen)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all border flex items-center space-x-2 ${
                      isSelected
                        ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20 scale-102'
                        : 'bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span>{isSelected ? '⚠️' : '⚪'}</span>
                    <span>{allergen}</span>
                  </button>
                );
              })}
            </div>
            {allergyProfile.length > 0 ? (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-3">
                Active alerts enabled for: <strong>{allergyProfile.join(', ')}</strong>
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                No personal allergies configured. Extracted ingredients will be displayed with standard nutritional analysis.
              </p>
            )}
          </div>
        </div>

        {/* Section 3: API Keys Configuration (Placeholder support {{API_KEY_HERE}}) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-md shadow-slate-100 dark:shadow-none space-y-5">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Custom AI & Cloud API Keys
                </h2>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Optional
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Plug in your own OpenAI, Anthropic Claude, or Google Cloud Vision keys if preferred
              </p>
            </div>
          </div>

          {/* Offline / Simulated Heuristic Fallback Toggle */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
            <div className="pr-4">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-emerald-950 dark:text-emerald-200">
                  Zero-Config Offline Intelligence Engine
                </span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-300 mt-0.5">
                When enabled, OCR uses client-side Tesseract.js, translation uses curated bilingual glossaries, and shelf-life uses food safety heuristics even without external API keys!
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={useFallback}
                onChange={(e) => setUseFallback(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                OpenAI API Key (for GPT-4o-mini Ingredient Explanations)
              </label>
              <input
                type="text"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="{{API_KEY_HERE}}"
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Anthropic Claude API Key (Alternative LLM)
              </label>
              <input
                type="text"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder="{{API_KEY_HERE}}"
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                Google Cloud Vision API Key (Alternative OCR)
              </label>
              <input
                type="text"
                value={visionKey}
                onChange={(e) => setVisionKey(e.target.value)}
                placeholder="{{API_KEY_HERE}}"
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1">
                LibreTranslate Server URL
              </label>
              <input
                type="text"
                value={translateUrl}
                onChange={(e) => setTranslateUrl(e.target.value)}
                placeholder="https://libretranslate.de"
                className="w-full px-3 py-2 font-mono text-xs bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Action Controls & Data Reset */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          
          <button
            type="button"
            onClick={resetToSampleData}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Demo Products & Data</span>
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-600/25 hover:scale-105 active:scale-95 transition-all"
          >
            <Check className="w-5 h-5" />
            <span>{savedSuccess ? 'Saved!' : 'Save & Apply Settings'}</span>
          </button>

        </div>

      </form>

    </div>
  );
}
