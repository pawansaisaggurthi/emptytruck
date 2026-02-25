import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
export default function ProfileSettings() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="page-header"><h1 className="page-title">Settings ⚙️</h1></div>
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Profile</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--orange-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontWeight: 800, fontSize: 20 }}>
            {user?.name?.slice(0,1)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.email}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{user?.phone}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge ${user?.role === 'driver' ? 'badge-blue' : 'badge-orange'}`}>{user?.role}</span>
          <span className="badge badge-green">{user?.isEmailVerified ? '✓ Email verified' : 'Email not verified'}</span>
        </div>
      </div>
      <div className="card">
        <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => { logout(); navigate('/login'); }}>🚪 Logout</button>
      </div>
    </div>
  );
}
