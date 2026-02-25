import React, { useState, useEffect } from 'react';
import { bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const statusBadge = (s) => {
  const map = { pending: 'badge-orange', accepted: 'badge-blue', in_transit: 'badge-orange', completed: 'badge-green', cancelled: 'badge-red' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
};

export default function DriverBookings() {
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

  const handleAction = async (action, id) => {
    try {
      if (action === 'accept') await bookingsAPI.accept(id);
      if (action === 'reject') await bookingsAPI.reject(id, 'Not available');
      if (action === 'start') await bookingsAPI.start(id);
      if (action === 'complete') await bookingsAPI.complete(id);
      toast.success('Updated!');
      load();
    } catch { toast.error('Action failed'); }
  };

  const FILTERS = ['all', 'pending', 'accepted', 'in_transit', 'completed', 'cancelled'];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Bookings 📋</h1>
        <p className="page-subtitle">{bookings.length} total bookings</p>
      </div>

      <div className="tabs">
        {FILTERS.map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
            {f !== 'all' && <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.7 }}>({bookings.filter(b => b.status === f).length})</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-title">No bookings</div>
              <div className="empty-state-subtitle">Bookings will appear here</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(b => (
                <div key={b._id} style={{ background: 'var(--bg2)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>#{b.bookingNumber}</span>
                        {statusBadge(b.status)}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-sec)', marginBottom: 2 }}>
                        📍 {b.pickup?.address} → {b.dropoff?.address}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Customer: {b.customer?.name} · {b.distanceKm} km · {b.goodsType}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 18 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(b.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {b.status === 'pending' && <>
                      <button className="btn btn-success btn-sm" onClick={() => handleAction('accept', b._id)}>✅ Accept</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleAction('reject', b._id)}>❌ Reject</button>
                    </>}
                    {b.status === 'accepted' && <button className="btn btn-primary btn-sm" onClick={() => handleAction('start', b._id)}>🚛 Start Trip</button>}
                    {b.status === 'in_transit' && <button className="btn btn-success btn-sm" onClick={() => handleAction('complete', b._id)}>✅ Mark Complete</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
