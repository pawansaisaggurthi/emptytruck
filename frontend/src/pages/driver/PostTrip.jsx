import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const CITIES = {
  'mumbai':     { lng: 72.8777, lat: 19.0760, state: 'Maharashtra' },
  'delhi':      { lng: 77.1025, lat: 28.7041, state: 'Delhi' },
  'bangalore':  { lng: 77.5946, lat: 12.9716, state: 'Karnataka' },
  'bengaluru':  { lng: 77.5946, lat: 12.9716, state: 'Karnataka' },
  'hyderabad':  { lng: 78.4867, lat: 17.3850, state: 'Telangana' },
  'chennai':    { lng: 80.2707, lat: 13.0827, state: 'Tamil Nadu' },
  'kolkata':    { lng: 88.3639, lat: 22.5726, state: 'West Bengal' },
  'pune':       { lng: 73.8567, lat: 18.5204, state: 'Maharashtra' },
  'ahmedabad':  { lng: 72.5714, lat: 23.0225, state: 'Gujarat' },
  'jaipur':     { lng: 75.7873, lat: 26.9124, state: 'Rajasthan' },
  'surat':      { lng: 72.8311, lat: 21.1702, state: 'Gujarat' },
  'lucknow':    { lng: 80.9462, lat: 26.8467, state: 'Uttar Pradesh' },
  'nagpur':     { lng: 79.0882, lat: 21.1458, state: 'Maharashtra' },
  'indore':     { lng: 75.8577, lat: 22.7196, state: 'Madhya Pradesh' },
  'kochi':      { lng: 76.2673, lat: 9.9312,  state: 'Kerala' },
  'visakhapatnam': { lng: 83.2185, lat: 17.6868, state: 'Andhra Pradesh' },
};

const getCity = (name) => CITIES[name.toLowerCase().trim()] || null;

export default function PostTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    originCity: '', destinationCity: '', availableDate: '',
    truckType: 'Medium Truck', capacity: '', pricePerKm: '', notes: ''
  });
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const origin = getCity(form.originCity);
    const dest = getCity(form.destinationCity);
    if (!origin) return toast.error(`"${form.originCity}" not found. Try: Mumbai, Delhi, Hyderabad, Bangalore...`);
    if (!dest) return toast.error(`"${form.destinationCity}" not found. Try: Mumbai, Delhi, Hyderabad, Bangalore...`);

    setLoading(true);
    try {
      await tripsAPI.create({
        origin: { address: `${form.originCity}, ${origin.state}`, city: form.originCity, state: origin.state, location: { type: 'Point', coordinates: [origin.lng, origin.lat] } },
        destination: { address: `${form.destinationCity}, ${dest.state}`, city: form.destinationCity, state: dest.state, location: { type: 'Point', coordinates: [dest.lng, dest.lat] } },
        availableDate: form.availableDate,
        truckType: form.truckType,
        capacity: parseFloat(form.capacity),
        pricePerKm: parseFloat(form.pricePerKm),
        notes: form.notes,
      });
      toast.success('Trip posted successfully!');
      navigate('/driver/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post trip');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1 className="page-title">Post a Trip 🚛</h1>
        <p className="page-subtitle">List your truck for available routes</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-sec)' }}>📍 Route Details</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Supported cities: Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad, Jaipur, Surat, Lucknow, Nagpur, Indore, Kochi, Visakhapatnam
          </p>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">From (City) *</label>
              <input className="form-input" value={form.originCity} onChange={f('originCity')} placeholder="e.g. Hyderabad" required />
            </div>
            <div className="form-group">
              <label className="form-label">To (City) *</label>
              <input className="form-input" value={form.destinationCity} onChange={f('destinationCity')} placeholder="e.g. Mumbai" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Available Date *</label>
            <input className="form-input" type="date" value={form.availableDate} onChange={f('availableDate')} min={new Date().toISOString().split('T')[0]} required />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-sec)' }}>🚛 Truck Details</h3>
          <div className="form-group">
            <label className="form-label">Truck Type *</label>
            <select className="form-select" value={form.truckType} onChange={f('truckType')}>
              {['Mini Truck', 'Medium Truck', 'Heavy Truck', 'Trailer', 'Container'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Capacity (Tons) *</label>
              <input className="form-input" type="number" value={form.capacity} onChange={f('capacity')} placeholder="e.g. 5" min="0.5" step="0.5" required />
            </div>
            <div className="form-group">
              <label className="form-label">Price per km (₹) *</label>
              <input className="form-input" type="number" value={form.pricePerKm} onChange={f('pricePerKm')} placeholder="e.g. 25" min="1" required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <textarea className="form-textarea" value={form.notes} onChange={f('notes')} placeholder="Special conditions, preferred goods, etc." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Posting...' : '🚀 Post Trip'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
