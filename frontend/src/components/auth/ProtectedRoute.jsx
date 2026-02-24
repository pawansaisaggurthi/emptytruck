import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const ProtectedRoute = ({ children, role }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    // Redirect to correct dashboard
    const redirectMap = {
      driver: '/driver/dashboard',
      customer: '/customer/dashboard',
      admin: '/admin/dashboard'
    };
    return <Navigate to={redirectMap[user?.role] || '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
