import { HashRouter, Route, Routes } from 'react-router-dom'
import AdminDashboard from './components/AdminDashboard'
import Landing from './components/Landing'

export default function App() {
  return <HashRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/apply/:roleId" element={<Landing />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  </HashRouter>
}
