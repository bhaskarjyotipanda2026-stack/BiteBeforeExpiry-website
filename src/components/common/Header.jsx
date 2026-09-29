import React from 'react';
import { 
  Sparkles, Flame, Plus, ShieldCheck, Moon, Sun, ScanLine, 
  LayoutDashboard, History, Award, BarChart3, Settings, ChefHat 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function Header({ activeTab, setActiveTab, onOpenUndatedModal }) {
  const { stats, settings, isDarkMode, toggleDarkMode } = useApp();

  const navItems = [
    { id: 'scan', label: 'Scan & Add', icon: ScanLine },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recipes', label: 'Recipes & Reuse', icon: ChefHat },
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'streaks', label: 'Streaks & Badges', icon: Award },
    { id: 'stats', label: 'Impact Stats', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Name */}
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="text-2xl select-none">🥗</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-800 dark:from-white dark:via-emerald-300 dark:to-teal-200 bg-clip-text text-transparent">
                  BiteBefore<span className="text-emerald-600 dark:text-emerald-400">Expiry</span>
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  AI OCR
                </span>
              </div>
              <p className="hidden sm:block text-xs font-medium text-slate-500 dark:text-slate-400">
                Pantry & Medicine Safety Scanner
              </p>
            </div>
          </div>

          {/* Action Center: Streak badge + Theme toggle + Add item manual + Scan shortcut */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Streak Counter Button */}
            <button
              onClick={() => setActiveTab('streaks')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 font-bold text-sm shadow-sm hover:border-amber-400 hover:shadow transition-all"
              title="Click to view streak & earned badges"
            >
              <span className="text-base animate-bounce">🔥</span>
              <span className="tracking-tight">{stats.currentStreak || 1}</span>
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 hidden sm:inline">Days</span>
            </button>

            {/* Dark & Light Mode Toggle Button */}
            <button
              onClick={toggleDarkMode}
              className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-amber-300 transition-all shadow-xs"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle dark/light mode"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Quick Add Manually Button */}
            <button
              onClick={onOpenUndatedModal}
              className="flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 shadow-sm transition-all"
              title="Add product without printed expiry date"
            >
              <Plus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="hidden sm:inline">Add Manually</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* Scan Package Main CTA (Header Shortcut) */}
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all ${
                activeTab === 'scan'
                  ? 'bg-emerald-700 text-white shadow-emerald-700/25 ring-2 ring-emerald-600 ring-offset-2 dark:ring-offset-slate-900'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 hover:scale-[1.02]'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Item</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1 border-t border-slate-100 dark:border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-b-2 border-emerald-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

