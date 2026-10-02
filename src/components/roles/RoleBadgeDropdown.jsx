import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PLATFORM_ROLES, ROLE_CONFIGS, SEEDED_ORGANIZATIONS } from '../../services/roleService';
import { ChevronDown, Check, ShieldCheck, Building2, User, Sparkles } from 'lucide-react';

export function RoleBadgeDropdown() {
  const { activeRole, activeOrganization, switchRole, setIsRoleModalOpen } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentConfig = ROLE_CONFIGS[activeRole] || ROLE_CONFIGS[PLATFORM_ROLES.NORMAL_USER];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRole = (roleKey) => {
    switchRole(roleKey);
    setIsOpen(false);
  };

  const getBadgeColor = (color) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'indigo':
        return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'purple':
        return 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'teal':
        return 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800';
      case 'cyan':
        return 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
      case 'rose':
        return 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'amber':
        return 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'slate':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs hover:shadow-sm ${getBadgeColor(
          currentConfig.color
        )}`}
        title={`Active Role: ${currentConfig.label} (${activeOrganization?.name || 'Default'})`}
      >
        <span className="text-sm select-none">{currentConfig.icon}</span>
        <div className="text-left hidden sm:block">
          <div className="leading-tight font-extrabold">{currentConfig.label}</div>
          <div className="text-[10px] opacity-75 font-normal truncate max-w-[110px]">
            {activeOrganization?.name || 'Personal'}
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Switch Ecosystem Role
              </span>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsRoleModalOpen(true);
                }}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Role Guide
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              The platform dynamically adapts dashboards, permissions, and navigation for each stakeholder.
            </p>
          </div>

          <div className="py-1">
            {Object.keys(ROLE_CONFIGS).map((roleKey) => {
              const conf = ROLE_CONFIGS[roleKey];
              const isSelected = activeRole === roleKey;
              const org = SEEDED_ORGANIZATIONS.find(o => o.role === roleKey);

              return (
                <button
                  key={roleKey}
                  onClick={() => handleSelectRole(roleKey)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${
                    isSelected ? 'bg-slate-50/80 dark:bg-slate-800/50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-xl p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {conf.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">
                          {conf.label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {conf.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {org?.name || 'Default Organization'}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mr-1" />
              Role-Based Access Control Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
