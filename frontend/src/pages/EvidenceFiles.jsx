import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Copy,
  Check,
  Eye,
  ShieldAlert,
  FileText,
  Calendar,
  HardDrive,
  X,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function EvidenceFiles({
  evidenceList,
  isLoading,
  onSelectFileForVerify,
  onSelectFileForHistory,
  setActiveTab,
  showToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('received_at'); // 'received_at' or 'filename'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [selectedFile, setSelectedFile] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleCopy = (text, label = 'SHA-256 Hash') => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    if (showToast) showToast(`${label} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Filter & Sort
  const filteredRecords = useMemo(() => {
    return (evidenceList || []).filter((item) => {
      const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (sortBy === 'filename') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      } else {
        return sortOrder === 'asc'
          ? new Date(valA) - new Date(valB)
          : new Date(valB) - new Date(valA);
      }
    });
  }, [evidenceList, searchQuery, statusFilter, sortBy, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search evidence by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            {['ALL', 'ORIGINAL', 'UNCHANGED', 'MODIFIED'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === tab
                    ? 'bg-white text-slate-900 font-bold shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => {
              if (sortBy === 'received_at') {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
              } else {
                setSortBy('received_at');
                setSortOrder('desc');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort: {sortBy === 'received_at' ? 'Date' : 'Name'} ({sortOrder})</span>
          </button>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-6">Filename</th>
                <th className="py-3.5 px-6">Size</th>
                <th className="py-3.5 px-6">Content-Type</th>
                <th className="py-3.5 px-6">Last Observed</th>
                <th className="py-3.5 px-6">Integrity Status</th>
                <th className="py-3.5 px-6">SHA-256 Fingerprint</th>
                <th className="py-3.5 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Retrieving evidence baseline from S3...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((item, idx) => (
                  <tr key={item.file_id || idx} className="hover:bg-slate-50/70 transition group">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">{item.filename}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[150px]">
                            ID: {item.file_id?.substring(0, 12)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      {formatBytes(item.size)}
                    </td>

                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                      {item.content_type || 'unknown'}
                    </td>

                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      {item.received_at ? new Date(item.received_at).toLocaleString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-6">
                      <StatusBadge status={item.status} />
                    </td>

                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                          {item.sha256 ? `${item.sha256.substring(0, 16)}...` : 'N/A'}
                        </span>
                        {item.sha256 && (
                          <button
                            onClick={() => handleCopy(item.sha256)}
                            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                            title="Copy full SHA-256"
                          >
                            {copiedHash === item.sha256 ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setSelectedFile(item)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No evidence records matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Evidence Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedFile.filename}</h3>
                  <p className="text-xs text-slate-500 font-mono">Current Audit Pointer</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-medium text-slate-700">Integrity Classification</span>
                <StatusBadge status={selectedFile.status} size="lg" />
              </div>

              {/* S3 Key & Identifiers */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">S3 Key</span>
                  <span className="font-mono text-slate-800 break-all">{selectedFile.key}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">File ID (SHA-256 of Key)</span>
                  <span className="font-mono text-slate-800 break-all">{selectedFile.file_id}</span>
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">File Size</span>
                  <span className="font-mono font-medium text-slate-800">{formatBytes(selectedFile.size)} ({selectedFile.size} B)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">MIME Type</span>
                  <span className="font-mono text-slate-800">{selectedFile.content_type}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Timestamp</span>
                  <span className="font-mono text-slate-800">{new Date(selectedFile.received_at).toLocaleString()}</span>
                </div>
              </div>

              {/* SHA-256 Fingerprint */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">File SHA-256 Hash</span>
                  <button
                    onClick={() => handleCopy(selectedFile.sha256, 'File SHA-256')}
                    className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-all select-all">
                  {selectedFile.sha256}
                </div>
              </div>

              {/* Hash Chain Records */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="font-semibold text-slate-900 text-xs">Cryptographic Hash Linkage</div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Previous Audit Hash</span>
                    {selectedFile.previous_record_hash && (
                      <button
                        onClick={() => handleCopy(selectedFile.previous_record_hash, 'Previous Audit Hash')}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    )}
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                    {selectedFile.previous_record_hash || 'null (Initial record in hash chain)'}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Audit Record Hash</span>
                    <button
                      onClick={() => handleCopy(selectedFile.audit_record_hash, 'Audit Record Hash')}
                      className="text-blue-600 hover:text-blue-800 text-[11px] font-medium flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 break-all">
                    {selectedFile.audit_record_hash || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  if (onSelectFileForHistory) onSelectFileForHistory(selectedFile.file_id);
                  setActiveTab('history');
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium transition"
              >
                View History Chain
              </button>

              <button
                onClick={() => {
                  if (onSelectFileForVerify) onSelectFileForVerify(selectedFile.file_id);
                  setActiveTab('verify');
                  setSelectedFile(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition"
              >
                <ShieldAlert className="w-4 h-4" />
                Run Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
