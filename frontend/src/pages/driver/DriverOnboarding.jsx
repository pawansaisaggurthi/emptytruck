import React from 'react';
import { useNavigate } from 'react-router-dom';
export default function DriverOnboarding() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 500 }}>
      <div className="page-header"><h1 className="page-title">Complete Your Profile 🚛</h1></div>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Please complete your driver profile to start posting trips.</p>
        <button className="btn btn-primary" onClick={() => navigate('/driver/dashboard')}>Go to Dashboard</button>
      </div>
    </div>
  );
}
