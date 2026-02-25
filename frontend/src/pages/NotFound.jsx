import React from 'react';
import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 64 }}>🚛</div>
      <h1 style={{ fontFamily: 'Syne', color: 'white', fontSize: 32 }}>Page Not Found</h1>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}
