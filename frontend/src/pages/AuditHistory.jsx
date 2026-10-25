import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Link as LinkIcon,
  Code,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function AuditHistory({ evidenceList, selectedFileId, showToast }) {
  const [auditRecords, setAuditRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileFilter, setFileFilter] = useState(selectedFileId || 'ALL');
  const [expandedRecordKey, setExpandedRecordKey] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  useEffect(() => {
    fetchAuditTrail();
  }, []);

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    try {
      const resp = await api.getAuditTrail(100);
      if (resp.success) {
        setAuditRecords(resp.data || []);
      }
    } catch (err) {
      console.error('Failed to load audit history', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, label = 'Hash') => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    if (showToast) showToast(`${label} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return auditRecords.filter((rec) => {
      const matchesSearch = rec.filename?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFile = fileFilter === 'ALL' || rec.file_id === fileFilter;
      return matchesSearch && matchesFile;
    });
  }, [auditRecords, searchQuery, fileFilter]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Filter by Monitored File */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Filter by File:</span>
          <select
            value={fileFilter}
            onChange={(e) => setFileFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">All Evidence Files</option>
            {(evidenceList || []).map((file) => (
              <option key={file.file_id} value={file.file_id}>
                {file.filename}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">Cryptographic Hash-Linked Timeline</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Each block contains the SHA-256 fingerprint of the previous record, producing an immutable audit trail.
            </p>
          </div>
          <span className="text-xs font-mono font-medium text-slate-500">
            {filteredRecords.length} Events Logged
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span className="text-xs">Traversing S3 audit/history/ prefix...</span>
          </div>
        ) : filteredRecords.length > 0 ? (
          <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-100">
            {filteredRecords.map((record, index) => {
              const uniqueKey = record.received_at + (record.file_id || index);
              const isExpanded = expandedRecordKey === uniqueKey;

              return (
                <div key={uniqueKey} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-500 shadow-sm flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>

                  {/* Timeline Card */}
                  <div className="bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-4 transition duration-200">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center font-bold text-xs">
                          #{filteredRecords.length - index}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{record.filename}</span>
                            <StatusBadge status={record.status} />
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{new Date(record.received_at).toLocaleString()} (UTC)</span>
                          </div>
                        </div>
                      </div>

                      {/* Toggle Raw JSON Button */}
                      <button
                        onClick={() => setExpandedRecordKey(isExpanded ? null : uniqueKey)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium transition"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>{isExpanded ? 'Hide Raw JSON' : 'Inspect JSON'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Hash Blocks Linkage */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* File SHA-256 */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400">File SHA-256</span>
                          {record.sha256 && (
                            <button
                              onClick={() => handleCopy(record.sha256, 'File SHA-256')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-800 break-all">
                          {record.sha256 ? `${record.sha256.substring(0, 20)}...` : 'N/A'}
                        </div>
                      </div>

                      {/* Previous Audit Hash */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <LinkIcon className="w-3 h-3 text-blue-500" /> Prev Record Hash
                          </span>
                          {record.previous_record_hash && (
                            <button
                              onClick={() => handleCopy(record.previous_record_hash, 'Previous Audit Hash')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-700 break-all">
                          {record.previous_record_hash
                            ? `${record.previous_record_hash.substring(0, 20)}...`
                            : 'null (Genesis)'}
                        </div>
                      </div>

                      {/* Audit Record Hash */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Audit Block Hash
                          </span>
                          {record.audit_record_hash && (
                            <button
                              onClick={() => handleCopy(record.audit_record_hash, 'Audit Record Hash')}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-slate-800 break-all font-semibold">
                          {record.audit_record_hash ? `${record.audit_record_hash.substring(0, 20)}...` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Raw JSON Viewer */}
                    {isExpanded && (
                      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto shadow-inner animate-in fade-in duration-200">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[10px]">
                          <span>S3 JSON Payload from audit/history/</span>
                          <button
                            onClick={() => handleCopy(JSON.stringify(record, null, 2), 'Audit Record JSON')}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy JSON
                          </button>
                        </div>
                        <pre className="whitespace-pre">{JSON.stringify(record, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-slate-400 text-xs">
            <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No audit records found matching your filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
