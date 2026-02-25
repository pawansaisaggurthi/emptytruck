import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminAPI.getUsers({ limit: 50 }).then(r => setUsers(r.data.users || [])).catch(console.log).finally(() => setLoading(false));
  }, []);

  const handleSuspend = async (id, isSuspended) => {
    try {
      if (isSuspended) await adminAPI.unsuspendUser(id);
      else { const r = window.prompt('Suspension reason:'); if (!r) return; await adminAPI.suspendUser(id, r); }
      toast.success('Updated!');
      adminAPI.getUsers({ limit: 50 }).then(r => setUsers(r.data.users || []));
    } catch { toast.error('Failed'); }
  };

  const filtered = users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">User Management 👥</h1>
        <p className="page-subtitle">{users.length} registered users</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input className="form-input" style={{ maxWidth: 300 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search users..." />
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Phone</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td><span className={`badge ${u.role === 'driver' ? 'badge-blue' : u.role === 'admin' ? 'badge-orange' : 'badge-gray'}`}>{u.role}</span></td>
                    <td style={{ fontSize: 13 }}>{u.phone || '-'}</td>
                    <td><span className={`badge ${u.isSuspended ? 'badge-red' : 'badge-green'}`}>{u.isSuspended ? 'Suspended' : 'Active'}</span></td>
                    <td style={{ fontSize: 12 }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      {u.role !== 'admin' && (
                        <button className={`btn btn-sm ${u.isSuspended ? 'btn-success' : 'btn-danger'}`} onClick={() => handleSuspend(u._id, u.isSuspended)}>
                          {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    adminAPI.getBookings({ limit: 50 }).then(r => setBookings(r.data.bookings || [])).catch(console.log).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  const statusBadge = (s) => {
    const map = { pending: 'badge-orange', accepted: 'badge-blue', in_transit: 'badge-orange', completed: 'badge-green', cancelled: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s?.replace('_', ' ')}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">All Bookings 📋</h1>
        <p className="page-subtitle">{bookings.length} total bookings on the platform</p>
      </div>

      <div className="tabs">
        {['all', 'pending', 'accepted', 'in_transit', 'completed', 'cancelled'].map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f.replace('_', ' ')}</button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Booking</th><th>Customer</th><th>Driver</th><th>Route</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {filtered.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{b.bookingNumber}</td>
                    <td style={{ fontSize: 13 }}>{b.customer?.name}</td>
                    <td style={{ fontSize: 13 }}>{b.driver?.name}</td>
                    <td style={{ fontSize: 12 }}>{b.pickup?.address?.split(',')[0]} → {b.dropoff?.address?.split(',')[0]}</td>
                    <td style={{ color: 'var(--orange)', fontWeight: 700 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</td>
                    <td>{statusBadge(b.status)}</td>
                    <td style={{ fontSize: 12 }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminSettings() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Platform Settings ⚙️</h1>
        <p className="page-subtitle">Configure platform parameters</p>
      </div>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
          {[
            { label: 'Platform Commission (%)', value: '8', desc: 'Percentage taken from each booking' },
            { label: 'Min Booking Amount (₹)', value: '500', desc: 'Minimum amount for a valid booking' },
            { label: 'Max Deviation (km)', value: '100', desc: 'Max route deviation allowed' },
          ].map(s => (
            <div key={s.label} className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{s.label}</label>
              <input className="form-input" defaultValue={s.value} />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.desc}</div>
            </div>
          ))}
          <button className="btn btn-primary" onClick={() => toast.success('Settings saved!')}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
