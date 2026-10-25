import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Link as LinkIcon,
  FileText,
  Info,
  Clock,
  ArrowRight
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function IntegrityVerification({
  evidenceList,
  selectedFileId,
  setSelectedFileId,
  setActiveTab
}) {
  const [currentFileId, setCurrentFileId] = useState(selectedFileId || '');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Set default file if available and none selected
  useEffect(() => {
    if (!currentFileId && evidenceList && evidenceList.length > 0) {
      setCurrentFileId(evidenceList[0].file_id);
    }
  }, [evidenceList, currentFileId]);

  // When selectedFileId prop changes, update currentFileId
  useEffect(() => {
    if (selectedFileId) {
      setCurrentFileId(selectedFileId);
    }
  }, [selectedFileId]);

  // Run verification when currentFileId changes
  useEffect(() => {
    if (currentFileId) {
      handleRunVerification(currentFileId);
    }
  }, [currentFileId]);

  const handleRunVerification = async (fileId) => {
    if (!fileId) return;
    setIsVerifying(true);
    setErrorMsg('');
    try {
      const resp = await api.verifyEvidence(fileId);
      if (resp.success) {
        setVerificationResult(resp.data);
      } else {
        setErrorMsg(resp.error || 'Verification query failed.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error executing cryptographic verification on AWS.');
    } finally {
      setIsVerifying(false);
    }
  };

  const selectedEvidence = (evidenceList || []).find(f => f.file_id === currentFileId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* File Selector Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Select Evidence to Inspect
          </label>
          <div className="flex items-center gap-2">
            <select
              value={currentFileId}
              onChange={(e) => {
                setCurrentFileId(e.target.value);
                if (setSelectedFileId) setSelectedFileId(e.target.value);
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[280px]"
            >
              {(evidenceList || []).map((file) => (
                <option key={file.file_id} value={file.file_id}>
                  {file.filename} ({file.status})
                </option>
              ))}
            </select>

            <button
              onClick={() => handleRunVerification(currentFileId)}
              disabled={isVerifying || !currentFileId}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition disabled:opacity-50"
              title="Re-run cryptographic verification"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {selectedEvidence && (
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Current State</span>
              <StatusBadge status={selectedEvidence.status} size="lg" />
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verification Results View */}
      {isVerifying ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-sm text-center">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h4 className="font-bold text-slate-900 text-sm">Verifying Cryptographic Signatures...</h4>
          <p className="text-xs text-slate-500 mt-1">
            Fetching history blocks from S3, calculating SHA-256 over record contents, and traversing previous_record_hash chain.
          </p>
        </div>
      ) : verificationResult ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Verdict Header Card */}
          <div className={`p-6 rounded-2xl border shadow-sm ${
            verificationResult.verdict === 'AUDIT_TAMPERED'
              ? 'bg-rose-50/70 border-rose-300 text-rose-900'
              : verificationResult.status === 'MODIFIED'
                ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                : 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  verificationResult.verdict === 'AUDIT_TAMPERED'
                    ? 'bg-rose-100 text-rose-700'
                    : verificationResult.status === 'MODIFIED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {verificationResult.verdict === 'AUDIT_TAMPERED' ? (
                    <XCircle className="w-6 h-6" />
                  ) : verificationResult.status === 'MODIFIED' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base tracking-tight">
                      {verificationResult.verdict === 'AUDIT_TAMPERED'
                        ? 'CRITICAL: Audit Record Tampering Detected'
                        : verificationResult.status === 'MODIFIED'
                          ? 'Integrity Alert: File Content Modification Detected'
                          : 'Integrity Verified: File & Audit Chain Authentic'}
                    </h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white/70 border border-current">
                      {verificationResult.verdict}
                    </span>
                  </div>
                  <p className="text-xs mt-1.5 leading-relaxed opacity-90 max-w-2xl">
                    {verificationResult.explanation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Educational Forensics Advisory Banner */}
          <div className="bg-blue-50/60 p-5 rounded-2xl border border-blue-200/80 text-xs text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-950">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Forensics Note: File Modification vs. Audit Trail Tampering</span>
            </div>
            <p className="leading-relaxed text-blue-800">
              In digital forensics, a file classified as <strong className="font-semibold text-rose-700">MODIFIED</strong> is <strong>not</strong> an invalid audit record.
              It means the monitored file itself changed content between uploads. The Digital Evidence Locker did its job by detecting the modification and recording an authentic, tamper-evident audit block into the historical ledger.
              Conversely, <strong>Audit Tampering</strong> occurs only if someone illegitimately alters the stored JSON audit records, breaking the mathematical hash chain.
            </p>
          </div>

          {/* Cryptographic Hash Verification Checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Check 1: Record Hash Recomputation */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${verificationResult.is_record_authentic ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Audit Record Hash Match</span>
                </div>
                {verificationResult.is_record_authentic ? (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                  </span>
                ) : (
                  <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Fail
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Live SHA-256 recomputed over the 10 sorted JSON fields matches the authoritative stored audit hash.
              </p>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[10px] space-y-1.5 break-all">
                <div>
                  <span className="text-slate-400 font-bold block">Stored:</span>
                  <span className="text-slate-700">{verificationResult.stored_audit_hash}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Computed:</span>
                  <span className="text-slate-700">{verificationResult.computed_audit_hash}</span>
                </div>
              </div>
            </div>

            {/* Check 2: Hash Chain Continuity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${verificationResult.is_chain_valid ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Chain Continuity</span>
                </div>
                {verificationResult.is_chain_valid ? (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pass ({verificationResult.chain_length} Blocks)
                  </span>
                ) : (
                  <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Broken Link
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Every historical record embeds the exact <code className="font-mono text-[10px]">audit_record_hash</code> of the preceding block, verifying chronological integrity.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] flex items-center justify-between">
                <span className="text-slate-500">Total Audit Blocks:</span>
                <span className="font-mono font-bold text-slate-800">{verificationResult.chain_length}</span>
              </div>
            </div>
          </div>

          {/* Historical Summary Blocks Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs tracking-tight">Audit Chain Ledger Summary</h4>
                <p className="text-[11px] text-slate-500">Chronological history for this specific evidence file</p>
              </div>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                Inspect Visual Timeline <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-6">Block #</th>
                    <th className="py-2.5 px-6">Received Timestamp</th>
                    <th className="py-2.5 px-6">Status</th>
                    <th className="py-2.5 px-6">File Content SHA-256</th>
                    <th className="py-2.5 px-6">Audit Record Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {verificationResult.history_summary && verificationResult.history_summary.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-3 px-6 font-mono font-bold text-slate-900">
                        #{i + 1}
                      </td>
                      <td className="py-3 px-6 font-mono text-[11px] text-slate-500">
                        {new Date(h.received_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-6">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="py-3 px-6 font-mono text-[11px] text-slate-600">
                        {h.sha256 ? `${h.sha256.substring(0, 16)}...` : 'N/A'}
                      </td>
                      <td className="py-3 px-6 font-mono text-[11px] text-slate-600">
                        {h.audit_record_hash ? `${h.audit_record_hash.substring(0, 16)}...` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
