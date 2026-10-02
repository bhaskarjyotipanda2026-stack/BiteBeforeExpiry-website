import React, { createContext, useContext, useState, useEffect } from 'react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import { DEFAULT_SETTINGS, BADGES_DEFINITION } from '../constants';
import { calculateUpdatedStreak, checkAndUnlockBadges, triggerCelebration } from '../services/streakService';
import { playAlarmSound, stopAlarmSound, triggerDesktopExpiryNotification } from '../services/alarmSoundService';
import { dbService } from '../services/dbService';

const AppContext = createContext();

const STORAGE_KEYS = {
  ITEMS: 'bite_items_v1',
  SETTINGS: 'bite_settings_v1',
  STATS: 'bite_stats_v1',
};

export function AppProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState('usr_demo_primary_001');
  const [wasteRecords, setWasteRecords] = useState([]);
  const [userScans, setUserScans] = useState([]);
  const [userReminders, setUserReminders] = useState([]);

  // 1. Items State
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return SAMPLE_PRODUCTS;
  });

  // Sync with DB on mount
  useEffect(() => {
    let mounted = true;
    async function syncWithDb() {
      try {
        const session = await dbService.getCurrentSession();
        if (!mounted) return;
        const uId = session?.user?.id || 'usr_demo_primary_001';
        setCurrentUserId(uId);

        const [dbItems, dbWaste, dbScans, dbReminders] = await Promise.all([
          dbService.getPantryItems(uId),
          dbService.getWasteRecords(uId),
          dbService.getUserScans(uId),
          dbService.getUserReminders(uId)
        ]);

        if (!mounted) return;
        if (dbWaste && dbWaste.length > 0) {
          setWasteRecords(dbWaste);
        }
        if (dbScans && dbScans.length > 0) {
          setUserScans(dbScans);
        }
        if (dbReminders && dbReminders.length > 0) {
          setUserReminders(dbReminders);
        }

        // Process any due pending reminders immediately on load
        try {
          const processed = await dbService.processDueReminders(uId);
          if (processed && processed.length > 0 && mounted) {
            const updatedReminders = await dbService.getUserReminders(uId);
            setUserReminders(updatedReminders);
          }
        } catch (_) {}

        if (dbItems && dbItems.length > 0) {
          setItems(dbItems);
        } else {
          // Seed initial sample products to DB
          for (const sp of SAMPLE_PRODUCTS) {
            await dbService.savePantryItem({ user_id: uId, ...sp });
          }
        }
      } catch (err) {
        console.warn('[AppContext] Sync with DB failed:', err);
      }
    }
    syncWithDb();
    return () => { mounted = false; };
  }, []);

  // Periodic reminder checking every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const processed = await dbService.processDueReminders(currentUserId);
        if (processed && processed.length > 0) {
          const [updatedRem, updatedScans] = await Promise.all([
            dbService.getUserReminders(currentUserId),
            dbService.getUserScans(currentUserId)
          ]);
          setUserReminders(updatedRem);
          setUserScans(updatedScans);
        }
      } catch (_) {}
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  // 2. Settings State
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (_) {}
    return DEFAULT_SETTINGS;
  });


  // 3. Stats State
  const [stats, setStats] = useState(() => {
    const defaultStats = {
      itemsTracked: 5,
      itemsUsedBeforeExpiry: 12,
      itemsWasted: 2,
      estimatedMoneySaved: 1450,
      currentStreak: 3,
      longestStreak: 5,
      lastScanDate: new Date().toISOString().split('T')[0],
      badgesEarned: ['first_scan', 'three_day_streak'],
      historyLog: [
        { date: new Date().toISOString().split('T')[0], action: 'scan', itemName: 'Amul Taaza Milk' },
        { date: new Date().toISOString().split('T')[0], action: 'used', itemName: 'Greek Yogurt' }
      ]
    };
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      if (saved) return { ...defaultStats, ...JSON.parse(saved) };
    } catch (_) {}
    return defaultStats;
  });

  // Theme State: Dark and Light Mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('bite_theme_v1');
      if (saved !== null) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (_) {
      return false;
    }
  });

  // Sync dark class on document root
  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('bite_theme_v1', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('bite_theme_v1', 'light');
      }
    } catch (_) {}
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  // Toast notifications
  const [toast, setToast] = useState(null);

  // Active Ringing Alarm Item State
  const [activeAlarmItem, setActiveAlarmItem] = useState(null);

  const triggerAlarmForItem = (item, soundType = null, warningSign = null) => {
    const sound = soundType || item.alarmSound || settings.alarmSoundDefault || 'siren';
    const sign = warningSign || item.warningSign || settings.defaultWarningSign || 'flashing-siren';
    const daysRemaining = getDaysRemaining(item.expiryDate);

    setActiveAlarmItem({
      item,
      daysRemaining,
      soundType: sound,
      warningSign: sign
    });

    playAlarmSound(sound);
    triggerDesktopExpiryNotification(item, daysRemaining);
  };

  const dismissAlarm = () => {
    stopAlarmSound();
    setActiveAlarmItem(null);
  };

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    } catch (_) {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (_) {}
  }, [stats]);

  const showToast = (message, type = 'info', icon = null) => {
    setToast({ id: Date.now(), message, type, icon });
    setTimeout(() => setToast(null), 4000);
  };

  /**
   * Helper to compute days remaining for an item
   */
  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diff = exp.getTime() - today.getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  /**
   * Helper to determine urgency color, label, and attention status
   */
  const getItemUrgency = (item) => {
    const attention = getAttentionStatus(item);
    const days = getDaysRemaining(item?.expiryDate);

    return {
      status: attention.color === 'red' ? 'expired' : attention.color === 'yellow' ? 'urgent' : attention.color === 'green' ? 'fresh' : 'unknown',
      color: attention.color,
      daysRemaining: days,
      label: attention.label,
      attentionStatus: attention.status,
      attentionReason: attention.reason
    };
  };

  /**
   * Smart Attention System Status
   * Returns SAFE, USE SOON, EXPIRED, or VERIFY DATE with human-friendly reason
   */
  const getAttentionStatus = (item) => {
    if (!item) {
      return {
        status: 'VERIFY DATE',
        label: 'Verify Date',
        color: 'gray',
        reason: 'Verify Date — Product record is empty.'
      };
    }

    if (!item.expiryDate || item.requiresVerification || item.confidence === 'low' || item.confidence === 'none') {
      return {
        status: 'VERIFY DATE',
        label: 'Verify Date',
        color: 'gray',
        daysRemaining: null,
        reason: item.verificationReason || 'Verify Date — OCR could not confidently read the expiry date.'
      };
    }

    const days = getDaysRemaining(item.expiryDate);
    if (days === null) {
      return {
        status: 'VERIFY DATE',
        label: 'Verify Date',
        color: 'gray',
        daysRemaining: null,
        reason: 'Verify Date — OCR could not confidently read the expiry date.'
      };
    }

    if (days <= 0) {
      return {
        status: 'EXPIRED',
        label: days === 0 ? 'Expires Today (Expired)' : `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`,
        color: 'red',
        daysRemaining: days,
        reason: days === 0
          ? 'EXPIRED — Package expires today. Do not consume past expiration.'
          : `EXPIRED — Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago. Do not consume.`
      };
    }

    const override = settings.categoryOverrides?.[item.type] || settings.categoryOverrides?.[item.category];
    const leadThreshold = override !== undefined ? override : settings.notificationLeadDays;

    if (days <= leadThreshold || days <= 7) {
      return {
        status: 'USE SOON',
        label: days === 0 ? 'Expires Today!' : (days === 1 ? 'Expires Tomorrow' : `Expires in ${days} days`),
        color: 'yellow',
        daysRemaining: days,
        reason: days === 0 ? 'Use Soon — expires today!' : `Use Soon — expires in ${days} day${days === 1 ? '' : 's'}.`
      };
    }

    return {
      status: 'SAFE',
      label: `Expires in ${days} days`,
      color: 'green',
      daysRemaining: days,
      reason: `Safe — expires in ${days} days.`
    };
  };

  /**
   * Checks extracted ingredients against user's saved allergy profile
   */
  const checkAllergies = (ingredients = [], extraText = '') => {
    const profile = settings.allergyProfile || [];
    if (!profile || profile.length === 0) return { hasMatch: false, matches: [] };

    const ingString = `${Array.isArray(ingredients) ? ingredients.join(' ') : ''} ${extraText || ''}`.toLowerCase();
    const allergenTriggers = [
      { name: 'Milk & Lactose', regex: /\b(?:milk|dairy|lactose|casein|whey|butter|ghee|paneer|cheese|cream|curd|yogurt)\b/i },
      { name: 'Gluten (Wheat)', regex: /\b(?:wheat|gluten|atta|maida|semolina|barley|rye|malt|flour)\b/i },
      { name: 'Soybeans & Soy', regex: /\b(?:soy|soya|lecithin|edamame|tofu)\b/i },
      { name: 'Peanuts', regex: /\b(?:peanut|peanuts|groundnut)\b/i },
      { name: 'Tree Nuts', regex: /\b(?:almond|cashew|walnut|pistachio|hazelnut|pecan|macadamia|tree\s*nut)\b/i },
      { name: 'Eggs', regex: /\b(?:egg|eggs|albumin|egg\s*powder|yolk)\b/i },
      { name: 'Fish & Seafood', regex: /\b(?:fish|salmon|tuna|cod|prawn|shrimp|crab|shellfish)\b/i },
      { name: 'Mustard', regex: /\b(?:mustard|sarson)\b/i },
      { name: 'Sesame Seeds', regex: /\b(?:sesame|til)\b/i }
    ];

    const matched = [];
    for (const userAllergen of profile) {
      const trigger = allergenTriggers.find(t => t.name.toLowerCase() === userAllergen.toLowerCase());
      if (trigger) {
        if (trigger.regex.test(ingString)) {
          matched.push(trigger.name);
        }
      } else {
        if (ingString.includes(userAllergen.toLowerCase())) {
          matched.push(userAllergen);
        }
      }
    }

    return {
      hasMatch: matched.length > 0,
      matches: matched
    };
  };

  /**
   * Items that are nearing expiry according to notification settings
   */
  const expiringSoonItems = items.filter(item => {
    if (item.status === 'used' || item.status === 'wasted') return false;
    const days = getDaysRemaining(item.expiryDate);
    if (days === null) return false;

    const override = settings.categoryOverrides?.[item.type] || settings.categoryOverrides?.[item.category];
    const leadThreshold = override !== undefined ? override : settings.notificationLeadDays;

    return days <= leadThreshold;
  });

  /**
   * Add new item or update existing item if exact physical package exists
   * (Same barcode, same expiry date, and same batch number)
   */
  const addItem = (newItem) => {
    // Only merge if barcode, expiryDate, AND batchNumber match
    if (newItem.barcode) {
      const existingIndex = items.findIndex(
        i => i.status !== 'used' && i.status !== 'wasted' && 
             i.barcode && i.barcode === newItem.barcode &&
             i.expiryDate === newItem.expiryDate &&
             ((!i.batchNumber && !newItem.batchNumber) || i.batchNumber === newItem.batchNumber)
      );
      if (existingIndex !== -1) {
        const existing = items[existingIndex];
        const mergedItem = {
          ...existing,
          ...newItem,
          id: existing.id,
          dateAdded: existing.dateAdded || new Date().toISOString().split('T')[0],
          name: newItem.name || existing.name,
          brand: newItem.brand || existing.brand,
          category: newItem.category || existing.category,
          expiryDate: newItem.expiryDate || existing.expiryDate,
          mfgDate: newItem.mfgDate || existing.mfgDate,
          batchNumber: newItem.batchNumber || existing.batchNumber,
          nutritionInfo: newItem.nutritionInfo || existing.nutritionInfo,
          ingredientsOriginal: (newItem.ingredientsOriginal && newItem.ingredientsOriginal.length > 0) ? newItem.ingredientsOriginal : existing.ingredientsOriginal,
          productIntelligence: newItem.productIntelligence || existing.productIntelligence,
          sourceOfInfo: newItem.sourceOfInfo || existing.sourceOfInfo || 'barcode+ocr',
          isCalculatedDate: newItem.isCalculatedDate !== undefined ? newItem.isCalculatedDate : existing.isCalculatedDate,
          calculationNote: newItem.calculationNote || existing.calculationNote,
          lastUpdated: new Date().toISOString().split('T')[0]
        };

        const updatedItems = [...items];
        updatedItems[existingIndex] = mergedItem;
        setItems(updatedItems);

        // Async DB update
        dbService.updatePantryItem(existing.id, mergedItem).catch(err => console.warn('Pantry DB update err:', err));

        showToast(`Updated existing "${mergedItem.name}" in Pantry!`, 'success', '🔄');
        return mergedItem;
      }
    }

    const itemWithDefaults = {
      id: newItem.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newItem.name || 'Untitled Item',
      brand: newItem.brand || null,
      type: newItem.type || 'grocery',
      category: newItem.category || (newItem.type === 'medicine' ? 'Tablets & Capsules' : 'Other Grocery'),
      barcode: newItem.barcode || null,
      batchNumber: newItem.batchNumber || null,
      frontImage: newItem.frontImage || null,
      backImage: newItem.backImage || null,
      rawOcrText: newItem.rawOcrText || null,
      expiryDate: newItem.expiryDate || null,
      expirySource: newItem.expirySource || 'scanned',
      sourceOfInfo: newItem.sourceOfInfo || 'scanned',
      isCalculatedDate: newItem.isCalculatedDate || false,
      calculationNote: newItem.calculationNote || null,
      bestBeforePeriod: newItem.bestBeforePeriod || null,
      mfgDate: newItem.mfgDate || null,
      ingredientsOriginal: newItem.ingredientsOriginal || [],
      ingredientsTranslated: newItem.ingredientsTranslated || {},
      ingredientExplanations: newItem.ingredientExplanations || {},
      nutritionInfo: newItem.nutritionInfo || null,
      status: 'active',
      alarmEnabled: newItem.alarmEnabled !== undefined ? newItem.alarmEnabled : true,
      alarmSound: newItem.alarmSound || settings.alarmSoundDefault || 'siren',
      warningSign: newItem.warningSign || settings.defaultWarningSign || 'flashing-siren',
      productIntelligence: newItem.productIntelligence || null,
      dateAdded: new Date().toISOString().split('T')[0],
      estimatedValue: newItem.estimatedValue || settings.defaultItemValue || 100,
      notes: newItem.notes || ''
    };

    const updatedItems = [itemWithDefaults, ...items];
    setItems(updatedItems);

    // Save to Database tables: products, scanned_products, pantry_items
    if (itemWithDefaults.barcode) {
      dbService.saveProduct({
        barcode: itemWithDefaults.barcode,
        product_name: itemWithDefaults.name,
        brand: itemWithDefaults.brand,
        category: itemWithDefaults.category,
        product_type: itemWithDefaults.type,
        ingredients: itemWithDefaults.ingredientsOriginal,
        nutrition: itemWithDefaults.nutritionInfo,
        source: itemWithDefaults.sourceOfInfo
      }).catch(err => console.warn('Product knowledge DB save err:', err));
    }

    dbService.saveScannedProduct({
      user_id: currentUserId,
      barcode: itemWithDefaults.barcode,
      ocr_text: itemWithDefaults.rawOcrText,
      mfg_date: itemWithDefaults.mfgDate,
      expiry_date: itemWithDefaults.expiryDate,
      best_before: itemWithDefaults.bestBeforePeriod,
      batch_number: itemWithDefaults.batchNumber,
      ingredients: itemWithDefaults.ingredientsOriginal,
      nutrition: itemWithDefaults.nutritionInfo,
      confidence_score: itemWithDefaults.productIntelligence?.expiryInfo?.confidenceScore || 90,
      detection_source: itemWithDefaults.sourceOfInfo
    }).catch(err => console.warn('Scanned product DB save err:', err));

    dbService.savePantryItem({
      user_id: currentUserId,
      ...itemWithDefaults
    }).catch(err => console.warn('Pantry item DB save err:', err));

    // Save to user_scans table and generate automatic reminders
    dbService.saveUserScan({
      user_id: currentUserId,
      scan_type: itemWithDefaults.sourceOfInfo?.toLowerCase().includes('ocr') ? 'OCR' : (itemWithDefaults.barcode ? 'barcode' : 'manual'),
      barcode: itemWithDefaults.barcode,
      extracted_text: itemWithDefaults.rawOcrText,
      expiry_date: itemWithDefaults.expiryDate,
      manufacturing_date: itemWithDefaults.mfgDate,
      quantity: 1,
      notes: itemWithDefaults.notes,
      scan_image_url: itemWithDefaults.frontImage || itemWithDefaults.backImage,
      product_name: itemWithDefaults.name,
      brand: itemWithDefaults.brand,
      category: itemWithDefaults.type === 'medicine' ? 'Medicine' : (itemWithDefaults.category || 'Food'),
      scanned_at: new Date().toISOString()
    }).then(async (savedScan) => {
      if (savedScan) {
        setUserScans(prev => [savedScan, ...prev.filter(s => s.id !== savedScan.id)]);
        const updatedRem = await dbService.getUserReminders(currentUserId);
        setUserReminders(updatedRem);
      }
    }).catch(err => console.warn('user_scans DB save err:', err));

    // Update streak
    const updatedStreak = calculateUpdatedStreak(stats);

    // Update stats
    const updatedStats = {
      ...stats,
      ...updatedStreak,
      itemsTracked: (stats.itemsTracked || 0) + 1,
      historyLog: [
        { date: new Date().toISOString().split('T')[0], action: 'scan', itemName: itemWithDefaults.name },
        ...(stats.historyLog || []).slice(0, 40)
      ]
    };

    // Check badges
    const { badgesEarned, newlyUnlocked } = checkAndUnlockBadges(updatedStats, updatedItems);
    updatedStats.badgesEarned = badgesEarned;

    setStats(updatedStats);

    showToast(`"${itemWithDefaults.name}" saved to Dashboard!`, 'success', '✅');

    if (newlyUnlocked.length > 0) {
      newlyUnlocked.forEach(b => {
        setTimeout(() => {
          showToast(`Achievement Unlocked: ${b.name}! ${b.icon}`, 'success', '🏆');
        }, 800);
      });
    }

    return itemWithDefaults;
  };

  /**
   * Update item
   */
  const updateItem = (id, updates) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    dbService.updatePantryItem(id, updates).catch(err => console.warn('Pantry DB update err:', err));
    showToast('Item updated', 'info');
  };

  /**
   * Remove item
   */
  const deleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    dbService.deletePantryItem(id).catch(err => console.warn('Pantry DB delete err:', err));
    showToast('Item removed', 'info');
  };

  /**
   * Mark as Used before expiry
   */
  const markAsUsed = (id, options = {}) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    const qty = options.quantity || 1;
    const reason = options.reason || 'Consumed safely before expiry';
    const value = (target.estimatedValue || settings.defaultItemValue || 100) * qty;

    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'used' } : item));

    // DB sync
    dbService.updatePantryItem(id, { status: 'used' }).catch(err => console.warn('Pantry DB update err:', err));
    dbService.recordWaste({
      userId: currentUserId,
      pantryItemId: id,
      product: target.name,
      category: target.category,
      expiryDate: target.expiryDate,
      status: 'used',
      reason,
      quantity: qty
    }).then(newRec => {
      if (newRec) setWasteRecords(prev => [newRec, ...prev]);
    }).catch(err => console.warn('Waste record DB err:', err));

    const updatedStats = {
      ...stats,
      itemsUsedBeforeExpiry: (stats.itemsUsedBeforeExpiry || 0) + qty,
      estimatedMoneySaved: (stats.estimatedMoneySaved || 0) + value,
      historyLog: [
        { date: new Date().toISOString().split('T')[0], action: 'used', itemName: target.name },
        ...(stats.historyLog || []).slice(0, 40)
      ]
    };

    const { badgesEarned, newlyUnlocked } = checkAndUnlockBadges(updatedStats, items);
    updatedStats.badgesEarned = badgesEarned;

    setStats(updatedStats);
    triggerCelebration('used');
    showToast(`Great job! Marked "${target.name}" as used (+${settings.currencySymbol}${value} saved)`, 'success', '🌱');
  };

  /**
   * Mark as Wasted
   */
  const markAsWasted = (id, options = {}) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    const qty = options.quantity || 1;
    const reason = options.reason || 'expired';

    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'wasted' } : item));

    // DB sync
    dbService.updatePantryItem(id, { status: 'wasted' }).catch(err => console.warn('Pantry DB update err:', err));
    dbService.recordWaste({
      userId: currentUserId,
      pantryItemId: id,
      product: target.name,
      category: target.category,
      expiryDate: target.expiryDate,
      status: 'wasted',
      reason,
      quantity: qty
    }).then(newRec => {
      if (newRec) setWasteRecords(prev => [newRec, ...prev]);
    }).catch(err => console.warn('Waste record DB err:', err));

    const updatedStats = {
      ...stats,
      itemsWasted: (stats.itemsWasted || 0) + qty,
      historyLog: [
        { date: new Date().toISOString().split('T')[0], action: 'wasted', itemName: target.name },
        ...(stats.historyLog || []).slice(0, 40)
      ]
    };

    setStats(updatedStats);
    showToast(`Marked "${target.name}" as wasted (${reason})`, 'warning', '⚠️');
  };

  /**
   * Mark as Discarded (safe medical/food discard)
   */
  const markAsDiscarded = (id, options = {}) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    const qty = options.quantity || 1;
    const reason = options.reason || (target.type === 'medicine' ? 'expired' : 'spoiled');

    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'discarded' } : item));

    // DB sync
    dbService.updatePantryItem(id, { status: 'discarded' }).catch(err => console.warn('Pantry DB update err:', err));
    dbService.recordWaste({
      userId: currentUserId,
      pantryItemId: id,
      product: target.name,
      category: target.category,
      expiryDate: target.expiryDate,
      status: 'discarded',
      reason,
      quantity: qty
    }).then(newRec => {
      if (newRec) setWasteRecords(prev => [newRec, ...prev]);
    }).catch(err => console.warn('Waste record DB err:', err));

    const updatedStats = {
      ...stats,
      itemsWasted: (stats.itemsWasted || 0) + qty,
      historyLog: [
        { date: new Date().toISOString().split('T')[0], action: 'discarded', itemName: target.name },
        ...(stats.historyLog || []).slice(0, 40)
      ]
    };

    setStats(updatedStats);
    showToast(`Marked "${target.name}" as safely discarded`, 'info', '🗑️');
  };


  const refreshScansAndReminders = async (userId = currentUserId) => {
    try {
      const [scans, reminders] = await Promise.all([
        dbService.getUserScans(userId),
        dbService.getUserReminders(userId)
      ]);
      setUserScans(scans || []);
      setUserReminders(reminders || []);
      return { scans, reminders };
    } catch (e) {
      console.warn('refreshScansAndReminders err:', e);
    }
  };

  const markScanStatus = async (scanId, newStatus) => {
    try {
      const updated = await dbService.markScanStatus(scanId, newStatus);
      await refreshScansAndReminders(currentUserId);
      showToast(`Item marked as ${newStatus.replace('_', ' ')}`, 'info', '📋');
      return updated;
    } catch (err) {
      showToast(err.message || 'Error updating status', 'error', '⚠️');
    }
  };

  const deleteUserScan = async (scanId) => {
    try {
      await dbService.deleteUserScan(scanId);
      await refreshScansAndReminders(currentUserId);
      showToast('Scan deleted successfully', 'info', '🗑️');
    } catch (err) {
      showToast('Error deleting scan', 'error', '⚠️');
    }
  };

  /**
   * Reset data to default samples
   */
  const resetToSampleData = () => {
    setItems(SAMPLE_PRODUCTS);
    setSettings(DEFAULT_SETTINGS);
    showToast('Reset to demo sample items and default settings', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        items,
        wasteRecords,
        userScans,
        userReminders,
        refreshScansAndReminders,
        markScanStatus,
        deleteUserScan,
        currentUserId,
        settings,
        stats,
        toast,
        expiringSoonItems,
        getDaysRemaining,
        getItemUrgency,
        getAttentionStatus,
        checkAllergies,
        addItem,
        updateItem,
        deleteItem,
        markAsUsed,
        markAsWasted,
        markAsDiscarded,
        setSettings,
        setStats,
        showToast,
        resetToSampleData,
        isDarkMode,
        toggleDarkMode,
        activeAlarmItem,
        triggerAlarmForItem,
        dismissAlarm
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
