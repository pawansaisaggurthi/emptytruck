import React, { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const statusBadge = (s) => {
  const map = { pending: 'badge-orange', accepted: 'badge-blue', in_transit: 'badge-orange', completed: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

export default function CustomerBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    try {
      const res = await bookingsAPI.getMine();
      setBookings(res.data.bookings || []);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancel(id, 'Customer cancelled');
      toast.success('Booking cancelled');
      load();
    } catch { toast.error('Failed to cancel'); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Bookings 📦</h1>
        <p className="page-subtitle">{bookings.length} total bookings</p>
      </div>

      <div className="tabs">
        {['all', 'pending', 'accepted', 'in_transit', 'completed', 'cancelled'].map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <div className="empty-state-title">No bookings</div>
              <div className="empty-state-subtitle">Your bookings will appear here</div>
            </div>
          ) : filtered.map(b => (
            <div key={b._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>#{b.bookingNumber}</span>
                    {statusBadge(b.status)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 4 }}>
                    📍 {b.pickup?.address} → {b.dropoff?.address}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Driver: {b.driver?.name || 'TBD'} · {b.distanceKm} km · {b.goodsType}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Booked: {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 20 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</div>
                  {b.agreedPrice && b.agreedPrice !== b.quotedPrice && (
                    <div style={{ fontSize: 12, color: 'var(--green)' }}>Final: ₹{b.agreedPrice.toLocaleString('en-IN')}</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {b.status === 'pending' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(b._id)}>Cancel</button>
                )}
                {['accepted', 'in_transit'].includes(b.status) && (
                  <a href="/customer/chat" className="btn btn-secondary btn-sm">💬 Chat with Driver</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
