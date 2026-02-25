import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../../services/api';
export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    bookingsAPI.get(id).then(r => setBooking(r.data.booking)).catch(console.log).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!booking) return <div className="card"><p>Booking not found</p></div>;
  const statusMap = { pending: 'badge-orange', accepted: 'badge-blue', in_transit: 'badge-orange', completed: 'badge-green', cancelled: 'badge-red' };
  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>
        <h1 className="page-title">Booking #{booking.bookingNumber}</h1>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span className={`badge ${statusMap[booking.status] || 'badge-gray'}`} style={{ fontSize: 14, padding: '6px 14px' }}>{booking.status?.replace('_', ' ')}</span>
          <span style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 22 }}>₹{(booking.quotedPrice || 0).toLocaleString('en-IN')}</span>
        </div>
        {[['From', booking.pickup?.address], ['To', booking.dropoff?.address], ['Driver', booking.driver?.name], ['Customer', booking.customer?.name], ['Goods', booking.goodsType], ['Distance', `${booking.distanceKm} km`], ['Date', new Date(booking.scheduledDate || booking.createdAt).toLocaleDateString('en-IN')]].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>{k}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v || '-'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
