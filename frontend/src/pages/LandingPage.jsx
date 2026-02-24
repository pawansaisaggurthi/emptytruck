import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowRight, Truck, Package, Shield, Star, ChevronRight, Check, MapPin, DollarSign, Clock, Zap } from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>
      
      {/* ===== NAVBAR ===== */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(13, 15, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.6rem' }}>🚛</span>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>EmptyTruck</span>
            <span style={{ color: 'var(--brand-orange)', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}> Connect</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/login" className="btn btn-secondary btn-sm">Log In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '120px 32px 80px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background elements */}
        <div style={{
          position: 'absolute', top: '15%', right: '5%',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '-5%',
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(251,191,36,0.05) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />
        
        {/* Grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(rgba(249,115,22,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(249,115,22,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative' }}>
          <div style={{ maxWidth: 700 }}>
            {/* Eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 16px',
              marginBottom: '28px',
              animation: 'fadeIn 0.5s ease forwards'
            }}>
              <Zap size={12} style={{ color: 'var(--brand-orange)' }} />
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--brand-orange)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                India's Logistics Marketplace
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 'clamp(2.8rem, 6vw, 5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              marginBottom: '24px',
              animation: 'fadeIn 0.5s 0.1s ease both'
            }}>
              Empty Trucks.<br />
              <span style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Real Savings.
              </span>
            </h1>
            
            <p style={{
              fontSize: '1.15rem', lineHeight: 1.7, color: 'var(--text-secondary)',
              marginBottom: '36px', maxWidth: 520,
              animation: 'fadeIn 0.5s 0.2s ease both'
            }}>
              Connect with truck drivers returning from deliveries. Ship your goods at 40–70% less 
              than regular rates. Smart matching using real-time GPS and route optimization.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', animation: 'fadeIn 0.5s 0.3s ease both' }}>
              <Link to="/register?role=customer" className="btn btn-primary btn-lg">
                <Package size={18} /> Find Trucks Now
                <ArrowRight size={16} />
              </Link>
              <Link to="/register?role=driver" className="btn btn-secondary btn-lg">
                <Truck size={18} /> I'm a Driver
              </Link>
            </div>

            {/* Trust indicators */}
            <div style={{
              display: 'flex', gap: '28px', marginTop: '44px', flexWrap: 'wrap',
              animation: 'fadeIn 0.5s 0.4s ease both'
            }}>
              {[
                { value: '12,000+', label: 'Trips completed' },
                { value: '3,500+', label: 'Verified drivers' },
                { value: '4.8★', label: 'Avg. rating' }
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section style={{ padding: '100px 32px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' }}>
              How It Works
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '16px' }}>
              Three steps to ship smarter
            </h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
              No complexity. No middlemen. Just direct connections between shippers and drivers.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {[
              {
                step: '01',
                icon: '🔍',
                title: 'Search Routes',
                desc: 'Enter pickup and drop location. Our algorithm finds all truck drivers with matching return routes within your deviation radius.',
                color: '#F97316'
              },
              {
                step: '02',
                icon: '🤝',
                title: 'Book & Confirm',
                desc: 'Send a booking request to the best driver. Review their rating, truck type, and price per km. Chat directly before confirming.',
                color: '#3B82F6'
              },
              {
                step: '03',
                icon: '📦',
                title: 'Ship & Pay',
                desc: 'Track your shipment in real-time. Pay securely online or offline after delivery. Rate your experience to help others.',
                color: '#10B981'
              }
            ].map((item) => (
              <div key={item.step} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: 16, right: 20,
                  fontFamily: 'var(--font-mono)', fontWeight: 700,
                  fontSize: '3rem', opacity: 0.07, color: item.color, lineHeight: 1
                }}>
                  {item.step}
                </div>
                <div style={{ fontSize: '2.2rem', marginBottom: '16px' }}>{item.icon}</div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>{item.title}</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SPLIT ===== */}
      <section style={{ padding: '100px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* For Customers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center', marginBottom: '100px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' }}>
                For Businesses & Shippers
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '20px', fontSize: '2.2rem' }}>
                Ship smarter,<br />pay less
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.7 }}>
                Stop overpaying for logistics. Empty return trucks offer capacity at drastically 
                reduced rates—and you get real GPS tracking, verified drivers, and secure payments.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {[
                  'Up to 70% savings vs standard rates',
                  'GPS-powered smart route matching',
                  'Verified & insured drivers only',
                  'Secure Razorpay/Stripe payments'
                ].map(feat => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} style={{ color: '#3B82F6' }} />
                    </div>
                    {feat}
                  </div>
                ))}
              </div>
              <Link to="/register?role=customer" className="btn btn-primary">
                Start Shipping <ArrowRight size={16} />
              </Link>
            </div>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
              {[
                { icon: <MapPin size={16} />, label: 'Mumbai → Pune', detail: '3 trucks available · from ₹12/km', color: '#3B82F6' },
                { icon: <DollarSign size={16} />, label: 'Save ₹4,200', detail: 'vs standard booking', color: '#10B981' },
                { icon: <Clock size={16} />, label: 'Pickup in 2 hours', detail: 'Available today', color: '#F97316' },
                { icon: <Star size={16} />, label: '4.9 ★ Driver Rating', detail: '128 trips completed', color: '#FBBF24' }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)',
                  padding: '14px 16px', border: '1px solid var(--border-color)'
                }}>
                  <div style={{ color: item.color, background: `${item.color}15`, padding: '8px', borderRadius: '8px', flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For Drivers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, var(--bg-card) 100%)',
              border: '1px solid var(--border-orange)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-orange)' }}>
                ₹18,000
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Average extra monthly income for our drivers on return trips
              </div>
              <div style={{ height: 1, background: 'var(--border-color)' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Avg per trip', value: '₹2,400' },
                  { label: 'Trips per month', value: '7–8' },
                  { label: 'Acceptance rate', value: '94%' },
                  { label: 'Payment time', value: 'Instant' }
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{s.value}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--brand-orange)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px' }}>
                For Truck Drivers
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, marginBottom: '20px', fontSize: '2.2rem' }}>
                Earn more<br />on every return trip
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: 1.7 }}>
                Your truck is going back empty anyway. List your return route and let customers 
                find you. No bidding wars, no cold calls—just guaranteed loads.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {[
                  'Post trips in under 2 minutes',
                  'Real-time booking notifications',
                  'Secure payments guaranteed',
                  'Build your rating & reputation'
                ].map(feat => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} style={{ color: 'var(--brand-orange)' }} />
                    </div>
                    {feat}
                  </div>
                ))}
              </div>
              <Link to="/register?role=driver" className="btn btn-outline">
                Register as Driver <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{
        padding: '100px 32px',
        background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(13,15,20,1) 60%)',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚛</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginBottom: '16px' }}>
            Ready to transform<br />your logistics?
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '36px', fontSize: '1.05rem' }}>
            Join thousands of businesses and drivers already saving time and money.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              Create Free Account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{
        padding: '40px 32px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>🚛</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            EmptyTruck Connect © 2025
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Support</span>
        </div>
      </footer>
    </div>
  );
}
