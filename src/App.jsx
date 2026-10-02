import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { ROLE_CONFIGS } from './services/roleService';
import { Header } from './components/common/Header';
import { NotificationBanner } from './components/common/NotificationBanner';
import { ScanScreen } from './components/scan/ScanScreen';
import { ResultsScreen } from './components/scan/ResultsScreen';
import { UndatedItemModal } from './components/scan/UndatedItemModal';
import { DashboardScreen } from './components/dashboard/DashboardScreen';
import { ScanHistoryScreen } from './components/history/ScanHistoryScreen';
import { StreaksScreen } from './components/streaks/StreaksScreen';
import { ImpactStatsScreen } from './components/stats/ImpactStatsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { RecipeAndReuseScreen } from './components/recipes/RecipeAndReuseScreen';
import { HouseholdExpiryScreen } from './components/household/HouseholdExpiryScreen';
import { BusinessModeScreen } from './components/business/BusinessModeScreen';
import { MedicineInventoryScreen } from './components/medicine/MedicineInventoryScreen';
import { DonationTraceabilityScreen } from './components/donation/DonationTraceabilityScreen';
import { RecallAndBatchHub } from './components/recalls/RecallAndBatchHub';
import { GovernmentDataScreen } from './components/government/GovernmentDataScreen';
import { OfflineStatusBar } from './components/offline/OfflineStatusBar';
import { RegionalVoiceAssistantModal } from './components/voice/RegionalVoiceAssistantModal';
import { ActiveAlarmModal } from './components/common/ActiveAlarmModal';
import { AuthModal } from './components/auth/AuthModal';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { RetailerDashboard } from './components/roles/RetailerDashboard';
import { DistributorDashboard } from './components/roles/DistributorDashboard';
import { PharmacyHospitalDashboard } from './components/roles/PharmacyHospitalDashboard';
import { ManufacturerDashboard } from './components/roles/ManufacturerDashboard';
import { AdminDashboard } from './components/roles/AdminDashboard';
import { RoleSelectorModal } from './components/roles/RoleSelectorModal';
import { ShieldAlert, CheckCircle2, Info, Sparkles, Heart } from 'lucide-react';

