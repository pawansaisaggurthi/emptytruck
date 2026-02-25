import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'customer' });
  const [loading, setLoading] = useState(false);
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    const res = await register(form); setLoading(false);
    if (res.success) navigate(`/${res.user.role}/dashboard`);
  };
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚛</div>
          <h1 style={{ fontFamily: 'Syne', fontSize: 28, fontWeight: 800, color: 'white' }}>Join EmptyTruck</h1>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={f('name')} required /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={f('email')} required /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={f('phone')} placeholder="+91XXXXXXXXXX" required /></div>
            <div className="form-group" style={{ margin: 0 }}><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={f('password')} required /></div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">I am a</label>
              <select className="form-select" value={form.role} onChange={f('role')}>
                <option value="customer">Customer (I need to ship)</option>
                <option value="driver">Driver (I have a truck)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>{loading ? 'Creating account...' : 'Create Account'}</button>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Already have an account? <Link to="/login" style={{ color: 'var(--orange)' }}>Login</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}
