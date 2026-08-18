import { Routes, Route, Navigate } from 'react-router'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Containers from './pages/Containers'
import ContainerDetail from './pages/ContainerDetail'
import Documents from './pages/Documents'
import Calendrier from './pages/Calendrier'
import Calculateur from './pages/Calculateur'
import Maritime from './pages/Maritime'
import Login from './pages/Login'
import { useAuth } from './lib/auth'

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoutes />}>
        <Route index element={<Dashboard />} />
        <Route path="containers" element={<Containers />} />
        <Route path="containers/:id" element={<ContainerDetail />} />
        <Route path="documents" element={<Documents />} />
        <Route path="calendrier" element={<Calendrier />} />
        <Route path="calculateur" element={<Calculateur />} />
        <Route path="maritime" element={<Maritime />} />
      </Route>
    </Routes>
  )
}
