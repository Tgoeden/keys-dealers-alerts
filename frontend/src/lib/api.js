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
  demoLogin: () => api.post('/auth/demo-login'),
  getMe: () => api.get('/auth/me'),
  getDemoLimits: () => api.get('/demo-limits'),
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
