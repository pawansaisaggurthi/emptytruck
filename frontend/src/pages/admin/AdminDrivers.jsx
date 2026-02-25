import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const FILTERS = ['pending', 'approved', 'rejected', 'all'];

const statusStyle = (s) => ({
  pending:  { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B' },
  approved: { bg: 'rgba(16,185,129,0.15)',  color: '#10B981' },
  rejected: { bg: 'rgba(239,68,68,0.15)',   color: '#EF4444' },
}[s] || { bg: 'rgba(90,100,128,0.15)', color: '#5A6480' });

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await adminAPI.getPendingDrivers(params);
      setDrivers(res.data.drivers || []);
    } catch { toast.error('Failed to load drivers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveDriver(id);
      toast.success('✅ Driver approved!');
      load();
      if (selected?._id === id) setSelected(null);
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    try {
      await adminAPI.rejectDriver(id, reason);
      toast.success('Driver rejected');
      load();
      if (selected?._id === id) setSelected(null);
    } catch { toast.error('Failed to reject'); }
  };

  const filtered = drivers.filter(d =>
    !search ||
    d.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    d.truckNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Driver Management 🚛</h1>
        <p style={{ color: '#A0AABF', fontSize: 14 }}>Review, approve, and manage driver accounts</p>
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: filter === f ? '#F97316' : '#1E2230',
              color: filter === f ? 'white' : '#A0AABF',
              textTransform: 'capitalize',
            }}>{f}</button>
          ))}
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search drivers..."
          style={{ background: '#1E2230', border: '1px solid #2A3045', borderRadius: 10, padding: '8px 14px', color: '#F0F4FF', fontSize: 13, width: 220 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Driver List */}
        <div style={{ background: 'linear-gradient(145deg, #1E2230, #161820)', border: '1px solid #2A3045', borderRadius: 16, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#5A6480' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚛</div>
              <div>Loading drivers...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#5A6480' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontWeight: 600 }}>No drivers found</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2A3045', background: '#13161E' }}>
                  {['Driver', 'Truck', 'License', 'Trips', 'Rating', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', color: '#5A6480', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const ss = statusStyle(d.approvalStatus);
                  return (
                    <tr key={d._id}
                      onClick={() => setSelected(selected?._id === d._id ? null : d)}
                      style={{
                        borderBottom: '1px solid #1A1E28', cursor: 'pointer',
                        background: selected?._id === d._id ? 'rgba(249,115,22,0.06)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { if (selected?._id !== d._id) e.currentTarget.style.background = '#13161E'; }}
                      onMouseLeave={e => { if (selected?._id !== d._id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#F0F4FF' }}>{d.user?.name}</div>
                        <div style={{ fontSize: 11, color: '#5A6480', marginTop: 2 }}>{d.user?.email}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#A0AABF' }}>
                        <div>{d.truckType}</div>
                        <div style={{ fontSize: 11, color: '#5A6480', fontFamily: "'Space Mono', monospace" }}>{d.truckNumber}</div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#A0AABF', fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{d.licenseNumber || '—'}</td>
                      <td style={{ padding: '14px 16px', color: '#FBBF24', fontWeight: 700 }}>{d.totalTrips || 0}</td>
                      <td style={{ padding: '14px 16px', color: '#F97316', fontWeight: 700 }}>
                        {d.user?.averageRating ? `⭐ ${d.user.averageRating.toFixed(1)}` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, textTransform: 'capitalize' }}>
                          {d.approvalStatus}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {d.approvalStatus === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleApprove(d._id)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓ Approve</button>
                            <button onClick={() => handleReject(d._id)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                          </div>
                        )}
                        {d.approvalStatus === 'approved' && (
                          <span style={{ fontSize: 12, color: '#10B981' }}>Active ✓</span>
                        )}
                        {d.approvalStatus === 'rejected' && (
                          <span style={{ fontSize: 12, color: '#EF4444' }}>Rejected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Driver Detail Panel */}
        {selected && (
          <div style={{ background: 'linear-gradient(145deg, #1E2230, #161820)', border: '1px solid #2A3045', borderRadius: 16, padding: 24, height: 'fit-content', position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontWeight: 800, fontSize: 16 }}>Driver Profile</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#5A6480', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            {/* Avatar */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #FBBF24)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 26, fontWeight: 800 }}>
                {selected.user?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{selected.user?.name}</div>
              <div style={{ fontSize: 12, color: '#5A6480', marginTop: 2 }}>{selected.user?.email}</div>
              <div style={{ fontSize: 12, color: '#A0AABF', marginTop: 2 }}>{selected.user?.phone}</div>
            </div>

            {/* Details */}
            {[
              ['Truck Type', selected.truckType],
              ['Truck Number', selected.truckNumber],
              ['License', selected.licenseNumber],
              ['Capacity', `${selected.truckCapacity} tons`],
              ['Total Trips', selected.totalTrips || 0],
              ['Total Earnings', `₹${(selected.totalEarnings || 0).toLocaleString('en-IN')}`],
              ['Rating', selected.user?.averageRating ? `⭐ ${selected.user.averageRating.toFixed(1)} (${selected.user.totalRatings} reviews)` : 'No ratings yet'],
              ['Joined', new Date(selected.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #1A1E28', fontSize: 13 }}>
                <span style={{ color: '#5A6480' }}>{k}</span>
                <span style={{ color: '#F0F4FF', fontWeight: 600, textAlign: 'right' }}>{v}</span>
              </div>
            ))}

            {/* Documents */}
            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#5A6480', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Documents</div>
              {['governmentId', 'vehicleRC', 'insurance'].map(doc => {
                const d = selected.documents?.[doc];
                return (
                  <div key={doc} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', fontSize: 12 }}>
                    <span style={{ color: '#A0AABF', textTransform: 'capitalize' }}>{doc.replace(/([A-Z])/g, ' $1')}</span>
                    <span style={{ color: d?.url ? '#10B981' : '#EF4444', fontWeight: 600 }}>{d?.url ? '✓ Uploaded' : '✗ Missing'}</span>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            {selected.approvalStatus === 'pending' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button onClick={() => handleApprove(selected._id)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  ✓ Approve Driver
                </button>
                <button onClick={() => handleReject(selected._id)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
