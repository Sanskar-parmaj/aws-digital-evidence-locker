import React from 'react';
import {
  Activity,
  Server,
  Cloud,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
  RefreshCw,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';

export default function SystemStatus({ systemStatus, isLoading, onRefresh }) {
  const status = systemStatus || {};
  const isApiOnline = status.api_status === 'ONLINE';
  const awsIdentity = status.aws_identity || {};
  const s3Storage = status.s3_storage || {};
  const lambdaProcessor = status.lambda_processor || {};
  const advisory = status.security_advisory || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base tracking-tight">System Infrastructure Health</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live telemetry verifying Flask API, AWS IAM STS authentication, S3 Bucket permissions, and Lambda triggers.
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          Run Health Diagnostics
        </button>
      </div>

      {/* Grid of 4 Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Flask REST API Backend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Flask REST API Service</h4>
                <p className="text-[11px] text-slate-500">Local Python Backend</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
              isApiOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isApiOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {status.api_status || 'CHECKING'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Backend Port</span>
              <span className="font-mono font-medium text-slate-800">5000</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Server Time (UTC)</span>
              <span className="font-mono text-slate-800 text-[11px]">{status.server_time || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">CORS Support</span>
              <span className="font-mono text-emerald-600 font-semibold">Enabled (React Frontend)</span>
            </div>
          </div>
        </div>

        {/* 2. AWS IAM & STS Authentication */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">AWS IAM Authentication</h4>
                <p className="text-[11px] text-slate-500">STS Caller Identity</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
              awsIdentity.status === 'CONNECTED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${awsIdentity.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              {awsIdentity.status || 'CHECKING'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">AWS Account ID</span>
              <span className="font-mono font-medium text-slate-800">{awsIdentity.account_id || 'N/A'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Target Region</span>
              <span className="font-mono text-blue-600 font-semibold">{status.region || 'ap-southeast-2'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">IAM ARN</span>
              <span className="font-mono text-slate-700 text-[10px] truncate max-w-[200px]" title={awsIdentity.arn}>
                {awsIdentity.arn || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Amazon S3 Storage */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Amazon S3 Evidence Vault</h4>
                <p className="text-[11px] text-slate-500">Object Storage & Prefixes</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
              s3Storage.status === 'HEALTHY'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s3Storage.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {s3Storage.status || 'CHECKING'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">S3 Bucket Name</span>
              <span className="font-mono font-medium text-slate-800 truncate max-w-[200px]" title={s3Storage.bucket_name}>
                {s3Storage.bucket_name || 'N/A'}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Access Policy</span>
              <span className="font-medium text-slate-800">Private (Public Access Blocked)</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Configured Prefixes</span>
              <span className="font-mono text-slate-700 text-[11px]">incoming/, audit/</span>
            </div>
          </div>
        </div>

        {/* 4. AWS Lambda Processor */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">AWS Lambda Processor</h4>
                <p className="text-[11px] text-slate-500">Serverless SHA-256 Engine</p>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${
              lambdaProcessor.status === 'ACTIVE'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${lambdaProcessor.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-blue-500'}`}></span>
              {lambdaProcessor.status || 'CHECKING'}
            </span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Function Name</span>
              <span className="font-mono font-medium text-slate-800">{lambdaProcessor.function_name || 'DigitalEvidenceProcessor'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Runtime</span>
              <span className="font-mono text-slate-800">{lambdaProcessor.runtime || 'python3.12'}</span>
            </div>
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500">Event Trigger</span>
              <span className="font-mono text-slate-700 text-[11px]">s3:ObjectCreated:* (incoming/)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Security & Legal Advisory */}
      <div className="bg-slate-900 text-slate-300 p-6 sm:p-8 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-base">Forensics Integrity & Chain of Custody Security Model</h4>
            <p className="text-xs text-slate-400">Cryptographic guarantees and practical cloud limitations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>What The Locker Guarantees</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Every file uploaded is fingerprinted with streamed SHA-256. The generated audit records form a cryptographically-linked chain where altering any past record breaks the hash sequence for every subsequent entry, making retroactive tampering mathematically evident.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>Cloud Admin & Legal Boundaries</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The audit trail is tamper-evident, but not immune to AWS root account administrators who hold permissions to purge S3 versioning or reconfigure Lambda triggers. Cryptographic hash chaining supports integrity verification, but legal chain-of-custody compliance additionally requires locked IAM policies, S3 Object Lock (WORM), and CloudTrail log validation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
