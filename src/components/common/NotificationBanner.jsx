import React, { useState } from 'react';
import { AlertTriangle, Clock, ChevronRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function NotificationBanner({ onSelectTab, onSelectItem }) {
  const { settings, expiringSoonItems, getDaysRemaining, triggerAlarmForItem } = useApp();
  const [dismissed, setDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // If notification bar is turned off in settings, or user dismissed, or no items expiring soon
  if (!settings.notificationBarEnabled || dismissed || expiringSoonItems.length === 0) {
    return null;
  }

  const urgentCount = expiringSoonItems.length;
  const expiredCount = expiringSoonItems.filter(i => (getDaysRemaining(i.expiryDate) ?? 0) < 0).length;

  return (
    <aside aria-label="Urgent Expiry Alerts" className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          
          {/* Main message */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shadow-sm">
              <AlertTriangle className="h-5 w-5 text-amber-100 animate-bounce" />
            </span>
            <div className="truncate">
              <span className="font-extrabold text-sm tracking-wide uppercase mr-2 bg-black/20 px-2 py-0.5 rounded-md text-amber-200">
                Action Required
              </span>
              <span className="text-sm font-semibold text-white">
                {expiredCount > 0 ? (
                  <>
                    <strong className="text-amber-100">{expiredCount}</strong> item{expiredCount > 1 ? 's are' : ' is'} expired &{' '}
                    <strong className="text-amber-100">{urgentCount - expiredCount}</strong> expiring within {settings.notificationLeadDays} days!
                  </>
                ) : (
                  <>
                    <strong className="text-amber-100">{urgentCount}</strong> item{urgentCount > 1 ? 's' : ''} expiring within the next {settings.notificationLeadDays} days!
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Quick interactive buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (expiringSoonItems.length > 0) {
                  triggerAlarmForItem(expiringSoonItems[0]);
                }
              }}
              className="flex items-center space-x-1 text-xs font-black px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all animate-pulse"
              title="Sound Expiry Alarm"
            >
              <span>🚨</span>
              <span>Sound Alarm</span>
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-all"
            >
              {isExpanded ? 'Hide List' : 'View Expiring Items'}
            </button>

            <button
              onClick={() => onSelectTab && onSelectTab('dashboard')}
              className="flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-orange-900 hover:bg-orange-50 shadow-sm transition-all"
            >
              <span>Go to Dashboard</span>
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
          <div className="mt-3 pt-3 border-t border-white/25 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {expiringSoonItems.map(item => {
              const days = getDaysRemaining(item.expiryDate);
              const isPast = days < 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectItem && onSelectItem(item)}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/20 hover:bg-black/35 cursor-pointer backdrop-blur-sm transition-all text-xs"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span>{item.type === 'medicine' ? '💊' : '🥛'}</span>
                    <span className="font-semibold truncate">{item.name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                    isPast ? 'bg-red-500 text-white' : 'bg-amber-300 text-amber-950'
                  }`}>
                    {isPast ? `Expired ${Math.abs(days)}d ago` : days === 0 ? 'Today' : `${days}d left`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </aside>
  );
}
