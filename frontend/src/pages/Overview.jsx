import React from 'react';
import {
  Files,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  UploadCloud,
  ShieldAlert,
  ArrowRight,
  Database,
  Cpu,
  Link as LinkIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import StatusBadge from '../components/StatusBadge';

export default function Overview({ dashboardData, setActiveTab, onSelectFileForVerify }) {
  const data = dashboardData || {
    total_files: 0,
    original_count: 0,
    unchanged_count: 0,
    modified_count: 0,
    status_distribution: [],
    recent_activity: []
  };

  const chartData = (data.status_distribution || []).filter(item => item.value > 0);
  const hasData = chartData.length > 0;

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Monitored */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monitored Evidence</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.total_files}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Unique files tracked in S3</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Files className="w-6 h-6" />
          </div>
        </div>

        {/* Original */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Original Records</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{data.original_count}</h3>
            <p className="text-[11px] text-slate-400 mt-1">First-time baseline files</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Unchanged */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unchanged Files</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{data.unchanged_count}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Identical hash re-uploads</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Modified / Warnings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Integrity Alerts</p>
            <h3 className={`text-2xl font-bold mt-1 ${data.modified_count > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {data.modified_count}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Files with changed content</p>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            data.modified_count > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'
          }`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Integrity Distribution</h3>
            <p className="text-xs text-slate-500 mt-0.5">Classification ratio across evidence vault</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-2">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} file(s)`, 'Count']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(val) => <span className="text-xs font-medium text-slate-600">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No evidence files recorded yet
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>S3 Bucket Target</span>
            <span className="font-mono text-slate-700 font-medium truncate max-w-[170px]" title={data.bucket_name}>
              {data.bucket_name || 'Detecting...'}
            </span>
          </div>
        </div>

        {/* How The Evidence Locker Works (Architecture Infographic) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Forensic Architecture & Hash Chain</h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated serverless pipeline with cryptographic verification</p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-mono font-semibold border border-blue-200">
                SHA-256 + Chain
              </span>
            </div>

            {/* Pipeline Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs mb-3">
                  01
                </div>
                <h4 className="text-xs font-bold text-slate-800">1. S3 Upload</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  File lands in <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">incoming/</code>, triggering an <code className="font-mono text-[10px]">ObjectCreated</code> event.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mb-3">
                  02
                </div>
                <h4 className="text-xs font-bold text-slate-800">2. Lambda Stream</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Streams file in 1MB chunks to calculate SHA-256 and compares against previous state.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mb-3">
                  03
                </div>
                <h4 className="text-xs font-bold text-slate-800">3. Hash-Linked Ledger</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Records tamper-evident block linking <code className="font-mono text-[10px]">previous_record_hash</code> in history.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500">Need to ingest or inspect evidence?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('upload')}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Evidence
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
              >
                View Evidence
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Recent Forensic Activity</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest chronological events processed by the locker</p>
          </div>
          <button
            onClick={() => setActiveTab('history')}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Full Audit Trail <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-6">Timestamp (UTC)</th>
                <th className="py-3 px-6">File Name</th>
                <th className="py-3 px-6">Size</th>
                <th className="py-3 px-6">Integrity Status</th>
                <th className="py-3 px-6">SHA-256 Hash</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.recent_activity && data.recent_activity.length > 0 ? (
                data.recent_activity.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      {item.received_at ? new Date(item.received_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 font-medium text-slate-900">
                      {item.filename}
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                      {formatBytes(item.size)}
                    </td>
                    <td className="py-3.5 px-6">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      {item.sha256 ? `${item.sha256.substring(0, 16)}...` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => {
                          if (onSelectFileForVerify) onSelectFileForVerify(item.file_id);
                          setActiveTab('verify');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                      >
                        Verify <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No recent evidence activity found in audit records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
