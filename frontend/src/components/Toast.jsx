import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
      isSuccess
        ? 'bg-slate-900 text-white border-slate-800'
        : 'bg-rose-900 text-white border-rose-800'
    }`}>
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
      )}
      <span className="text-xs font-medium">{message}</span>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white ml-2 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
