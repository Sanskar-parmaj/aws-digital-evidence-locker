import React from 'react';
import {
  LayoutDashboard,
  Files,
  UploadCloud,
  ShieldCheck,
  History,
  Activity,
  Lock,
  ExternalLink
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, counts = {} }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'evidence', label: 'Evidence Files', icon: Files, badge: counts.total_files },
    { id: 'upload', label: 'Upload Evidence', icon: UploadCloud },
    { id: 'verify', label: 'Integrity Verification', icon: ShieldCheck, alertCount: counts.modified_count },
    { id: 'history', label: 'Audit History', icon: History },
    { id: 'system', label: 'System Status', icon: Activity },
  ];

  return (
    <aside className="w-64 bg-[#0B132B] text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 shadow-xl select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <Lock className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base leading-tight tracking-tight">Evidence Locker</h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Forensic Vault</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Forensic Console
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {/* Badges */}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}
              {item.alertCount > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  {item.alertCount} warn
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Cloud Environment Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-[#070C1E]/50">
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-slate-300">AWS Infrastructure</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Region: <span className="text-blue-400 font-mono">ap-southeast-2</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            Bucket: <span className="text-slate-300 font-mono text-[10px]">digital-evidence-locker-...</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
