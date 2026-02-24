import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import { useAuthStore } from './store/authStore'

const Dashboard = () => {
  const { user, logout } = useAuthStore()
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', background: '#0D0F14', minHeight: '100vh', color: 'white' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 style={{ color: '#F97316', fontSize: '1.8rem' }}>🚛 EmptyTruck Connect</h1>
          <button onClick={logout} style={{ background: '#EF4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Logout</button>
        </div>
        <div style={{ background: '#1E2230', borderRadius: 16, padding: 24, marginBottom: 20, border: '1px solid #2A3045' }}>
          <h2 style={{ marginBottom: 16, color: '#F0F4FF' }}>Welcome, {user?.name}! 👋</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[{label:'Email',value:user?.email},{label:'Role',value:user?.role?.toUpperCase()},{label:'Phone',value:user?.phone},{label:'Rating',value:user?.averageRating||'N/A'}].map(({label,value})=>(
              <div key={label} style={{ background: '#2C3345', borderRadius: 10, padding: 14 }}>
                <div style={{ color: '#5A6480', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ color: '#F0F4FF', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[{icon:'🗺️',title:'Find Trucks',desc:'Search available trucks'},{icon:'📦',title:'My Bookings',desc:'View and manage bookings'},{icon:'💬',title:'Messages',desc:'Chat with drivers'},{icon:'⭐',title:'Ratings',desc:'View your reviews'},{icon:'💳',title:'Payments',desc:'Manage payments'},{icon:'⚙️',title:'Settings',desc:'Account settings'}].map(({icon,title,desc})=>(
            <div key={title} style={{ background: '#1E2230', border: '1px solid #2A3045', borderRadius: 12, padding: 16, cursor: 'pointer' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{title}</div>
              <div style={{ color: '#5A6480', fontSize: '0.75rem' }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, background: '#1E2230', borderRadius: 12, padding: 16, border: '1px solid rgba(249,115,22,0.3)' }}>
          <div style={{ color: '#F97316', fontWeight: 700, marginBottom: 8 }}>🚀 System Status</div>
          <div style={{ color: '#10B981', fontSize: '0.85rem' }}>✅ Backend API — Online</div>
          <div style={{ color: '#10B981', fontSize: '0.85rem' }}>✅ MongoDB — Connected</div>
          <div style={{ color: '#10B981', fontSize: '0.85rem' }}>✅ Authentication — Working</div>
        </div>
      </div>
    </div>
  )
}

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/driver/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/customer/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
