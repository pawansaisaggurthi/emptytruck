import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

// Pages - Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Pages - Driver
import DriverDashboard from './pages/driver/DriverDashboard';
import DriverProfile from './pages/driver/DriverProfile';
import PostTrip from './pages/driver/PostTrip';
import DriverBookings from './pages/driver/DriverBookings';
import DriverOnboarding from './pages/driver/DriverOnboarding';

// Pages - Customer
import CustomerDashboard from './pages/customer/CustomerDashboard';
import SearchTrips from './pages/customer/SearchTrips';
import CustomerBookings from './pages/customer/CustomerBookings';
import DriverDetail from './pages/customer/DriverDetail';

// Pages - Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDrivers from './pages/admin/AdminDrivers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSettings from './pages/admin/AdminSettings';

// Pages - Shared
import ChatPage from './pages/shared/ChatPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ProfileSettings from './pages/shared/ProfileSettings';
import BookingDetail from './pages/shared/BookingDetail';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';

// Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/shared/Layout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1
    }
  }
});

function App() {
  const { initialize, isInitialized } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="loading-truck">🚛</div>
        <div className="loading-text">Loading EmptyTruck...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1a2e',
              color: '#e2e8f0',
              border: '1px solid #2d3748',
              borderRadius: '12px',
              fontFamily: "'Syne', sans-serif"
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } }
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Driver Routes */}
          <Route path="/driver" element={
            <ProtectedRoute role="driver">
              <Layout role="driver" />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/driver/dashboard" replace />} />
            <Route path="dashboard" element={<DriverDashboard />} />
            <Route path="onboarding" element={<DriverOnboarding />} />
            <Route path="profile" element={<DriverProfile />} />
            <Route path="post-trip" element={<PostTrip />} />
            <Route path="bookings" element={<DriverBookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:chatId" element={<ChatPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>

          {/* Customer Routes */}
          <Route path="/customer" element={
            <ProtectedRoute role="customer">
              <Layout role="customer" />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/customer/dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="search" element={<SearchTrips />} />
            <Route path="driver/:id" element={<DriverDetail />} />
            <Route path="bookings" element={<CustomerBookings />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:chatId" element={<ChatPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<ProfileSettings />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <Layout role="admin" />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
