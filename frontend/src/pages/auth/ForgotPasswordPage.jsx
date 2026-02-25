import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await api.post('/auth/forgot-password', { email }); setSent(true); toast.success('Reset link sent!'); }
    catch { toast.error('Failed to send reset link'); }
  };
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}><div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div><h1 style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, color: 'white' }}>Reset Password</h1></div>
        <div className="card">
          {sent ? <div style={{ textAlign: 'center', color: 'var(--green)' }}>✅ Check your email for the reset link</div> :
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">Email Address</label><input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Send Reset Link</button>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}><Link to="/login" style={{ color: 'var(--orange)' }}>← Back to Login</Link></p>
            </form>}
        </div>
      </div>
    </div>
  );
}
