import { 
  Sparkles, Flame, Plus, ShieldCheck, Moon, Sun, ScanLine, 
  LayoutDashboard, History, Award, BarChart3, Settings, ChefHat,
  User, Compass, Home, Building2, Pill, HeartHandshake, ShieldAlert,
  Mic, Landmark, Truck, Factory
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { RoleBadgeDropdown } from '../roles/RoleBadgeDropdown';

export function Header({ 
  activeTab, 
  setActiveTab, 
  onOpenUndatedModal, 
  onOpenAuthModal, 
  onOpenOnboarding,
  onOpenVoiceAssistant
}) {
  const { stats, settings, isDarkMode, toggleDarkMode } = useApp();
  const { user, isAuthenticated, activeRole } = useAuth();

  const allNavItems = [
    { id: 'scan', label: 'Scan & Add', icon: ScanLine },
    { id: 'household', label: 'Household (USE-FIRST)', icon: Home, roles: ['NORMAL_USER', 'ADMIN'] },
    { id: 'retailer_dash', label: 'Retailer Portal', icon: Building2, roles: ['SHOPKEEPER', 'ADMIN'] },
    { id: 'distributor_dash', label: activeRole === 'WHOLESALER' ? 'Wholesaler Hub' : 'Distributor Logistics', icon: Truck, roles: ['WHOLESALER', 'DISTRIBUTOR', 'ADMIN'] },
    { id: 'pharmacy_dash', label: activeRole === 'HOSPITAL' ? 'Hospital Pharmacy' : activeRole === 'CLINIC' ? 'Clinic Meds' : 'Pharmacy Portal', icon: Pill, roles: ['PHARMACY', 'CLINIC', 'HOSPITAL', 'ADMIN'] },
    { id: 'manufacturer_dash', label: 'Manufacturer Console', icon: Factory, roles: ['MANUFACTURER', 'ADMIN'] },
    { id: 'admin_dash', label: 'Governance Console', icon: ShieldCheck, roles: ['ADMIN'] },
    { id: 'dashboard', label: 'Pantry Dashboard', icon: LayoutDashboard },
    { id: 'business', label: 'FEFO Inventory', icon: Building2, roles: ['SHOPKEEPER', 'WHOLESALER', 'DISTRIBUTOR', 'MANUFACTURER', 'ADMIN'] },
    { id: 'medicine', label: 'Medicine Safety', icon: Pill, roles: ['NORMAL_USER', 'PHARMACY', 'CLINIC', 'HOSPITAL', 'ADMIN'] },
    { id: 'donations', label: 'Donations & Traceability', icon: HeartHandshake },
    { id: 'recalls_batches', label: 'Recalls & AI Risk', icon: ShieldAlert },
    { id: 'gov_data', label: 'Govt Regulations', icon: Landmark },
    { id: 'recipes', label: 'Recipes & Reuse', icon: ChefHat, roles: ['NORMAL_USER', 'ADMIN'] },
    { id: 'history', label: 'Scan History', icon: History },
    { id: 'streaks', label: 'Streaks & Badges', icon: Award, roles: ['NORMAL_USER', 'ADMIN'] },
    { id: 'stats', label: 'Impact Stats', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = allNavItems.filter(item => !item.roles || item.roles.includes(activeRole));

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

          {/* Action Center: Role Switcher + Streak badge + Voice + Theme toggle + Add item manual */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            
            {/* Stakeholder Role Badge & Quick Switcher */}
            <RoleBadgeDropdown />

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

            {/* Regional Voice Assistant Trigger */}
            <button
              onClick={onOpenVoiceAssistant}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-bold text-xs hover:border-indigo-400 transition-all shadow-xs"
              title="Regional Voice Assistant (English, हिन्दी, ଓଡ଼ିଆ, বাংলা)"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span className="hidden sm:inline">AI Voice</span>
            </button>

            {/* Setup Wizard / Onboarding Shortcut */}
            <button
              onClick={onOpenOnboarding}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800/60 bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-bold text-xs hover:border-teal-400 transition-all shadow-xs"
              title="Launch Setup Wizard (Account -> Profile -> Allergies -> First Scan -> Add to Pantry)"
            >
              <Compass className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Wizard</span>
            </button>

            {/* User Account / Auth Modal Trigger */}
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all shadow-xs"
              title="Account & Database Profile"
            >
              <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-black">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <span className="max-w-[70px] sm:max-w-[90px] truncate">{user?.name ? user.name.split(' ')[0] : 'Sign In'}</span>
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

