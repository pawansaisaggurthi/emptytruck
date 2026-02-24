import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { notificationsAPI } from '../../services/api';
import socketService from '../../services/socket';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Truck, Search, BookOpen, MessageSquare,
  Bell, Settings, LogOut, Menu, X, User, ChevronDown,
  Users, Shield, BarChart3, Plus, Star, TrendingUp, Zap
} from 'lucide-react';

const navItems = {
  driver: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/driver/dashboard' },
    { icon: Plus, label: 'Post a Trip', path: '/driver/post-trip' },
    { icon: BookOpen, label: 'Bookings', path: '/driver/bookings' },
    { icon: MessageSquare, label: 'Messages', path: '/driver/chat' },
    { icon: User, label: 'My Profile', path: '/driver/profile' },
    { icon: Settings, label: 'Settings', path: '/driver/settings' },
  ],
  customer: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/customer/dashboard' },
    { icon: Search, label: 'Find Trucks', path: '/customer/search' },
    { icon: BookOpen, label: 'My Bookings', path: '/customer/bookings' },
    { icon: MessageSquare, label: 'Messages', path: '/customer/chat' },
    { icon: Settings, label: 'Settings', path: '/customer/settings' },
  ],
  admin: [
    { icon: BarChart3, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Truck, label: 'Driver Approvals', path: '/admin/drivers' },
    { icon: Users, label: 'All Users', path: '/admin/users' },
    { icon: BookOpen, label: 'Bookings', path: '/admin/bookings' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ]
};

const roleColors = {
  driver: { bg: 'rgba(249, 115, 22, 0.1)', text: '#F97316', label: 'Driver' },
  customer: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', label: 'Customer' },
  admin: { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', label: 'Admin' }
};

export default function Layout({ role }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const items = navItems[role] || [];
  const roleConfig = roleColors[role] || roleColors.customer;

  useEffect(() => {
    // Fetch unread notification count
    notificationsAPI.getAll({ unread: true }).then(res => {
      setUnreadCount(res.data.unreadCount || 0);
    }).catch(() => {});

    // Listen for new notifications
    const handleNotification = (notification) => {
      setUnreadCount(prev => prev + 1);
      toast(notification.title, {
        icon: '🔔',
        duration: 4000
      });
    };

    socketService.on('notification', handleNotification);
    return () => socketService.off('notification', handleNotification);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 40, display: 'none'
          }}
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        width: 'var(--sidebar-width)',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, bottom: 0, left: 0,
        zIndex: 50,
        transition: 'transform 0.3s ease',
        transform: sidebarOpen ? 'translateX(0)' : undefined
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: 40, height: 40,
            background: 'var(--gradient-brand)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem'
          }}>🚛</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
              EmptyTruck
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Connect
            </div>
          </div>
        </div>

        {/* User Info */}
        <div style={{
          padding: '16px',
          margin: '12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {user?.avatar?.url ? (
            <img src={user.avatar.url} alt={user.name} className="avatar avatar-md" />
          ) : (
            <div className="avatar-placeholder avatar-md" style={{ fontSize: '0.9rem' }}>
              {getInitials(user?.name)}
            </div>
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <span className="badge" style={{ background: roleConfig.bg, color: roleConfig.text, border: 'none', fontSize: '0.65rem', padding: '2px 8px', marginTop: '2px' }}>
              {roleConfig.label}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '4px', padding: '0 8px', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Navigation
          </div>
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                color: isActive ? '#F97316' : 'var(--text-secondary)',
                background: isActive ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(249, 115, 22, 0.2)' : 'transparent'}`,
                fontFamily: 'var(--font-display)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                marginBottom: '2px',
                textDecoration: 'none',
                transition: 'all 0.15s ease',
                position: 'relative'
              })}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={16} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.label === 'Messages' && unreadCount > 0 && !isActive && (
                    <span style={{
                      background: 'var(--brand-orange)',
                      color: 'white',
                      borderRadius: '999px',
                      fontSize: '0.65rem',
                      padding: '1px 6px',
                      fontWeight: 700
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                  {isActive && (
                    <div style={{
                      width: 3, height: 20,
                      background: 'var(--brand-orange)',
                      borderRadius: 2,
                      position: 'absolute',
                      right: -12
                    }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Notifications + Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
          <NavLink to={`/${role}/notifications`} onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: '0.88rem', marginBottom: '4px', transition: 'all 0.15s ease', position: 'relative' }}
          className="nav-hover">
            <Bell size={16} />
            <span style={{ flex: 1 }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{ background: 'var(--error)', color: 'white', borderRadius: '999px', fontSize: '0.65rem', padding: '1px 6px', fontWeight: 700 }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              color: 'var(--error)', background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.88rem',
              cursor: 'pointer', width: '100%', transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-width)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Top Header */}
        <header style={{
          height: 'var(--header-height)',
          background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          gap: '16px',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              display: 'none',
              background: 'none', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px'
            }}
            className="mobile-menu-btn"
          >
            <Menu size={20} />
          </button>

          {/* Page title (dynamic) */}
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              {items.find(i => location.pathname.startsWith(i.path))?.label || 'EmptyTruck Connect'}
            </div>
          </div>

          {/* Right: Status indicator for drivers */}
          {role === 'driver' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>
              <Zap size={12} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--success)' }}>
                {user?.driverProfile?.isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          )}

          {/* Rating display */}
          {user?.averageRating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--brand-amber)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              ⭐ {user.averageRating.toFixed(1)}
            </div>
          )}
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          main { margin-left: 0 !important; }
          aside { transform: translateX(-100%); }
          .mobile-overlay { display: block !important; }
          .mobile-menu-btn { display: flex !important; }
        }
        .nav-hover:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
