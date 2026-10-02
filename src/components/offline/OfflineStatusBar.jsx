import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, RefreshCw, CheckCircle, AlertTriangle, 
  CloudOff, CloudUpload
} from 'lucide-react';
import { 
  isDeviceOnline, 
  setSimulatedNetworkStatus, 
  getOfflineQueue, 
  processOfflineQueue, 
  subscribeToSyncUpdates,
  SYNC_STATUS
} from '../../services/offlineSyncService';
import { supabase } from '../../services/supabaseClient';
import { useApp } from '../../context/AppContext';

export function OfflineStatusBar() {
  const { showToast } = useApp();
  const [online, setOnline] = useState(isDeviceOnline());
  const [queueCount, setQueueCount] = useState(getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncReport, setLastSyncReport] = useState(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeToSyncUpdates((data) => {
      setOnline(isDeviceOnline());
      setQueueCount(getOfflineQueue().length);
      if (data.status === SYNC_STATUS.SYNCING) setIsSyncing(true);
      if (data.status === SYNC_STATUS.ONLINE) setIsSyncing(false);
      if (data.report) setLastSyncReport(data.report);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleSyncNow = async () => {
    if (!online) {
      showToast?.('Device is offline. Reconnect or toggle simulation to sync.', 'info');
      return;
    }

    setIsSyncing(true);
    try {
      const report = await processOfflineQueue(supabase);
      setLastSyncReport(report);
      setQueueCount(report.remainingQueue);
      showToast?.(report.message, report.success ? 'success' : 'error');
    } catch (err) {
      console.error('Manual sync failed:', err);
      showToast?.('Synchronization failed. Will retry automatically.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSimulation = () => {
    const nextState = !online;
    setSimulatedNetworkStatus(nextState);
    setOnline(nextState);
    showToast?.(
      nextState 
        ? 'Internet Connection Restored. Auto-sync enabled.' 
        : 'Entered Offline / Low-Internet Mode. All scans saved locally.',
      nextState ? 'success' : 'info'
    );
  };

  return (
    <div className={`px-4 py-1.5 text-xs font-semibold flex items-center justify-between border-b transition-colors ${
      online 
        ? 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400' 
        : 'bg-amber-100/90 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 animate-pulse'
    }`}>
      
      <div className="flex items-center space-x-2">
        {online ? (
          <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[11px] font-bold">Cloud Connected</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-amber-700 dark:text-amber-300">
            <WifiOff className="w-3.5 h-3.5 animate-bounce" />
            <span className="text-[11px] font-extrabold uppercase">Offline / Low-Internet Mode</span>
          </div>
        )}

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {queueCount > 0 ? (
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
            {queueCount} mutation(s) queued for sync
          </span>
        ) : (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            All records synchronized
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Sync Action Button */}
        {queueCount > 0 && (
          <button
            onClick={handleSyncNow}
            disabled={!online || isSyncing}
            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] disabled:opacity-40 transition-all shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Cloud'}</span>
          </button>
        )}

        {/* Network Simulation Toggle for testing */}
        <button
          onClick={toggleSimulation}
          className="text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
          title="Toggle network simulation to test offline local storage queue"
        >
          {online ? 'Simulate Low-Internet' : 'Simulate Online'}
        </button>
      </div>

    </div>
  );
}
