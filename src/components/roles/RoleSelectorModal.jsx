import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PLATFORM_ROLES, ROLE_CONFIGS, SEEDED_ORGANIZATIONS } from '../../services/roleService';
import { 
  X, Check, ShieldCheck, ArrowRight, User, ShoppingBag, 
  Truck, Building2, Pill, Activity, Stethoscope, Factory, ShieldAlert
} from 'lucide-react';

export function RoleSelectorModal({ isOpen, onClose }) {
  const { activeRole, switchRole } = useAuth();

  if (!isOpen) return null;

  const handleSelectRole = (roleKey) => {
    switchRole(roleKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">🌐</span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                BiteBeforeExpiry Role & Stakeholder System
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select your organization type to tailor dashboards, FEFO algorithms, batch workflows, and permissions.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Roles Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(ROLE_CONFIGS).map((roleKey) => {
            const conf = ROLE_CONFIGS[roleKey];
            const isSelected = activeRole === roleKey;
            const org = SEEDED_ORGANIZATIONS.find(o => o.role === roleKey);

            return (
              <div
                key={roleKey}
                onClick={() => handleSelectRole(roleKey)}
                className={`cursor-pointer rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-3 inline-block">
                      {conf.icon}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <Check className="w-3 h-3" />
                        <span>Active Role</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {conf.label}
                  </h3>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {org?.name || 'Standard Profile'}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    {conf.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    {conf.category}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole(roleKey);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{isSelected ? 'Current' : 'Switch'}</span>
                    {!isSelected && <ArrowRight className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Strict privacy: Household data is completely isolated from commercial accounts.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
