import React from 'react';
import { useNavigate } from 'react-router-dom';
export default function DriverDetail() {
  const navigate = useNavigate();
  return (
    <div><div className="page-header"><h1 className="page-title">Driver Profile</h1></div>
    <div className="card"><button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button></div></div>
  );
}
