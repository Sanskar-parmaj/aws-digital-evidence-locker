import React from 'react';
import { RefreshCw, Shield, AlertCircle } from 'lucide-react';

export default function Header({ activeTab, onRefresh, isRefreshing, systemStatus }) {
  const titles = {
    overview: {
      title: 'Forensics Overview',
      subtitle: 'Real-time telemetry and cryptographic file-integrity monitoring from AWS S3.'
    },
    evidence: {
      title: 'Monitored Evidence Files',
      subtitle: 'Current SHA-256 fingerprint baseline for all evidence objects.'
    },
    upload: {
      title: 'Upload Evidence to Vault',
      subtitle: 'Secure ingestion into incoming/ prefix triggering automated Lambda SHA-256 hashing.'
    },
    verify: {
      title: 'Cryptographic Integrity Verification',
      subtitle: 'Inspect audit blocks and mathematical hash chaining to detect any tampering.'
    },
    history: {
      title: 'Audit Trail & Hash Chain',
      subtitle: 'Immutable chronological ledger of all file uploads, comparisons, and states.'
    },
    system: {
      title: 'System & Cloud Diagnostics',
      subtitle: 'Live AWS connection checks, Lambda runtime configuration, and security advisory.'
    }
  };

  const current = titles[activeTab] || titles.overview;
  const isAwsConnected = systemStatus?.aws_identity?.status === 'CONNECTED';

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{current.title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* AWS Status Badge */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
          isAwsConnected
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isAwsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span>{isAwsConnected ? 'AWS Connected (ap-southeast-2)' : 'Connecting to AWS...'}</span>
        </div>

        {/* Global Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition disabled:opacity-50"
          title="Refresh real-time data from AWS S3"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}
