import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import '../../styles/dashboard.css';

const NAV = {
  driver: [
    { path: '/driver/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/driver/post-trip', icon: '➕', label: 'Post Trip' },
    { path: '/driver/bookings', icon: '📋', label: 'Bookings' },
    { path: '/driver/chat', icon: '💬', label: 'Messages' },
    { path: '/driver/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/driver/settings', icon: '⚙️', label: 'Settings' },
  ],
  customer: [
    { path: '/customer/dashboard', icon: '🏠', label: 'Dashboard' },
    { path: '/customer/search', icon: '🔍', label: 'Find Trucks' },
    { path: '/customer/bookings', icon: '📦', label: 'My Bookings' },
    { path: '/customer/chat', icon: '💬', label: 'Messages' },
    { path: '/customer/notifications', icon: '🔔', label: 'Notifications' },
    { path: '/customer/settings', icon: '⚙️', label: 'Settings' },
  ],
  admin: [
    { path: '/admin/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/admin/drivers', icon: '🚛', label: 'Drivers' },
    { path: '/admin/users', icon: '👥', label: 'Users' },
    { path: '/admin/bookings', icon: '📋', label: 'Bookings' },
    { path: '/admin/settings', icon: '⚙️', label: 'Settings' },
  ],
};

export default function Layout({ role }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const nav = NAV[role] || [];
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🚛</span>
          <span className="sidebar-logo-text">EmptyTruck</span>
        </div>
        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
              <span className="sidebar-item-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="name">{user?.name?.split(' ')[0]}</div>
              <div className="role">{user?.role}</div>
            </div>
          </div>
          <button className="sidebar-item" onClick={() => { logout(); navigate('/login'); }} style={{ color: '#ef4444', marginTop: 4 }}>
            <span className="sidebar-item-icon">🚪</span>Logout
          </button>
        </div>
      </aside>
      <main className="main-content"><Outlet /></main>
    </div>
  );
}
