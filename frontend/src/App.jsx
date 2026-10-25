import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Toast from './components/Toast';

import Overview from './pages/Overview';
import EvidenceFiles from './pages/EvidenceFiles';
import UploadEvidence from './pages/UploadEvidence';
import IntegrityVerification from './pages/IntegrityVerification';
import AuditHistory from './pages/AuditHistory';
import SystemStatus from './pages/SystemStatus';

import api from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [evidenceList, setEvidenceList] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [selectedFileId, setSelectedFileId] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadAllData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [dashResp, evidenceResp, statusResp] = await Promise.allSettled([
        api.getDashboard(),
        api.getEvidenceList(),
        api.getSystemStatus()
      ]);

      if (dashResp.status === 'fulfilled' && dashResp.value?.success) {
        setDashboardData(dashResp.value.data);
      }
      if (evidenceResp.status === 'fulfilled' && evidenceResp.value?.success) {
        setEvidenceList(evidenceResp.value.data);
      }
      if (statusResp.status === 'fulfilled' && statusResp.value?.success) {
        setSystemStatus(statusResp.value.data);
      }
    } catch (err) {
      console.error('Error fetching data from AWS:', err);
      showToast('Error synchronizing with AWS S3: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Handle selecting a file from Overview or Evidence Files for deep verification
  const handleSelectFileForVerify = (fileId) => {
    setSelectedFileId(fileId);
    setActiveTab('verify');
  };

  // Handle selecting a file for history
  const handleSelectFileForHistory = (fileId) => {
    setSelectedFileId(fileId);
    setActiveTab('history');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Dark Navy Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={{
          total_files: dashboardData?.total_files || 0,
          modified_count: dashboardData?.modified_count || 0
        }}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onRefresh={() => loadAllData(false)}
          isRefreshing={isRefreshing}
          systemStatus={systemStatus}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {activeTab === 'overview' && (
            <Overview
              dashboardData={dashboardData}
              setActiveTab={setActiveTab}
              onSelectFileForVerify={handleSelectFileForVerify}
            />
          )}

          {activeTab === 'evidence' && (
            <EvidenceFiles
              evidenceList={evidenceList}
              isLoading={isLoading}
              onSelectFileForVerify={handleSelectFileForVerify}
              onSelectFileForHistory={handleSelectFileForHistory}
              setActiveTab={setActiveTab}
              showToast={showToast}
            />
          )}

          {activeTab === 'upload' && (
            <UploadEvidence
              onUploadSuccess={() => loadAllData(true)}
              setActiveTab={setActiveTab}
              onSelectFileForVerify={handleSelectFileForVerify}
            />
          )}

          {activeTab === 'verify' && (
            <IntegrityVerification
              evidenceList={evidenceList}
              selectedFileId={selectedFileId}
              setSelectedFileId={setSelectedFileId}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'history' && (
            <AuditHistory
              evidenceList={evidenceList}
              selectedFileId={selectedFileId}
              showToast={showToast}
            />
          )}

          {activeTab === 'system' && (
            <SystemStatus
              systemStatus={systemStatus}
              isLoading={isRefreshing}
              onRefresh={() => loadAllData(false)}
            />
          )}
        </main>
      </div>

      {/* Floating Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
