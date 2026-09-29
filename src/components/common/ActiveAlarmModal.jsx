import React from 'react';
import { 
  Bell, BellRing, Volume2, VolumeX, X, AlertTriangle, 
  ArrowRight, ChefHat, ShieldAlert, CheckCircle2 
} from 'lucide-react';
import { stopAlarmSound } from '../../services/alarmSoundService';

export function ActiveAlarmModal({ isOpen, onClose, activeAlarmItem, onNavigateToItem, onNavigateToRecipes }) {
  if (!isOpen || !activeAlarmItem) return null;

  const { item, daysRemaining, soundType, warningSign } = activeAlarmItem;
  const isExpired = daysRemaining !== null && daysRemaining < 0;

  const handleSilence = () => {
    stopAlarmSound();
    onClose();
  };

  const handleCook = () => {
    stopAlarmSound();
    onClose();
    if (onNavigateToRecipes) onNavigateToRecipes();
  };

  const handleView = () => {
    stopAlarmSound();
    onClose();
    if (onNavigateToItem) onNavigateToItem(item);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-rose-500 dark:border-rose-600 animate-scale-up text-center p-6 sm:p-8 space-y-6">
        
        {/* Animated Flashing Alarm Beacon */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-rose-500/20 dark:bg-rose-500/30 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-rose-500/40 animate-pulse" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/30">
            <BellRing className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        {/* Alarm Banner & Product Details */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-xs font-black uppercase tracking-wider">
            <span className="animate-pulse">🚨</span>
            <span>Audible Expiry Alarm Ringing!</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {item.name}
          </h3>

          <p className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400">
            {isExpired
              ? `EXPIRED ${Math.abs(daysRemaining)} Day${Math.abs(daysRemaining) === 1 ? '' : 's'} Ago!`
              : daysRemaining === 0
              ? 'EXPIRES TODAY! Immediate action required.'
              : `Expires in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} (${item.expiryDate})`}
          </p>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            {isExpired
              ? 'This product has passed its safety expiration date. Follow safe disposal guidelines.'
              : 'Consume or cook this product right away to prevent food waste and nutritional loss.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* Silence Alarm Button */}
          <button
            onClick={handleSilence}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold text-sm hover:opacity-90 transition-all shadow-md"
          >
            <VolumeX className="w-4 h-4" />
            <span>Silence / Stop Alarm</span>
          </button>

          {/* Cook Meal / View Item Button */}
          {item.type === 'grocery' && !isExpired && (
            <button
              onClick={handleCook}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all"
            >
              <ChefHat className="w-4 h-4" />
              <span>Make Instant Meal With This</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleView}
            className="w-full py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            View Item Details & Lifespan
          </button>
        </div>

      </div>
    </div>
  );
}
