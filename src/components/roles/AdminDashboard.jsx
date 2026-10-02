import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/dbService';
import { useAuth } from '../../context/AuthContext';
import { PLATFORM_ROLES, ROLE_CONFIGS, SEEDED_ORGANIZATIONS } from '../../services/roleService';
import { 
  ShieldCheck, Users, Building2, Activity, ShieldAlert, 
  Search, Filter, Clock, FileText, CheckCircle2, AlertTriangle, RefreshCw
} from 'lucide-react';

export function AdminDashboard({ onNavigateToScan }) {
  const { activeOrganization } = useAuth();
  const [organizations, setOrganizations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  useEffect(() => {
    async function loadAdminData() {
      try {
        const orgs = await dbService.getOrganizations();
        const logs = await dbService.getAuditLogs(50);
        setOrganizations(orgs);
        setAuditLogs(logs);
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAdminData();
  }, []);

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = (org.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (org.identifier || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedRoleFilter !== 'ALL' && org.role !== selectedRoleFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🛡️</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-300 border border-slate-400/30">
                System Governance Console
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                Cross-Role Oversight Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              BiteBeforeExpiry Platform Administration
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Cross-organizational governance, security audit logs, multi-tenant role authorization, and statutory regulatory compliance verification across the entire food and medicine supply chain.
            </p>
          </div>
        </div>
      </div>

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stakeholder Orgs</span>
            <Building2 className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {organizations.length}
            </span>
            <span className="text-xs text-slate-500">active entities</span>
          </div>
          <div className="mt-1 text-[11px] text-indigo-600 font-semibold">
            All 9 platform roles represented
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Trail Logs</span>
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {auditLogs.length}
            </span>
            <span className="text-xs text-slate-500">recent actions</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Immutable operation logs
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ecosystem Roles</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
              9
            </span>
            <span className="text-xs text-slate-500">distinct tiers</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-500 font-semibold">
            Household to Manufacturer
          </div>
        </div>

        <div className="bg-white dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Regulatory Sync</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              100%
            </span>
            <span className="text-xs text-slate-500">compliant</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            FSSAI, FDA, USDA FSIS, WHO
          </div>
        </div>
      </div>

      {/* Organizations Directory */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏢</span>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Registered Multi-Tenant Stakeholder Organizations
            </h2>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold"
            >
              <option value="ALL">All Roles ({organizations.length})</option>
              {Object.keys(ROLE_CONFIGS).map(rk => (
                <option key={rk} value={rk}>{ROLE_CONFIGS[rk].label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Organization Name</th>
                <th className="px-4 py-3">Role & Tier</th>
                <th className="px-4 py-3">Identifier</th>
                <th className="px-4 py-3">Address / Region</th>
                <th className="px-4 py-3">Contact Email</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredOrgs.map((org, i) => {
                const conf = ROLE_CONFIGS[org.role] || {};
                return (
                  <tr key={org.id || i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span>{conf.icon || '🏢'}</span>
                      <span>{org.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {conf.label || org.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">
                      {org.identifier}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {org.address}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {org.contact_email}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                        {org.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📜</span>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              System Audit Trail & Security Events
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Real-time compliance activity
          </span>
        </div>

        <div className="space-y-2">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No audit events logged yet.</div>
          ) : (
            auditLogs.slice(0, 10).map((log, idx) => (
              <div key={log.id || idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {log.action_type}
                  </span>
                  <div>
                    <span className="font-extrabold text-slate-900 dark:text-white">{log.role}</span>
                    <span className="mx-1 text-slate-400">•</span>
                    <span className="text-slate-600 dark:text-slate-400">{JSON.stringify(log.details)}</span>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
