import React, { useMemo } from 'react';
import { Clock, CheckCircle2, Trash2, Sparkles, AlertCircle, Eye, ShieldAlert, HeartPulse, Bell, BellRing } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateHealthScore } from '../../services/healthScoreService';
import { WARNING_SIGN_OPTIONS } from '../../services/alarmSoundService';

export function ItemCard({ item, onClick, onMarkUsed, onMarkWasted }) {
  const { getItemUrgency, settings, triggerAlarmForItem } = useApp();
  const urgency = getItemUrgency(item);

  // Compute health score for groceries/medicines
  const healthScore = useMemo(() => {
    return calculateHealthScore(item);
  }, [item]);

  // Compute warning sign option
  const matchedSign = useMemo(() => {
    const signId = item.warningSign || settings.defaultWarningSign || 'flashing-siren';
    return WARNING_SIGN_OPTIONS.find(s => s.id === signId) || WARNING_SIGN_OPTIONS[0];
  }, [item.warningSign, settings.defaultWarningSign]);

  // Urgency color styling
  const colorStyles = {
    green: {
      border: 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-400 dark:hover:border-emerald-600',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
      glow: 'shadow-emerald-500/10',
      dot: 'bg-emerald-500'
    },
    yellow: {
      border: 'border-amber-300 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border-amber-200 dark:border-amber-800',
      glow: 'shadow-amber-500/10',
      dot: 'bg-amber-500 animate-pulse'
    },
    red: {
      border: 'border-rose-300 dark:border-rose-800 hover:border-rose-400 dark:hover:border-rose-600',
      badgeBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-800',
      glow: 'shadow-rose-500/10',
      dot: 'bg-rose-500 animate-ping'
    },
    gray: {
      border: 'border-slate-200 dark:border-slate-800',
      badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      glow: 'shadow-slate-500/5',
      dot: 'bg-slate-400'
    }
  };

  const style = colorStyles[urgency.color] || colorStyles.gray;

  // Source tag
  const isEstimated = item.expirySource === 'ai_estimated';
  const isManual = item.expirySource === 'manual';

  return (
    <div 
      className={`group relative rounded-3xl bg-white dark:bg-slate-900 p-5 border-2 ${style.border} shadow-lg ${style.glow} hover:shadow-xl transition-all duration-300 flex flex-col justify-between`}
    >
      <div>
        
        {/* Top Header: Type icon, Category, and Source Indicator */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xl">
              {item.type === 'medicine' ? '💊' : '🥛'}
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
              {item.category || item.type}
            </span>
          </div>

          {/* Expiry Source Tag */}
          <div>
            {isEstimated ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                <Sparkles className="w-2.5 h-2.5" />
                <span>~Estimated</span>
              </span>
            ) : isManual ? (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Manual
              </span>
            ) : (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Scanned
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail Preview (if photo attached) */}
        {item.frontImage && (
          <div 
            onClick={() => onClick(item)}
            className="w-full h-32 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 overflow-hidden mb-3.5 cursor-pointer relative group-hover:opacity-95"
          >
            <img src={item.frontImage} alt={item.name} className="w-full h-full object-contain p-2" />
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
              <Eye className="w-4 h-4 mr-1" /> View Details
            </div>
          </div>
        )}

        {/* Product Title */}
        <h3 
          onClick={() => onClick(item)}
          className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white line-clamp-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          {item.name}
        </h3>

        {/* Expiry Date Display */}
        <div className="mt-2.5 flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Expires: <strong className="text-slate-800 dark:text-slate-200">{item.expiryDate || 'No date set'}</strong></span>
        </div>

        {/* Badges row: Urgency + Health Score */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-extrabold border ${style.badgeBg}`}>
            <span className={`w-2 h-2 rounded-full ${style.dot}`} />
            <span>{urgency.label}</span>
          </div>

          {/* Health Score Pill */}
          {healthScore && (
            <div 
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-black border ${
                healthScore.grade === 'A'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : healthScore.grade === 'B'
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                  : healthScore.grade === 'C'
                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
              title={`${healthScore.verdict} • ${healthScore.novaClass}`}
            >
              <HeartPulse className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Score: {healthScore.score} ({healthScore.grade})</span>
            </div>
          )}
        </div>

        {/* Warning Sign & Quick Alarm Banner (for expiring or expired items) */}
        {(urgency.color === 'red' || urgency.color === 'yellow') && (
          <div className="mt-3 p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-base shrink-0 animate-bounce">{matchedSign.icon}</span>
              <div className="truncate">
                <span className="text-[10px] font-black uppercase text-rose-800 dark:text-rose-300 block truncate">
                  {matchedSign.badge}
                </span>
                <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 block truncate">
                  {urgency.label}
                </span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerAlarmForItem(item);
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-[11px] shadow-sm transition-all animate-pulse shrink-0"
              title="Sound Expiry Alarm"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>Alarm</span>
            </button>
          </div>
        )}

        {/* Ingredients Quick Count & Lifespan */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400">
          {item.ingredientsOriginal && item.ingredientsOriginal.length > 0 && (
            <span>
              <strong className="font-semibold text-slate-700 dark:text-slate-300">{item.ingredientsOriginal.length}</strong> ingredients
            </span>
          )}
          {item.productIntelligence?.lifespan?.totalLifespanHuman && (
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
              ⏳ {item.productIntelligence.lifespan.totalLifespanHuman}
            </span>
          )}
        </div>
      </div>

      {/* Action Footer: Mark Used, Mark Wasted, Details */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        
        {/* Sound Alarm Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            triggerAlarmForItem(item);
          }}
          className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 text-rose-700 dark:text-rose-300 hover:text-white border border-rose-200 dark:border-rose-800 hover:border-rose-600 transition-all shadow-2xs"
          title="Sound Expiry Alarm"
        >
          <Bell className="w-3.5 h-3.5" />
        </button>
        
        {/* Mark as Used Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkUsed(item.id);
          }}
          className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-emerald-800 dark:text-emerald-300 hover:text-white dark:hover:text-white font-bold text-xs border border-emerald-200 dark:border-emerald-800 hover:border-emerald-600 transition-all shadow-2xs"
          title="Mark as consumed before expiry"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Mark Used</span>
        </button>

        {/* Mark as Wasted Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkWasted(item.id);
          }}
          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 hover:border-rose-200 transition-all shadow-2xs"
          title="Mark as expired or wasted"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Details Button */}
        <button
          onClick={() => onClick(item)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all"
          title="Open full product view"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

      </div>

    </div>
  );
}
