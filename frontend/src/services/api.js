import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
  }
});

// Response interceptor for consistent error unwrapping
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Unknown network error';
    return Promise.reject(new Error(errorMsg));
  }
);

export const api = {
  getHealth: () => apiClient.get('/health'),
  getDashboard: () => apiClient.get('/dashboard'),
  getEvidenceList: (params) => apiClient.get('/evidence', { params }),
  getEvidenceDetail: (fileId) => apiClient.get(`/evidence/${fileId}`),
  getEvidenceHistory: (fileId) => apiClient.get(`/evidence/${fileId}/history`),
  verifyEvidence: (fileId) => apiClient.post(`/evidence/${fileId}/verify`),
  uploadEvidence: (formData, onProgress) => {
    return apiClient.post('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
  },
  getAuditTrail: (limit = 50) => apiClient.get('/audit', { params: { limit } }),
  getSystemStatus: () => apiClient.get('/system/status')
};

export default api;
