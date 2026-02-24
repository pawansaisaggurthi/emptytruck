import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Mail, Lock, Phone, ArrowRight, Eye, EyeOff, Loader } from 'lucide-react';

export default function LoginPage() {
  const { login, loginWithOTP } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mode, setMode] = useState('email'); // 'email' | 'otp'
  const [otpStep, setOtpStep] = useState('phone'); // 'phone' | 'otp'
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  
  const [form, setForm] = useState({ email: '', password: '', phone: '', otp: '' });

  const from = location.state?.from?.pathname;

  const getRedirect = (role) => {
    if (from && from.startsWith(`/${role}`)) return from;
    return `/${role}/dashboard`;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login({ email: form.email, password: form.password });
    setLoading(false);
    if (result.success) {
      toast.success('Welcome back!');
      navigate(getRedirect(result.user.role));
    } else {
      toast.error(result.error);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.sendOTP(form.phone);
      setOtpStep('otp');
      toast.success('OTP sent to your phone');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await loginWithOTP(form.phone, form.otp);
    setLoading(false);
    if (result.success) {
      toast.success('Logged in!');
      navigate(getRedirect(result.user.role));
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Left: Decorative */}
      <div style={{
        flex: 1, display: 'none',
        background: 'linear-gradient(135deg, #0D0F14 0%, #13161E 100%)',
        borderRight: '1px solid var(--border-color)',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden'
      }} className="auth-left">
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(rgba(249,115,22,0.06) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }} />
        <div style={{ textAlign: 'center', position: 'relative', padding: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🚛</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', marginBottom: '16px' }}>
            EmptyTruck<br />Connect
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '280px' }}>
            India's smartest logistics marketplace connecting empty trucks with shippers.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '36px', maxWidth: '280px' }}>
            {['Save up to 70% on shipping', 'Verified & insured drivers', 'Real-time GPS tracking'].map(feat => (
              <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--brand-orange)' }}>✓</span> {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div style={{
        flex: '0 0 480px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px', background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)'
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '36px' }}>
            <span style={{ fontSize: '1.4rem' }}>🚛</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>EmptyTruck Connect</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', marginBottom: '8px' }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '28px' }}>
            Sign in to your account to continue
          </p>

          {/* Mode Toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)', padding: '4px', marginBottom: '24px',
            border: '1px solid var(--border-color)'
          }}>
            {[['email', '✉️ Email'], ['otp', '📱 Phone OTP']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setMode(val); setOtpStep('phone'); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                  background: mode === val ? 'var(--bg-card)' : 'transparent',
                  color: mode === val ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.82rem',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  boxShadow: mode === val ? '0 1px 4px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Email Login */}
          {mode === 'email' && (
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email" className="form-input" placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    style={{ paddingLeft: '40px' }}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type={showPass ? 'text' : 'password'} className="form-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    style={{ paddingLeft: '40px', paddingRight: '40px' }}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.82rem', color: 'var(--brand-orange)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? <Loader size={16} className="animate-spin" /> : null}
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          {/* OTP Login */}
          {mode === 'otp' && (
            <>
              {otpStep === 'phone' ? (
                <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Phone Number</label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="tel" className="form-input" placeholder="+91 9876543210"
                        value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        style={{ paddingLeft: '40px' }}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? <Loader size={16} className="animate-spin" /> : null}
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    OTP sent to <strong style={{ color: 'var(--text-primary)' }}>{form.phone}</strong>
                  </p>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">6-digit OTP</label>
                    <input
                      type="text" className="form-input" placeholder="••••••"
                      value={form.otp}
                      onChange={e => setForm(p => ({ ...p, otp: e.target.value.slice(0, 6) }))}
                      maxLength={6} style={{ letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center' }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={loading || form.otp.length !== 6}>
                    {loading ? <Loader size={16} className="animate-spin" /> : null}
                    {loading ? 'Verifying...' : 'Verify & Sign In'}
                  </button>
                  <button type="button" onClick={() => setOtpStep('phone')} className="btn btn-secondary btn-full">
                    Change Number
                  </button>
                </form>
              )}
            </>
          )}

          <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--brand-orange)', fontWeight: 700 }}>Sign Up</Link>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) { .auth-left { display: flex !important; } }
        @media (max-width: 560px) { 
          div[style*="flex: 0 0 480px"] { flex: 1 !important; padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  );
}
