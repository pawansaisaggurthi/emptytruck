import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { bookingsAPI, driverAPI } from '../../services/api';
import toast from 'react-hot-toast';

const statusBadge = (s) => {
  const map = { pending: 'badge-orange', accepted: 'badge-blue', in_transit: 'badge-orange', completed: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

export default function DriverDashboard() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await bookingsAPI.getMine();
        setBookings(res.data.bookings || []);
      } catch (e) { console.log(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const toggleOnline = async () => {
    try {
      await driverAPI.toggleOnline();
      setIsOnline(p => !p);
      toast.success(isOnline ? 'You are now offline' : 'You are now online!');
    } catch { toast.error('Failed to update status'); }
  };

  const handleAccept = async (id) => {
    try {
      await bookingsAPI.accept(id);
      setBookings(p => p.map(b => b._id === id ? { ...b, status: 'accepted' } : b));
      toast.success('Booking accepted!');
    } catch { toast.error('Failed to accept'); }
  };

  const handleReject = async (id) => {
    try {
      await bookingsAPI.reject(id, 'Not available');
      setBookings(p => p.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking rejected');
    } catch { toast.error('Failed to reject'); }
  };

  const pending = bookings.filter(b => b.status === 'pending');
  const active = bookings.filter(b => b.status === 'in_transit');
  const completed = bookings.filter(b => b.status === 'completed');
  const totalEarnings = completed.reduce((s, b) => s + (b.agreedPrice || b.quotedPrice || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="page-subtitle">Manage your trips and bookings</p>
      </div>

      {/* Online toggle */}
      <div className="card card-glow" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span className={isOnline ? 'online-dot' : ''} style={!isOnline ? { width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block' } : {}} />
            <strong style={{ fontSize: 16 }}>{isOnline ? 'You are Online' : 'You are Offline'}</strong>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{isOnline ? 'Customers can find and book you' : 'Go online to start receiving bookings'}</p>
        </div>
        <button className={`btn ${isOnline ? 'btn-danger' : 'btn-success'}`} onClick={toggleOnline}>
          {isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Pending Requests</div>
          <div className="stat-value">{pending.length}</div>
          <div className="stat-sub">Awaiting your response</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Trips</div>
          <div className="stat-value">{active.length}</div>
          <div className="stat-sub">Currently in transit</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{completed.length}</div>
          <div className="stat-sub">Total trips done</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Earnings</div>
          <div className="stat-value">₹{totalEarnings.toLocaleString('en-IN')}</div>
          <div className="stat-sub">All time</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <Link to="/driver/post-trip" className="btn btn-primary">➕ Post New Trip</Link>
        <Link to="/driver/bookings" className="btn btn-secondary">📋 All Bookings</Link>
      </div>

      {/* Pending bookings */}
      {pending.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--orange)' }}>📥 New Booking Requests ({pending.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map(b => (
              <div key={b._id} style={{ background: 'var(--bg2)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>#{b.bookingNumber}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-sec)' }}>{b.pickup?.address} → {b.dropoff?.address}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Customer: {b.customer?.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 18 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{b.distanceKm} km</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-success btn-sm" onClick={() => handleAccept(b._id)}>✅ Accept</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleReject(b._id)}>❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent bookings */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Bookings</h3>
        {loading ? <div className="loading"><div className="spinner" /></div> :
          bookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🚛</div>
              <div className="empty-state-title">No bookings yet</div>
              <div className="empty-state-subtitle">Post a trip to start receiving bookings</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Booking</th><th>Route</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {bookings.slice(0, 10).map(b => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{b.bookingNumber}</td>
                      <td>{b.pickup?.address?.split(',')[0]} → {b.dropoff?.address?.split(',')[0]}</td>
                      <td>{b.customer?.name}</td>
                      <td style={{ color: 'var(--orange)', fontWeight: 700 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</td>
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
