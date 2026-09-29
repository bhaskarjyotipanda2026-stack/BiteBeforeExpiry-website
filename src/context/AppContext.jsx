import React, { createContext, useContext, useState, useEffect } from 'react';
import { SAMPLE_PRODUCTS } from '../data/sampleProducts';
import { DEFAULT_SETTINGS, BADGES_DEFINITION } from '../constants';
import { calculateUpdatedStreak, checkAndUnlockBadges, triggerCelebration } from '../services/streakService';
import { playAlarmSound, stopAlarmSound, triggerDesktopExpiryNotification } from '../services/alarmSoundService';

const AppContext = createContext();

const STORAGE_KEYS = {
  ITEMS: 'bite_items_v1',
  SETTINGS: 'bite_settings_v1',
  STATS: 'bite_stats_v1',
};

export function AppProvider({ children }) {
  // 1. Items State
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ITEMS);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return SAMPLE_PRODUCTS;
  });

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
   * Helper to determine urgency color and label
   */
  const getItemUrgency = (item) => {
    const days = getDaysRemaining(item.expiryDate);
    if (days === null) {
      return { status: 'unknown', color: 'gray', label: 'No Date' };
    }
    if (days < 0) {
      return {
        status: 'expired',
        color: 'red',
        daysRemaining: days,
        label: `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
      };
    }
    if (days === 0) {
      return { status: 'urgent', color: 'red', daysRemaining: 0, label: 'Expires Today!' };
    }

    // Lead days check
    const override = settings.categoryOverrides?.[item.type] || settings.categoryOverrides?.[item.category];
    const leadThreshold = override !== undefined ? override : settings.notificationLeadDays;

    if (days <= leadThreshold) {
      return {
        status: 'warning',
        color: 'yellow',
        daysRemaining: days,
        label: days === 1 ? 'Expires Tomorrow' : `Expires in ${days} days`
      };
    }

    if (days <= 7) {
      return {
        status: 'warning',
        color: 'yellow',
        daysRemaining: days,
        label: `Expires in ${days} days`
      };
    }

    return {
      status: 'fresh',
      color: 'green',
      daysRemaining: days,
      label: `Expires in ${days} days`
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
   * Add new item
   */
  const addItem = (newItem) => {
    const itemWithDefaults = {
      id: newItem.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newItem.name || 'Untitled Item',
      type: newItem.type || 'grocery',
      category: newItem.category || (newItem.type === 'medicine' ? 'Tablets & Capsules' : 'Other Grocery'),
      frontImage: newItem.frontImage || null,
      backImage: newItem.backImage || null,
      rawOcrText: newItem.rawOcrText || null,
      expiryDate: newItem.expiryDate || null,
      expirySource: newItem.expirySource || 'scanned',
      mfgDate: newItem.mfgDate || null,
      ingredientsOriginal: newItem.ingredientsOriginal || [],
      ingredientsTranslated: newItem.ingredientsTranslated || {},
      ingredientExplanations: newItem.ingredientExplanations || {},
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
    showToast('Item updated', 'info');
  };

  /**
   * Remove item
   */
  const deleteItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    showToast('Item removed', 'info');
  };

  /**
   * Mark as Used before expiry
   */
  const markAsUsed = (id) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    const value = target.estimatedValue || settings.defaultItemValue || 100;

    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'used' } : item));

    const updatedStats = {
      ...stats,
      itemsUsedBeforeExpiry: (stats.itemsUsedBeforeExpiry || 0) + 1,
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
  const markAsWasted = (id) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'wasted' } : item));

    const updatedStats = {
      ...stats,
      itemsWasted: (stats.itemsWasted || 0) + 1,
      historyLog: [
        { date: new Date().toISOString().split('T')[0], action: 'wasted', itemName: target.name },
        ...(stats.historyLog || []).slice(0, 40)
      ]
    };

    setStats(updatedStats);
    showToast(`Marked "${target.name}" as wasted`, 'warning', '⚠️');
  };

  /**
   * Mark as Discarded (safe medical/food discard)
   */
  const markAsDiscarded = (id) => {
    const target = items.find(i => i.id === id);
    if (!target) return;

    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'wasted' } : item));

    const updatedStats = {
      ...stats,
      itemsWasted: (stats.itemsWasted || 0) + 1,
      historyLog: [
        { date: new Date().toISOString().split('T')[0], action: 'discarded', itemName: target.name },
        ...(stats.historyLog || []).slice(0, 40)
      ]
    };

    setStats(updatedStats);
    showToast(`Marked "${target.name}" as safely discarded`, 'info', '🗑️');
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
        settings,
        stats,
        toast,
        expiringSoonItems,
        getDaysRemaining,
        getItemUrgency,
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
