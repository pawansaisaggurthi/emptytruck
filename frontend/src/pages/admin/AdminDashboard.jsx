import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

// ─── MOCK CHART DATA (will enrich with real stats) ────────────────────────────
const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
const mockRevenue = [
  { month: 'Aug', revenue: 42000, bookings: 18 },
  { month: 'Sep', revenue: 58000, bookings: 24 },
  { month: 'Oct', revenue: 51000, bookings: 21 },
  { month: 'Nov', revenue: 76000, bookings: 31 },
  { month: 'Dec', revenue: 89000, bookings: 38 },
  { month: 'Jan', revenue: 94000, bookings: 42 },
  { month: 'Feb', revenue: 67000, bookings: 29 },
];
const mockTruckTypes = [
  { name: 'Medium Truck', value: 38, color: '#F97316' },
  { name: 'Mini Truck', value: 27, color: '#FBBF24' },
  { name: 'Heavy Truck', value: 19, color: '#FB923C' },
  { name: 'Trailer', value: 10, color: '#FED7AA' },
  { name: 'Container', value: 6, color: '#7C3AED' },
];
const mockTopRoutes = [
  { route: 'HYD → MUM', bookings: 34, revenue: 128000 },
  { route: 'DEL → BLR', bookings: 28, revenue: 104000 },
  { route: 'MUM → CHE', bookings: 22, revenue: 87000 },
  { route: 'BLR → PUN', bookings: 18, revenue: 62000 },
  { route: 'KOL → DEL', bookings: 14, revenue: 51000 },
];

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1E2230', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: '#A0AABF', marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>
          {p.name === 'revenue' ? `₹${p.value.toLocaleString('en-IN')}` : `${p.value} bookings`}
        </div>
      ))}
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, color = 'var(--orange)', trend }) => (
  <div style={{
    background: 'linear-gradient(145deg, #1E2230 0%, #161820 100%)',
    border: '1px solid #2A3045',
    borderRadius: 16,
    padding: '20px 22px',
    position: 'relative',
    overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.06 }}>{icon}</div>
    <div style={{ fontSize: 12, color: '#5A6480', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
    <div style={{ fontSize: 32, fontWeight: 800, color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#A0AABF' }}>{sub}</div>}
    {trend && (
      <div style={{ fontSize: 11, color: trend > 0 ? '#10B981' : '#EF4444', marginTop: 6, fontWeight: 600 }}>
        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
      </div>
    )}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('revenue');

  useEffect(() => {
    const load = async () => {
      try {
        const [dashRes, driversRes, bookingsRes] = await Promise.all([
          adminAPI.getDashboard(),
          adminAPI.getPendingDrivers(),
          adminAPI.getBookings({ limit: 8, sort: '-createdAt' }),
        ]);
        setStats(dashRes.data);
        setPendingDrivers(driversRes.data.drivers || []);
        setRecentBookings(bookingsRes.data.bookings || []);
      } catch (e) {
        console.log(e);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveDriver(id);
      setPendingDrivers(p => p.filter(d => d._id !== id));
      toast.success('✅ Driver approved!');
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason:');
    if (!reason) return;
    try {
      await adminAPI.rejectDriver(id, reason);
      setPendingDrivers(p => p.filter(d => d._id !== id));
      toast.success('Driver rejected');
    } catch { toast.error('Failed to reject'); }
  };

  const s = stats?.stats || {};
  const totalRevenue = s.totalRevenue || 0;
  const formattedRevenue = totalRevenue >= 100000
    ? `₹${(totalRevenue / 100000).toFixed(1)}L`
    : `₹${totalRevenue.toLocaleString('en-IN')}`;

  const statusBadge = (status) => {
    const map = {
      pending: { bg: 'rgba(249,115,22,0.15)', color: '#F97316', label: 'Pending' },
      accepted: { bg: 'rgba(59,130,246,0.15)', color: '#3B82F6', label: 'Accepted' },
      in_transit: { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', label: 'In Transit' },
      completed: { bg: 'rgba(16,185,129,0.15)', color: '#10B981', label: 'Completed' },
      cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444', label: 'Cancelled' },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>
        {s.label}
      </span>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚛</div>
        <div style={{ color: '#A0AABF', fontSize: 14 }}>Loading dashboard...</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Platform Overview 📊</h1>
        <p style={{ color: '#A0AABF', fontSize: 14 }}>Real-time analytics and management — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Revenue" value={formattedRevenue} sub="Platform commission earned" icon="💰" color="#F97316" trend={12} />
        <StatCard label="Total Bookings" value={s.totalBookings || 0} sub={`${s.activeBookings || 0} currently active`} icon="📦" color="#FBBF24" trend={8} />
        <StatCard label="Active Drivers" value={s.approvedDrivers || 0} sub={`${s.totalDrivers || 0} total registered`} icon="🚛" color="#10B981" trend={5} />
        <StatCard label="Customers" value={(s.totalUsers || 0) - (s.totalDrivers || 0)} sub="Registered customers" icon="👥" color="#3B82F6" trend={15} />
        <StatCard label="Pending Approvals" value={pendingDrivers.length} sub="Drivers awaiting review" icon="⏳" color={pendingDrivers.length > 0 ? '#F59E0B' : '#10B981'} />
        <StatCard label="Completed Trips" value={s.completedBookings || 0} sub="Successfully delivered" icon="✅" color="#10B981" trend={3} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Revenue + Bookings Chart */}
        <div style={{ background: 'linear-gradient(145deg, #1E2230, #161820)', border: '1px solid #2A3045', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Growth Trends</h3>
              <p style={{ fontSize: 12, color: '#5A6480' }}>Last 7 months performance</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['revenue', 'bookings'].map(c => (
                <button key={c} onClick={() => setActiveChart(c)} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: activeChart === c ? '#F97316' : '#2A3045',
                  color: activeChart === c ? 'white' : '#A0AABF',
                  textTransform: 'capitalize',
                }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockRevenue} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FBBF24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3045" />
              <XAxis dataKey="month" tick={{ fill: '#5A6480', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#5A6480', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={v => activeChart === 'revenue' ? `₹${(v/1000).toFixed(0)}k` : v} />
              <Tooltip content={<CustomTooltip />} />
              {activeChart === 'revenue' ? (
                <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={2.5} fill="url(#colorRevenue)" name="revenue" />
              ) : (
                <Area type="monotone" dataKey="bookings" stroke="#FBBF24" strokeWidth={2.5} fill="url(#colorBookings)" name="bookings" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Truck Type Distribution */}
        <div style={{ background: 'linear-gradient(145deg, #1E2230, #161820)', border: '1px solid #2A3045', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Truck Types</h3>
          <p style={{ fontSize: 12, color: '#5A6480', marginBottom: 16 }}>Booking distribution</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={mockTruckTypes} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {mockTruckTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#1E2230', border: '1px solid #2A3045', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {mockTruckTypes.slice(0, 3).map(t => (
              <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />
                  <span style={{ color: '#A0AABF' }}>{t.name}</span>
                </div>
                <span style={{ color: t.color, fontWeight: 700 }}>{t.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Routes + Pending Drivers Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Top Routes */}
        <div style={{ background: 'linear-gradient(145deg, #1E2230, #161820)', border: '1px solid #2A3045', borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🛣️ Top Routes</h3>
          <p style={{ fontSize: 12, color: '#5A6480', marginBottom: 16 }}>Most booked routes this month</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mockTopRoutes} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3045" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#5A6480', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="route" type="category" tick={{ fill: '#A0AABF', fontSize: 12 }} axisLine={false} tickLine={false} width={75} />
              <Tooltip contentStyle={{ background: '#1E2230', border: '1px solid #2A3045', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="bookings" fill="#F97316" radius={[0, 4, 4, 0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pending Driver Approvals */}
        <div style={{ background: 'linear-gradient(145deg, #1E2230, #161820)', border: '1px solid #2A3045', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>⏳ Pending Approvals</h3>
              <p style={{ fontSize: 12, color: '#5A6480' }}>{pendingDrivers.length} drivers awaiting review</p>
            </div>
            <Link to="/admin/drivers" style={{ fontSize: 12, color: '#F97316', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>

          {pendingDrivers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#5A6480' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 600 }}>All caught up!</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>No pending approvals</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 240, overflowY: 'auto' }}>
              {pendingDrivers.slice(0, 4).map(d => (
                <div key={d._id} style={{ background: '#13161E', borderRadius: 10, padding: '12px 14px', border: '1px solid #2A3045' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.user?.name}</div>
                      <div style={{ fontSize: 11, color: '#5A6480' }}>{d.truckType} · {d.truckNumber}</div>
                      <div style={{ fontSize: 11, color: '#5A6480', marginTop: 1 }}>{d.user?.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                      <button onClick={() => handleApprove(d._id)} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                      <button onClick={() => handleReject(d._id)} style={{ padding: '5px 10px', borderRadius: 8, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div style={{ background: 'linear-gradient(145deg, #1E2230, #161820)', border: '1px solid #2A3045', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>📋 Recent Bookings</h3>
            <p style={{ fontSize: 12, color: '#5A6480' }}>Latest transactions on the platform</p>
          </div>
          <Link to="/admin/bookings" style={{ fontSize: 12, color: '#F97316', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
        </div>

        {recentBookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#5A6480' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📦</div>
            <div>No bookings yet</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #2A3045' }}>
                  {['Booking #', 'Customer', 'Driver', 'Route', 'Amount', 'Commission', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#5A6480', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={b._id} style={{ borderBottom: '1px solid #1A1E28' }}>
                    <td style={{ padding: '12px 12px', fontWeight: 700, color: '#F97316', fontFamily: "'Space Mono', monospace", fontSize: 12 }}>#{b.bookingNumber}</td>
                    <td style={{ padding: '12px 12px', color: '#F0F4FF' }}>{b.customer?.name || '—'}</td>
                    <td style={{ padding: '12px 12px', color: '#A0AABF' }}>{b.driver?.name || '—'}</td>
                    <td style={{ padding: '12px 12px', color: '#A0AABF', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.pickup?.address?.split(',')[0]} → {b.dropoff?.address?.split(',')[0]}
                    </td>
                    <td style={{ padding: '12px 12px', color: '#FBBF24', fontWeight: 700 }}>₹{(b.quotedPrice || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px', color: '#10B981', fontWeight: 600 }}>₹{(b.platformCommission || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 12px' }}>{statusBadge(b.status)}</td>
                    <td style={{ padding: '12px 12px', color: '#5A6480', fontSize: 12 }}>{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 20 }}>
        {[
          { label: 'Manage Drivers', icon: '🚛', to: '/admin/drivers', color: '#F97316' },
          { label: 'Manage Users', icon: '👥', to: '/admin/users', color: '#3B82F6' },
          { label: 'All Bookings', icon: '📋', to: '/admin/bookings', color: '#10B981' },
          { label: 'Settings', icon: '⚙️', to: '/admin/settings', color: '#8B5CF6' },
        ].map(a => (
          <Link key={a.label} to={a.to} style={{
            background: 'linear-gradient(145deg, #1E2230, #161820)',
            border: `1px solid ${a.color}30`,
            borderRadius: 12,
            padding: '16px 18px',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = a.color + '80'}
            onMouseLeave={e => e.currentTarget.style.borderColor = a.color + '30'}
          >
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <span style={{ color: '#F0F4FF', fontWeight: 600, fontSize: 14 }}>{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
