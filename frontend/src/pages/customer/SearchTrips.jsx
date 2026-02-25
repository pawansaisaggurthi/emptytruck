import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsAPI, bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CITIES = {
  mumbai: { lng: 72.8777, lat: 19.0760, state: 'Maharashtra' },
  delhi: { lng: 77.1025, lat: 28.7041, state: 'Delhi' },
  bangalore: { lng: 77.5946, lat: 12.9716, state: 'Karnataka' },
  bengaluru: { lng: 77.5946, lat: 12.9716, state: 'Karnataka' },
  hyderabad: { lng: 78.4867, lat: 17.3850, state: 'Telangana' },
  chennai: { lng: 80.2707, lat: 13.0827, state: 'Tamil Nadu' },
  kolkata: { lng: 88.3639, lat: 22.5726, state: 'West Bengal' },
  pune: { lng: 73.8567, lat: 18.5204, state: 'Maharashtra' },
  ahmedabad: { lng: 72.5714, lat: 23.0225, state: 'Gujarat' },
  jaipur: { lng: 75.7873, lat: 26.9124, state: 'Rajasthan' },
  surat: { lng: 72.8311, lat: 21.1702, state: 'Gujarat' },
  lucknow: { lng: 80.9462, lat: 26.8467, state: 'Uttar Pradesh' },
  nagpur: { lng: 79.0882, lat: 21.1458, state: 'Maharashtra' },
  indore: { lng: 75.8577, lat: 22.7196, state: 'Madhya Pradesh' },
  kochi: { lng: 76.2673, lat: 9.9312, state: 'Kerala' },
};

export default function SearchTrips() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ origin: '', destination: '', truckType: '' });
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [booking, setBooking] = useState(null); // selected trip for booking
  const [bookForm, setBookForm] = useState({ pickupAddress: '', dropAddress: '', goodsType: 'Electronics', goodsWeight: '', notes: '', scheduledDate: '' });
  const [bookLoading, setBookLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true); setSearched(true);
    try {
      const params = {};
      if (search.origin) params.origin = search.origin;
      if (search.destination) params.destination = search.destination;
      if (search.truckType) params.truckType = search.truckType;
      const res = await tripsAPI.search(params);
      setTrips(res.data.trips || []);
    } catch { toast.error('Search failed'); }
    finally { setLoading(false); }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!bookForm.pickupAddress || !bookForm.dropAddress) return toast.error('Enter pickup and drop addresses');
    setBookLoading(true);
    try {
      const originCoords = booking.origin?.location?.coordinates || [78.4867, 17.385];
      const destCoords = booking.destination?.location?.coordinates || [72.8777, 19.076];
      await bookingsAPI.create({
        tripId: booking._id,
        pickup: { address: bookForm.pickupAddress, location: { type: 'Point', coordinates: originCoords } },
        dropoff: { address: bookForm.dropAddress, location: { type: 'Point', coordinates: destCoords } },
        scheduledDate: bookForm.scheduledDate || booking.availableDate || new Date(Date.now() + 86400000).toISOString(),
        goodsType: bookForm.goodsType,
        goodsWeight: parseFloat(bookForm.goodsWeight) || 1,
        notes: bookForm.notes,
      });
      toast.success('Booking request sent!');
      setBooking(null);
      navigate('/customer/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setBookLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Find Trucks 🔍</h1>
        <p className="page-subtitle">Search available trucks on your route</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px auto', gap: 16, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">From (City)</label>
              <input className="form-input" value={search.origin} onChange={e => setSearch(p => ({ ...p, origin: e.target.value }))} placeholder="e.g. Hyderabad" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">To (City)</label>
              <input className="form-input" value={search.destination} onChange={e => setSearch(p => ({ ...p, destination: e.target.value }))} placeholder="e.g. Mumbai" required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Truck Type</label>
              <select className="form-select" value={search.truckType} onChange={e => setSearch(p => ({ ...p, truckType: e.target.value }))}>
                <option value="">Any</option>
                {['Mini Truck', 'Medium Truck', 'Heavy Truck', 'Trailer', 'Container'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳' : '🔍 Search'}
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      {searched && !loading && trips.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🚛</div>
          <div className="empty-state-title">No trucks found</div>
          <div className="empty-state-subtitle">Try different cities or check back later</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {trips.map(trip => (
          <div key={trip._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{trip.driver?.name || 'Driver'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>⭐ {trip.driver?.averageRating?.toFixed(1) || 'New'} · {trip.driver?.totalRatings || 0} ratings</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 22 }}>₹{trip.pricePerKm}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/km</div>
              </div>
            </div>
            <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
              <div style={{ marginBottom: 6 }}>🛣️ <strong>{trip.origin?.city}</strong> → <strong>{trip.destination?.city}</strong></div>
              <div style={{ display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: 12 }}>
                <span>🚛 {trip.truckType}</span>
                <span>⚖️ {trip.capacity}T</span>
                <span>📏 {trip.totalDistanceKm} km</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-sec)' }}>
                Est. ₹{trip.estimatedPrice?.toLocaleString('en-IN')}
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setBooking(trip)}>Book This Truck →</button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking modal */}
      {booking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Book Truck 📦</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setBooking(null)}>✕</button>
            </div>

            {/* Driver summary */}
            <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{booking.driver?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{booking.truckType} · {booking.origin?.city} → {booking.destination?.city}</div>
              </div>
              <div style={{ color: 'var(--orange)', fontWeight: 800, fontSize: 20 }}>₹{booking.pricePerKm}/km</div>
            </div>

            <form onSubmit={handleBook}>
              <div className="form-group">
                <label className="form-label">Pickup Address *</label>
                <input className="form-input" value={bookForm.pickupAddress} onChange={e => setBookForm(p => ({ ...p, pickupAddress: e.target.value }))} placeholder="Full pickup address" required />
              </div>
              <div className="form-group">
                <label className="form-label">Drop Address *</label>
                <input className="form-input" value={bookForm.dropAddress} onChange={e => setBookForm(p => ({ ...p, dropAddress: e.target.value }))} placeholder="Full drop address" required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Goods Type *</label>
                  <select className="form-select" value={bookForm.goodsType} onChange={e => setBookForm(p => ({ ...p, goodsType: e.target.value }))}>
                    {['Electronics', 'FMCG', 'Textiles', 'Machinery', 'Food', 'Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input className="form-input" type="number" value={bookForm.goodsWeight} onChange={e => setBookForm(p => ({ ...p, goodsWeight: e.target.value }))} placeholder="e.g. 500" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Scheduled Date</label>
                <input className="form-input" type="date" value={bookForm.scheduledDate} onChange={e => setBookForm(p => ({ ...p, scheduledDate: e.target.value }))} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={bookForm.notes} onChange={e => setBookForm(p => ({ ...p, notes: e.target.value }))} placeholder="Special requirements..." style={{ minHeight: 70 }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="submit" className="btn btn-primary" disabled={bookLoading} style={{ flex: 1 }}>
                  {bookLoading ? '⏳ Sending...' : '📤 Send Booking Request'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setBooking(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
