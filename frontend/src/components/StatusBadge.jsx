import React from 'react';
import { ShieldCheck, FileCheck2, AlertTriangle, Clock, HelpCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'sm' }) {
  const normStatus = (status || 'UNKNOWN').toUpperCase();

  const configs = {
    ORIGINAL: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: ShieldCheck,
      label: 'ORIGINAL',
      dot: 'bg-emerald-500'
    },
    UNCHANGED: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: FileCheck2,
      label: 'UNCHANGED',
      dot: 'bg-blue-500'
    },
    MODIFIED: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
      icon: AlertTriangle,
      label: 'MODIFIED',
      dot: 'bg-rose-500'
    },
    PROCESSING: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      label: 'PROCESSING',
      dot: 'bg-amber-500'
    },
    UNKNOWN: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: HelpCircle,
      label: 'UNKNOWN',
      dot: 'bg-slate-400'
    }
  };

  const current = configs[normStatus] || configs.UNKNOWN;
  const Icon = current.icon;
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-xs font-semibold' : 'px-2.5 py-0.5 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`}></span>
      <Icon className="w-3.5 h-3.5" />
      <span>{current.label}</span>
    </span>
  );
}
