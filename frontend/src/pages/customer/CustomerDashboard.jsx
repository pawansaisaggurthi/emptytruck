import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { bookingsAPI } from '../../services/api';

const statusBadge = (s) => {
  const map = { pending: 'badge-orange', accepted: 'badge-blue', in_transit: 'badge-orange', completed: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsAPI.getMine().then(r => setBookings(r.data.bookings || [])).catch(console.log).finally(() => setLoading(false));
  }, []);

  const active = bookings.filter(b => ['accepted', 'in_transit'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'completed');
  const totalSpent = completed.reduce((s, b) => s + (b.agreedPrice || b.quotedPrice || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Hello, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Track your shipments and find available trucks</p>
      </div>

      {/* Quick action */}
      <div className="card card-glow" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Need to ship something?</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Find available trucks on your route right now</p>
        </div>
        <Link to="/customer/search" className="btn btn-primary">🔍 Find Trucks →</Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total Bookings</div><div className="stat-value">{bookings.length}</div></div>
        <div className="stat-card"><div className="stat-label">Active Shipments</div><div className="stat-value">{active.length}</div></div>
        <div className="stat-card"><div className="stat-label">Completed</div><div className="stat-value">{completed.length}</div></div>
        <div className="stat-card"><div className="stat-label">Total Spent</div><div className="stat-value">₹{totalSpent.toLocaleString('en-IN')}</div></div>
      </div>

      {/* Active shipments */}
      {active.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--orange)' }}>🚛 Active Shipments</h3>
          {active.map(b => (
            <div key={b._id} style={{ background: 'var(--bg2)', borderRadius: 10, padding: 16, border: '1px solid rgba(249,115,22,0.2)', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700 }}>#{b.bookingNumber}</span>
                  <span style={{ marginLeft: 10 }}>{statusBadge(b.status)}</span>
                </div>
                <span style={{ color: 'var(--orange)', fontWeight: 700 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 12 }}>
                {b.pickup?.address} → {b.dropoff?.address}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/customer/bookings/${b._id}`} className="btn btn-primary btn-sm">View Details</Link>
                <Link to="/customer/chat" className="btn btn-secondary btn-sm">💬 Chat</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent bookings */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Recent Bookings</h3>
          <Link to="/customer/bookings" style={{ fontSize: 13, color: 'var(--orange)', textDecoration: 'none' }}>View all →</Link>
        </div>
        {loading ? <div className="loading"><div className="spinner" /></div> :
          bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No bookings yet</div>
              <div className="empty-state-subtitle">Search for trucks to make your first booking</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Booking</th><th>Route</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {bookings.slice(0, 8).map(b => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{b.bookingNumber}</td>
                      <td style={{ fontSize: 13 }}>{b.pickup?.address?.split(',')[0]} → {b.dropoff?.address?.split(',')[0]}</td>
                      <td style={{ color: 'var(--orange)', fontWeight: 700 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</td>
                      <td style={{ fontSize: 12 }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>{statusBadge(b.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
