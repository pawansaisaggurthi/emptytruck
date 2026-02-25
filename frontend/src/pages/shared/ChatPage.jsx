import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { user } = useAuthStore();
  const [chats, setChats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef();

  useEffect(() => {
    chatAPI.getChats().then(r => setChats(r.data.chats || [])).catch(console.log).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    chatAPI.getMessages(selected._id).then(r => {
      setMessages(r.data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }).catch(console.log);
    const iv = setInterval(() => {
      chatAPI.getMessages(selected._id).then(r => setMessages(r.data.messages || [])).catch(() => {});
    }, 4000);
    return () => clearInterval(iv);
  }, [selected]);

  const send = async () => {
    if (!text.trim() || !selected) return;
    const msg = text.trim(); setText('');
    try {
      await chatAPI.sendMessage(selected._id, { content: msg });
      const r = await chatAPI.getMessages(selected._id);
      setMessages(r.data.messages || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { toast.error('Failed to send'); setText(msg); }
  };

  const getOther = (chat) => chat.participants?.find(p => p._id !== user?._id) || {};

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 64px)', background: 'var(--bg)', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* Chats list */}
      <div style={{ width: 280, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>💬 Messages</div>
        {loading ? <div className="loading"><div className="spinner" /></div> :
          chats.length === 0 ? <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>No conversations yet</div> :
          chats.map(chat => {
            const other = getOther(chat);
            return (
              <div key={chat._id} onClick={() => setSelected(chat)}
                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selected?._id === chat._id ? 'var(--orange-dim)' : 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--orange-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--orange)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {other.name?.slice(0,1) || 'U'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{other.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {chat.lastMessage?.content || 'No messages yet'}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Messages */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Select a conversation</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, background: 'var(--bg2)' }}>
            {getOther(selected).name}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(msg => {
              const isMe = msg.sender?._id === user?._id || msg.sender === user?._id;
              return (
                <div key={msg._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', background: isMe ? 'var(--orange)' : 'var(--card)', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', color: 'white', fontSize: 14, lineHeight: 1.5 }}>
                    {msg.content}
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
            <input className="form-input" style={{ flex: 1 }} value={text} onChange={e => setText(e.target.value)}
              placeholder="Type a message..." onKeyDown={e => e.key === 'Enter' && send()} />
            <button className="btn btn-primary" onClick={send} disabled={!text.trim()}>Send ↑</button>
          </div>
        </div>
      )}
    </div>
  );
}
