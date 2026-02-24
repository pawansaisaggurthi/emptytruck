import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  sendOTP: (phone) => api.post('/auth/send-otp', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/verify-otp', { phone, otp }),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password })
};

// Trips API
export const tripsAPI = {
  search: (params) => api.get('/trips/search', { params }),
  myTrips: (params) => api.get('/trips/my-trips', { params }),
  create: (data) => api.post('/trips', data),
  get: (id) => api.get(`/trips/${id}`),
  update: (id, data) => api.put(`/trips/${id}`, data),
  delete: (id) => api.delete(`/trips/${id}`)
};

// Bookings API
export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  myBookings: (params) => api.get('/bookings/my-bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  accept: (id) => api.put(`/bookings/${id}/accept`),
  reject: (id, reason) => api.put(`/bookings/${id}/reject`, { reason }),
  start: (id) => api.put(`/bookings/${id}/start`),
  complete: (id) => api.put(`/bookings/${id}/complete`),
  cancel: (id, reason) => api.put(`/bookings/${id}/cancel`, { reason })
};

// Driver API
export const driverAPI = {
  createProfile: (data) => api.post('/drivers/profile', data),
  getProfile: () => api.get('/drivers/profile'),
  getPublicProfile: (id) => api.get(`/drivers/${id}`),
  uploadDocuments: (formData) => api.post('/drivers/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  toggleOnline: () => api.put('/drivers/toggle-online')
};

// Chat API
export const chatAPI = {
  getChats: () => api.get('/chat/my-chats'),
  getMessages: (chatId, params) => api.get(`/chat/${chatId}/messages`, { params }),
  sendMessage: (chatId, data) => api.post(`/chat/${chatId}/messages`, data)
};

// Ratings API
export const ratingsAPI = {
  submit: (data) => api.post('/ratings', data),
  getUserRatings: (userId, params) => api.get(`/ratings/user/${userId}`, { params })
};

// Payments API
export const paymentsAPI = {
  createStripeIntent: (bookingId) => api.post('/payments/create-intent', { bookingId }),
  createRazorpayOrder: (bookingId) => api.post('/payments/create-razorpay-order', { bookingId }),
  verifyRazorpay: (data) => api.post('/payments/verify-razorpay', data),
  markOffline: (bookingId) => api.post('/payments/mark-offline', { bookingId })
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPendingDrivers: (params) => api.get('/admin/pending-drivers', { params }),
  approveDriver: (id) => api.put(`/admin/drivers/${id}/approve`),
  rejectDriver: (id, reason) => api.put(`/admin/drivers/${id}/reject`, { reason }),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (id, reason) => api.put(`/admin/users/${id}/suspend`, { reason }),
  unsuspendUser: (id) => api.put(`/admin/users/${id}/unsuspend`),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data)
};

// Notifications API
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all')
};
