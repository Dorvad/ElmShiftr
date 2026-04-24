import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import RequestPage from './pages/RequestPage'
import SchedulePage from './pages/SchedulePage'
import CancelPage from './pages/CancelPage'
import BookingsPage from './pages/BookingsPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/request" element={<Layout><RequestPage /></Layout>} />
        <Route path="/schedule" element={<Layout><SchedulePage /></Layout>} />
        <Route path="/cancel" element={<Layout><CancelPage /></Layout>} />
        <Route path="/bookings" element={<Layout><BookingsPage /></Layout>} />
        <Route path="/admin/login" element={<Layout><AdminLoginPage /></Layout>} />
        <Route path="/admin" element={
          <Layout>
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          </Layout>
        } />
      </Routes>
    </HashRouter>
  )
}