export function App() {
  const { toast, activeAlarmItem, dismissAlarm } = useApp();
  const { activeRole, isRoleModalOpen, setIsRoleModalOpen } = useAuth();

  // Navigation tab state - landing on Scan Item screen per Core User Flow
  const [activeTab, setActiveTab] = useState('scan'); // 'scan', 'dashboard', 'recipes', 'history', 'streaks', 'stats', 'settings', etc.

  // Automatically switch tab when role changes
  React.useEffect(() => {
    const conf = ROLE_CONFIGS[activeRole];
    if (conf && conf.defaultTab) {
      setActiveTab(conf.defaultTab);
    }
  }, [activeRole]);

  // Scan workflow state
  const [scanResult, setScanResult] = useState(null);

  // Undated item modal state
  const [undatedModalData, setUndatedModalData] = useState({ isOpen: false, data: null });

  // Auth, Onboarding and Regional Voice modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  // Handle OCR scan completion
  const handleAnalysisComplete = (result) => {
    setScanResult(result);
    setActiveTab('scan'); // Keep on scan tab which will now display ResultsScreen
  };

  // Open undated item modal
  const handleOpenUndatedModal = (initialData = null) => {
    setUndatedModalData({ isOpen: true, data: initialData });
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-800 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      
      {/* Offline / Low-Internet Mode & Resilient Queue Sync Bar */}
      <OfflineStatusBar />

      {/* Persistent Notification Banner (Expiring soon alerts based on settings) */}
      <NotificationBanner
        onSelectTab={(tab) => setActiveTab(tab)}
        onSelectItem={(item) => setActiveTab('dashboard')}
      />

      {/* Main Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'scan') setScanResult(null); // Reset scan result view if moving away
        }}
        onOpenUndatedModal={() => handleOpenUndatedModal({})}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenOnboarding={() => setIsOnboardingOpen(true)}
        onOpenVoiceAssistant={() => setIsVoiceAssistantOpen(true)}
      />


      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        
        {/* Tab 1: Scan & Add / Results Screen */}
        {activeTab === 'scan' && (
          scanResult ? (
            <ResultsScreen
              scanResult={scanResult}
              onSaveComplete={(savedItem) => {
                setScanResult(null);
                setActiveTab('dashboard');
              }}
              onRetake={() => setScanResult(null)}
            />
          ) : (
            <ScanScreen
              onAnalysisComplete={handleAnalysisComplete}
              onOpenUndatedModal={(data) => handleOpenUndatedModal(data)}
              onNavigateToRecipes={() => setActiveTab('recipes')}
            />
          )
        )}

        {/* Tab 2: Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardScreen
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
            onNavigateToRecipes={() => setActiveTab('recipes')}
            onOpenUndatedModal={() => handleOpenUndatedModal({})}
          />
        )}

        {/* Tab 2b: Household Expiry & Food Waste Reduction */}
        {activeTab === 'household' && (
          <HouseholdExpiryScreen
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
            onNavigateToRecipes={() => setActiveTab('recipes')}
          />
        )}

        {/* Role Tab: Retailer & Shopkeeper Portal */}
        {activeTab === 'retailer_dash' && (
          <RetailerDashboard
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
            onNavigateToBusiness={() => setActiveTab('business')}
          />
        )}

        {/* Role Tab: Wholesaler & Distributor Logistics */}
        {activeTab === 'distributor_dash' && (
          <DistributorDashboard
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
          />
        )}

        {/* Role Tab: Pharmacy, Clinic & Hospital Portal */}
        {activeTab === 'pharmacy_dash' && (
          <PharmacyHospitalDashboard
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
            onNavigateToMedicine={() => setActiveTab('medicine')}
          />
        )}

        {/* Role Tab: Manufacturer Master Console */}
        {activeTab === 'manufacturer_dash' && (
          <ManufacturerDashboard
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
          />
        )}

        {/* Role Tab: Platform Governance Admin Console */}
        {activeTab === 'admin_dash' && (
          <AdminDashboard
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
          />
        )}

        {/* Tab 2c: Business Mode (FEFO & Batch Inventory) */}
        {activeTab === 'business' && (
          <BusinessModeScreen />
        )}

        {/* Tab 2d: Medicine Expiry Management */}
        {activeTab === 'medicine' && (
          <MedicineInventoryScreen />
        )}

        {/* Tab 2e: Donations & Traceability */}
        {activeTab === 'donations' && (
          <DonationTraceabilityScreen />
        )}

        {/* Tab 2f: Recall Alerts, Batch Tracking & AI Waste Prediction Hub */}
        {activeTab === 'recalls_batches' && (
          <RecallAndBatchHub
            onNavigateToScan={() => {
              setScanResult(null);
              setActiveTab('scan');
            }}
          />
        )}

        {/* Tab 2g: Official Government Regulations & Food Safety Standards */}
        {activeTab === 'gov_data' && (
          <GovernmentDataScreen />
        )}

        {/* Tab 3: Recipes & Post-Expiry Actions */}
        {activeTab === 'recipes' && (
          <RecipeAndReuseScreen
            onNavigateToScan={() => setActiveTab('scan')}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {/* Tab 4: Scan History */}
        {activeTab === 'history' && (
          <ScanHistoryScreen />
        )}

        {/* Tab 4: Streaks & Badges */}
        {activeTab === 'streaks' && (
          <StreaksScreen />
        )}

        {/* Tab 5: Impact Stats */}
        {activeTab === 'stats' && (
          <ImpactStatsScreen />
        )}

        {/* Tab 6: Settings */}
        {activeTab === 'settings' && (
          <SettingsScreen />
        )}

      </main>

      {/* Undated Item Assistant Modal */}
      <UndatedItemModal
        isOpen={undatedModalData.isOpen}
        onClose={() => setUndatedModalData({ isOpen: false, data: null })}
        initialData={undatedModalData.data}
        onSaved={(item) => {
          setActiveTab('dashboard');
        }}
      />

      {/* User Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onStartOnboarding={() => {
          setIsAuthModalOpen(false);
          setIsOnboardingOpen(true);
        }}
      />


      {/* Onboarding Setup Wizard */}
      <OnboardingFlow
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleteToPantry={(item) => {
          setActiveTab('dashboard');
        }}
      />


      {/* Regional Language & Multilingual Voice Assistant Modal */}
      <RegionalVoiceAssistantModal
        isOpen={isVoiceAssistantOpen}
        onClose={() => setIsVoiceAssistantOpen(false)}
      />

      {/* Stakeholder Role Selection Modal */}
      <RoleSelectorModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />

      {/* Active Audible Expiry Alarm Modal */}
      <ActiveAlarmModal
        isOpen={!!activeAlarmItem}
        activeAlarmItem={activeAlarmItem}
        onClose={dismissAlarm}
        onNavigateToRecipes={() => setActiveTab('recipes')}
        onNavigateToItem={(item) => setActiveTab('dashboard')}
      />

      {/* Global Interactive Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
          <div className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-white border-emerald-500/50 shadow-emerald-900/20'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 text-white border-amber-500/50 shadow-amber-900/20'
              : 'bg-slate-900/90 text-white border-slate-700 shadow-slate-900/30'
          }`}>
            <span className="text-lg">{toast.icon || (toast.type === 'success' ? '✅' : 'ℹ️')}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-900 dark:text-slate-100">BiteBeforeExpiry</span>
            <span>•</span>
            <span>AI Expiry & Ingredient Scanner for Groceries and Medicines</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Offline Ready & Privacy First
            </span>
            <span>•</span>
            <button
              onClick={() => setActiveTab('settings')}
              className="hover:text-slate-800 dark:hover:text-slate-200 underline font-medium"
            >
              API Key Config
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
