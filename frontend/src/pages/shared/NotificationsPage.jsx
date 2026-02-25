import React, { useState, useEffect } from 'react';
import { notificationsAPI } from '../../services/api';
export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    notificationsAPI.getAll().then(r => setNotifs(r.data.notifications || [])).catch(console.log).finally(() => setLoading(false));
  }, []);
  const markRead = async (id) => {
    await notificationsAPI.markRead(id).catch(() => {});
    setNotifs(p => p.map(n => n._id === id ? { ...n, isRead: true } : n));
  };
  return (
    <div>
      <div className="page-header"><h1 className="page-title">Notifications 🔔</h1></div>
      {loading ? <div className="loading"><div className="spinner" /></div> :
        notifs.length === 0 ? <div className="empty-state"><div className="empty-state-icon">🔔</div><div className="empty-state-title">No notifications</div></div> :
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {notifs.map(n => (
            <div key={n._id} onClick={() => markRead(n._id)} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.isRead ? 'transparent' : 'var(--orange-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: n.isRead ? 400 : 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{n.message}</div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 16 }}>{new Date(n.createdAt).toLocaleDateString('en-IN')}</div>
            </div>
          ))}
        </div>}
    </div>
  );
}
