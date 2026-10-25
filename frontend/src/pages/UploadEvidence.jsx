import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  File,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export default function UploadEvidence({ onUploadSuccess, setActiveTab, onSelectFileForVerify }) {
  const [file, setFile] = useState(null);
  const [customName, setCustomName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingLambda, setIsProcessingLambda] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setErrorMsg('');
    setUploadResult(null);

    // Limit check (50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setErrorMsg('File exceeds 50MB maximum upload limit.');
      return;
    }

    setFile(selectedFile);
    if (!customName) {
      setCustomName(selectedFile.name);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setIsProcessingLambda(false);
    setUploadProgress(0);
    setErrorMsg('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (customName.trim()) {
      formData.append('filename', customName.trim());
    }

    try {
      // 1. Upload to S3 incoming/ via Flask API
      const response = await api.uploadEvidence(formData, (progress) => {
        setUploadProgress(progress);
        if (progress >= 100) {
          setIsProcessingLambda(true);
        }
      });

      setUploadResult(response);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload evidence file.');
    } finally {
      setIsUploading(false);
      setIsProcessingLambda(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setCustomName('');
    setUploadResult(null);
    setErrorMsg('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Box Card */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Upload Evidence to Vault</h3>
          <p className="text-xs text-slate-500 mt-1">
            Files uploaded here land in the private S3 <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-700">incoming/</code> prefix.
            AWS Lambda automatically executes upon arrival to calculate SHA-256 and record the audit chain.
          </p>
        </div>

        {/* Drag and Drop Box */}
        {!uploadResult && (
          <form onSubmit={handleUpload} className="space-y-6">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/50'
                  : file
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                disabled={isUploading}
              />

              <div className="flex flex-col items-center justify-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  file ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-50 text-blue-600'
                }`}>
                  <UploadCloud className="w-7 h-7" />
                </div>

                {file ? (
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB — Click or drag another file to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Choose an evidence file or drag & drop it here
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Maximum size: 50MB (all digital formats supported: txt, pdf, bin, log, img, etc.)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Filename Input */}
            {file && (
              <div className="space-y-1.5 text-xs">
                <label className="font-semibold text-slate-700">Target Filename in S3</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. demo-evidence.txt"
                  disabled={isUploading}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400">
                  Tip: Uploading a file with the same name as an existing evidence file will trigger a comparison to verify if it is <span className="text-blue-600 font-semibold">UNCHANGED</span> or <span className="text-rose-600 font-semibold">MODIFIED</span>.
                </p>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Upload Progress & Lambda Waiting */}
            {isUploading && (
              <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>
                    {isProcessingLambda ? 'AWS Lambda is computing SHA-256 and classifying...' : 'Uploading to S3 incoming/ locker...'}
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isProcessingLambda ? 'bg-indigo-600 animate-pulse' : 'bg-blue-600'
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                {isProcessingLambda && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    Checking for audit record generation in S3 <code className="font-mono text-[10px]">audit/current/</code>...
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {file && !isUploading && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!file || isUploading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-2 transition"
              >
                <UploadCloud className="w-4 h-4" />
                {isUploading ? 'Ingesting Evidence...' : 'Upload & Process Evidence'}
              </button>
            </div>
          </form>
        )}

        {/* Upload Success & Result Card */}
        {uploadResult && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Evidence Successfully Ingested</h4>
                    <p className="text-xs text-slate-500">{uploadResult.message}</p>
                  </div>
                </div>
                <StatusBadge status={uploadResult.status} size="lg" />
              </div>

              {/* Forensic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Object Key</span>
                  <span className="font-mono text-slate-800 break-all">{uploadResult.key}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned File ID</span>
                  <span className="font-mono text-slate-800 break-all">{uploadResult.file_id}</span>
                </div>
              </div>

              {/* SHA-256 Preview */}
              {uploadResult.sha256 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Computed SHA-256</span>
                  <span className="font-mono text-slate-800 break-all select-all">{uploadResult.sha256}</span>
                </div>
              )}

              {/* Result Explanation */}
              <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                uploadResult.status === 'ORIGINAL'
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                  : uploadResult.status === 'UNCHANGED'
                    ? 'bg-blue-50/60 border-blue-200 text-blue-800'
                    : 'bg-rose-50/60 border-rose-200 text-rose-800 font-medium'
              }`}>
                {uploadResult.status === 'ORIGINAL' && (
                  <span>
                    <strong>First-Seen File:</strong> This file was observed for the first time by the Evidence Locker. Baseline SHA-256 fingerprint established.
                  </span>
                )}
                {uploadResult.status === 'UNCHANGED' && (
                  <span>
                    <strong>Integrity Confirmed:</strong> File SHA-256 matches the last recorded baseline. File contents are byte-for-byte identical.
                  </span>
                )}
                {uploadResult.status === 'MODIFIED' && (
                  <span>
                    <strong>Modification Detected:</strong> File SHA-256 differs from the previous upload! An audit record has been appended to document this content change.
                  </span>
                )}
              </div>
            </div>

            {/* Next Steps Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Upload Another File
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('evidence')}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                >
                  View All Evidence
                </button>
                <button
                  onClick={() => {
                    if (onSelectFileForVerify) onSelectFileForVerify(uploadResult.file_id);
                    setActiveTab('verify');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition"
                >
                  <Shield className="w-4 h-4" />
                  Verify Hash Chain
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Forensic Guarantee Notice Card */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>Forensic Integrity Protocol</span>
        </div>
        <p className="leading-relaxed text-slate-500">
          Files are deposited exclusively into the private <code className="font-mono text-slate-700 font-medium">incoming/</code> folder.
          Neither clients nor users can write directly into the <code className="font-mono text-slate-700 font-medium">audit/</code> prefixes.
          The AWS Lambda function serves as the sole authoritative signer of audit records and embeds each record's SHA-256 into a cryptographic chain.
        </p>
      </div>
    </div>
  );
}
