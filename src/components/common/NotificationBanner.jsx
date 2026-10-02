import React, { useState, useMemo } from 'react';
import { AlertTriangle, Clock, ChevronRight, X, Sparkles, CheckCircle2, ShieldAlert, AlertCircle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getPrioritizedAlerts, ALERT_PRIORITY } from '../../services/alertService';

export function NotificationBanner({ onSelectTab, onSelectItem }) {
  const { settings, items = [], wasteRecords = [], getDaysRemaining, triggerAlarmForItem } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Compute prioritized non-spammy alerts
  const alerts = useMemo(() => {
    return getPrioritizedAlerts({
      items,
      wasteRecords,
      settings,
      userProfile: { allergies: settings.userAllergies || [] }
    });
  }, [items, wasteRecords, settings]);

  // If notification bar is turned off in settings, or user dismissed, or no active alerts
  if (!settings.notificationBarEnabled || dismissed || alerts.length === 0) {
    return null;
  }

  const primaryAlert = alerts[0];
  const criticalCount = alerts.filter(a => a.priority === ALERT_PRIORITY.CRITICAL).length;
  const warningCount = alerts.filter(a => a.priority === ALERT_PRIORITY.WARNING).length;

  return (
    <aside aria-label="Intelligent Safety & Expiry Alerts" className={`text-white shadow-md transition-all duration-300 ${
      criticalCount > 0
        ? 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600'
        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Main message */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-sm shrink-0">
              {criticalCount > 0 ? (
                <ShieldAlert className="h-5 w-5 text-white animate-bounce" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-100 animate-bounce" />
              )}
            </span>
            <div className="truncate">
              <span className={`font-extrabold text-[11px] tracking-wide uppercase mr-2 px-2 py-0.5 rounded-md ${
                primaryAlert.priority === ALERT_PRIORITY.CRITICAL
                  ? 'bg-black/30 text-rose-200'
                  : 'bg-black/20 text-amber-200'
              }`}>
                {primaryAlert.priorityLabel}
              </span>
              <span className="text-xs sm:text-sm font-bold text-white">
                {primaryAlert.title} — <span className="font-normal opacity-90">{primaryAlert.message}</span>
              </span>
            </div>
          </div>

          {/* Quick interactive buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {criticalCount > 0 && (
              <button
                onClick={() => {
                  const criticalItem = alerts.find(a => a.item)?.item;
                  if (criticalItem) triggerAlarmForItem(criticalItem);
                }}
                className="flex items-center space-x-1 text-xs font-black px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/40 text-white shadow-sm transition-all"
                title="Sound Expiry Alarm"
              >
                <span>🚨 Alarm</span>
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all flex items-center space-x-1"
            >
              <span>{isExpanded ? 'Hide Alerts' : `All Alerts (${alerts.length})`}</span>
            </button>

            <button
              onClick={() => onSelectTab && onSelectTab('dashboard')}
              className="flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 shadow-sm transition-all"
            >
              <span>Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-all"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expanded Quick Drawer */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/25 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {alerts.slice(0, 6).map(alert => (
              <div
                key={alert.id}
                onClick={() => {
                  if (alert.item && onSelectItem) onSelectItem(alert.item);
                }}
                className="flex items-start justify-between p-2.5 rounded-xl bg-black/25 hover:bg-black/40 cursor-pointer backdrop-blur-sm transition-all text-xs space-x-2"
              >
                <div className="space-y-0.5 truncate">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold uppercase text-[10px] text-amber-200">
                      [{alert.priorityLabel}]
                    </span>
                    <span className="font-bold text-white truncate">{alert.title}</span>
                  </div>
                  <p className="text-[11px] text-white/80 truncate">
                    {alert.message}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 text-white">
                  {alert.actionLabel}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </aside>
  );
}
