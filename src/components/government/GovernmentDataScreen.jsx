import React, { useState } from 'react';
import { 
  Building2, ExternalLink, ShieldCheck, Search, Filter, 
  BookOpen, FileText, AlertTriangle, Globe, Calendar, CheckCircle
} from 'lucide-react';
import { 
  getGovernmentBulletins, 
  GOV_DATA_TYPES, 
  GOV_VERIFICATION_STATUS 
} from '../../services/governmentDataService';

export function GovernmentDataScreen() {
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const bulletins = getGovernmentBulletins(selectedType, searchQuery);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      
      {/* Title Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-900/60">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-3 border border-blue-400/30">
            <Building2 className="w-3.5 h-3.5" />
            <span>Official Government & Public Safety Repository</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Government Regulations & Food Safety Advisories
          </h1>
          <p className="mt-2 text-blue-100 text-xs sm:text-sm leading-relaxed">
            Direct statutory and regulatory publications from national and international food safety authorities: 
            <strong> FSSAI (India)</strong>, <strong> U.S. FDA</strong>, <strong> USDA FSIS</strong>, and the <strong> World Health Organization (WHO)</strong>.
          </p>
        </div>
      </div>

      {/* Strict Authenticity & Provenance Disclaimer */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-200">
          <strong className="font-extrabold uppercase tracking-wider block mb-0.5">
            Strict Government Provenance Mandate
          </strong>
          Every entry below records official Source Name, Source URL, Retrieved Date, Data Type, and Verification Status. 
          Third-party materials are never represented as government information. All directives are derived directly from published statutory gazettes and orders.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search regulations by keyword, authority (FSSAI, FDA), or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Publications' },
            { id: GOV_DATA_TYPES.REGULATION, label: 'Statutory Standards' },
            { id: GOV_DATA_TYPES.ADVISORY, label: 'Government Advisories' },
            { id: GOV_DATA_TYPES.PUBLIC_ALERT, label: 'Public Alerts' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedType === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulletins Grid */}
      <div className="space-y-4">
        {bulletins.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
            No official publications found matching your search.
          </div>
        ) : (
          bulletins.map(item => (
            <div
              key={item.record_id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                      {item.jurisdiction}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      ✓ {item.verification_status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {item.record_id}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500">
                    Source Authority: <strong className="text-slate-800 dark:text-slate-200">{item.source_name}</strong>
                  </p>
                </div>

                <div className="text-right text-[11px] text-slate-400 shrink-0">
                  <div>Retrieved: <strong className="text-slate-600 dark:text-slate-300">{item.retrieved_date}</strong></div>
                  <div>Citation: <span className="font-mono text-slate-500">{item.official_citation}</span></div>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {item.summary}
              </p>

              {/* Key Directives */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Mandatory Key Directives:
                </span>
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {item.key_directives.map((dir, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{dir}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Official Source Link */}
              <div className="pt-1 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Category: <strong>{item.category}</strong>
                </span>

                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all"
                >
                  <span>Official Government Publication</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
