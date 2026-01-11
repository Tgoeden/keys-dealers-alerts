import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('keyflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('keyflow_token');
      localStorage.removeItem('keyflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email, password, rememberMe = false) => api.post('/auth/login', { email, password, remember_me: rememberMe }),
  register: (data) => api.post('/auth/register', data),
  ownerLogin: (pin, rememberMe = false) => api.post('/auth/owner-login', { pin, remember_me: rememberMe }),
  adminPinLogin: (dealershipId, pin, rememberMe = false) => api.post('/auth/admin-pin-login', { dealership_id: dealershipId, pin, remember_me: rememberMe }),
  userPinLogin: (dealershipId, name, pin, rememberMe = false) => api.post('/auth/user-pin-login', { dealership_id: dealershipId, name, pin, remember_me: rememberMe }),
  demoLogin: () => api.post('/auth/demo-login'),
  getMe: () => api.get('/auth/me'),
  getDemoLimits: () => api.get('/demo-limits'),
  changePin: (currentPin, newPin) => api.post('/auth/change-user-pin', null, { params: { current_pin: currentPin, new_pin: newPin } }),
  changeAdminPin: (currentPin, newPin) => api.post('/auth/change-admin-pin', { current_pin: currentPin, new_pin: newPin }),
  getPublicDealerships: () => api.get('/dealerships/public'),
};

// Dealerships
export const dealershipApi = {
  getAll: () => api.get('/dealerships'),
  getOne: (id) => api.get(`/dealerships/${id}`),
  create: (data) => api.post('/dealerships', data),
  update: (id, data) => api.put(`/dealerships/${id}`, data),
  delete: (id) => api.delete(`/dealerships/${id}`),
};

// Users
export const userApi = {
  getAll: (dealershipId) => api.get('/users', { params: { dealership_id: dealershipId } }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Image upload
export const uploadApi = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  uploadImageBase64: (imageData) => api.post('/upload-image-base64', { image: imageData }),
};

// Invites
export const inviteApi = {
  getAll: (dealershipId) => api.get('/invites', { params: { dealership_id: dealershipId } }),
  create: (data) => api.post('/invites', data),
  validate: (token) => api.get(`/invites/validate/${token}`),
  accept: (data) => api.post('/invites/accept', data),
  delete: (id) => api.delete(`/invites/${id}`),
};

// Keys
export const keyApi = {
  getAll: (params) => api.get('/keys', { params }),
  getOne: (id) => api.get(`/keys/${id}`),
  create: (data) => api.post('/keys', data),
  bulkImport: (data) => api.post('/keys/bulk-import', data),
  update: (id, data) => api.put(`/keys/${id}`, data),
  checkout: (id, data) => api.post(`/keys/${id}/checkout`, data),
  return: (id, data) => api.post(`/keys/${id}/return`, data),
  moveBay: (id, newBay) => api.post(`/keys/${id}/move-bay`, { new_bay: newBay }),
  getHistory: (id) => api.get(`/keys/${id}/history`),
  markFixed: (id, data) => api.post(`/keys/${id}/mark-fixed`, data),
  addImages: (id, images) => api.post(`/keys/${id}/add-images`, images),
  // PDI Status
  updatePDIStatus: (id, status, notes) => api.put(`/keys/${id}/pdi-status`, { status, notes }),
  getPDIAuditLog: (id) => api.get(`/keys/${id}/pdi-audit-log`),
};

// PDI Audit Logs (admin)
export const pdiApi = {
  getAllLogs: (dealershipId) => api.get('/pdi-audit-log', { params: dealershipId ? { dealership_id: dealershipId } : {} }),
};

// Repair Requests
export const repairApi = {
  getAll: (status) => api.get('/repair-requests', { params: status ? { status } : {} }),
  delete: (id) => api.delete(`/repair-requests/${id}`),
};

// Checkout History
export const historyApi = {
  getAll: (dealershipId) => api.get('/checkout-history', { params: { dealership_id: dealershipId } }),
  getOverdue: () => api.get('/overdue-keys'),
};

// Time Alerts
export const alertApi = {
  getAll: (dealershipId) => api.get('/time-alerts', { params: { dealership_id: dealershipId } }),
  create: (data) => api.post('/time-alerts', data),
  update: (id, alertMinutes, isActive) => api.put(`/time-alerts/${id}`, null, { params: { alert_minutes: alertMinutes, is_active: isActive } }),
};

// Service Bays
export const bayApi = {
  getAll: (dealershipId) => api.get(`/service-bays/${dealershipId}`),
};

// Sales Tracker
export const salesApi = {
  getGoals: (params) => api.get('/sales-goals', { params }),
  createGoal: (data) => api.post('/sales-goals', data),
  updateGoal: (id, data) => api.put(`/sales-goals/${id}`, data),
  getDailyActivities: (params) => api.get('/daily-activities', { params }),
  createDailyActivity: (data) => api.post('/daily-activities', data),
  getProgress: (userId, year) => api.get(`/sales-progress/${userId}`, { params: { year } }),
  getTeamProgress: (year) => api.get('/team-sales-progress', { params: { year } }),
};

// Stats
export const statsApi = {
  getDashboard: () => api.get('/stats/dashboard'),
};

export default api;
